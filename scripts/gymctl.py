"""GymBro multi-gym control: one Docker container per gym on the VM, behind nginx.

Everything heavy runs on the VM (image build, containers, certificates): this laptop only
sends commands over SSH, so it can be switched off at any time.

    python scripts/gymctl.py deploy                      build the committed code on the VM and update every gym
    python scripts/gymctl.py new fitzone --name "FitZone Gym" [--domain fitzone.local.net.py]
                                                        [--owner-user admin] [--owner-name "Juan Pérez"]
    python scripts/gymctl.py list                        gyms, status and links
    python scripts/gymctl.py suspend fitzone | resume fitzone
    python scripts/gymctl.py cert fitzone                issue the HTTPS certificate (once DNS points to the VM)
    python scripts/gymctl.py owner-password fitzone      set a new random owner password
    python scripts/gymctl.py backup                      download the latest backup of every gym to this laptop
    python scripts/gymctl.py logs fitzone

Layout on the VM (/opt/gymbro-saas):
    gyms.json                registry: slug, name, domain, port, status
    compose.yml              generated from gyms.json (do not edit by hand)
    gyms/<slug>/gym.env      owner account and gym name (chmod 600)
    gyms/<slug>/data/        gym.db (SQLite) + backups/ - the gym's data
    builds/<sha>/            source used to build gymbro:<sha>
    static/suspendido.html   shown by nginx while a gym is stopped

SSH settings come from .env.deploy (git-ignored): GYMBRO_SSH_HOST, GYMBRO_SSH_USER,
GYMBRO_SSH_PASSWORD, optional GYMBRO_CERT_EMAIL and GYMBRO_CREDENTIALS_DIR.
Requires: pip install paramiko
"""
import argparse
import datetime
import io
import json
import os
import re
import secrets
import shlex
import socket
import string
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REMOTE = "/opt/gymbro-saas"
FIRST_PORT = 3601
BASE_DOMAIN = "local.net.py"
CONTAINER_UID = "1000:1000"  # user `node` inside the image
LEGACY = {"slug": "gymbro", "domain": "gymbro.local.net.py", "app": "/opt/gymbro/app", "service": "gymbro"}


def step(msg):
    print(f"\n==> {msg}", flush=True)


def load_deploy_env():
    path = os.path.join(ROOT, ".env.deploy")
    if not os.path.exists(path):
        sys.exit("Falta .env.deploy con GYMBRO_SSH_HOST / GYMBRO_SSH_USER / GYMBRO_SSH_PASSWORD.")
    env = {}
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


ENV = load_deploy_env()
CREDENTIALS_DIR = ENV.get("GYMBRO_CREDENTIALS_DIR") or os.path.join(os.path.expanduser("~"), "Documents", "gymbro-clientes")


class VM:
    def __init__(self):
        import paramiko

        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(
            ENV["GYMBRO_SSH_HOST"],
            username=ENV.get("GYMBRO_SSH_USER", "root"),
            password=ENV["GYMBRO_SSH_PASSWORD"],
            timeout=20,
            look_for_keys=False,
            allow_agent=False,
        )
        self.sftp = self.client.open_sftp()

    def run(self, cmd, check=True, quiet=False, timeout=1800):
        _, out, err = self.client.exec_command(f"bash -c {shlex.quote(cmd)}", timeout=timeout)
        text = out.read().decode("utf-8", errors="replace") + err.read().decode("utf-8", errors="replace")
        code = out.channel.recv_exit_status()
        if not quiet and text.strip():
            sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
            sys.stdout.flush()
        if check and code != 0:
            if quiet:
                sys.stdout.buffer.write(text[-3000:].encode("utf-8", errors="replace"))
            raise SystemExit(f"\nFalló en el servidor (rc={code}).")
        return code, text

    def read(self, path, default=None):
        try:
            with self.sftp.open(path, "r") as f:
                return f.read().decode("utf-8")
        except IOError:
            return default

    def write(self, path, content, mode=0o644):
        with self.sftp.open(path, "w") as f:
            f.write(content.encode("utf-8"))
        self.sftp.chmod(path, mode)

    def put(self, local, remote):
        self.sftp.put(local, remote)

    def close(self):
        self.client.close()


# ---------------------------------------------------------------------------
# Registry and generated files
# ---------------------------------------------------------------------------

def load_registry(vm):
    raw = vm.read(f"{REMOTE}/gyms.json")
    return json.loads(raw) if raw else {"gyms": []}


def save_registry(vm, registry):
    vm.write(f"{REMOTE}/gyms.json", json.dumps(registry, indent=2, ensure_ascii=False) + "\n", 0o600)
    write_compose(vm, registry)


def find_gym(registry, slug):
    for gym in registry["gyms"]:
        if gym["slug"] == slug:
            return gym
    sys.exit(f"No existe el gimnasio '{slug}'. Usa: python scripts/gymctl.py list")


def write_compose(vm, registry):
    # JSON is valid YAML: generating it avoids any quoting problem with gym names.
    services = {}
    for gym in registry["gyms"]:
        service = {
            "image": "gymbro:latest",
            "container_name": f"gymbro-{gym['slug']}",
            "restart": "unless-stopped",
            "env_file": [f"gyms/{gym['slug']}/gym.env"],
            "environment": {
                "NODE_ENV": "production",
                "HOST": "0.0.0.0",
                "PORT": "3000",
                "DATA_DIR": "/data",
                "TRUST_PROXY": "loopback, uniquelocal",
            },
            "ports": [f"127.0.0.1:{gym['port']}:3000"],
            "volumes": [f"./gyms/{gym['slug']}/data:/data"],
            "healthcheck": {
                "test": ["CMD", "node", "-e",
                         "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],
                "interval": "30s", "timeout": "5s", "retries": 3, "start_period": "20s",
            },
            "mem_limit": "384m",
        }
        if gym.get("status") == "suspended":
            service["profiles"] = ["suspended"]  # `compose up -d` never starts a suspended gym
        services[f"gym-{gym['slug']}"] = service
    compose = {"name": "gymbro-saas", "services": services}
    header = "# Generado por scripts/gymctl.py desde gyms.json: no editar a mano.\n"
    vm.write(f"{REMOTE}/compose.yml", header + json.dumps(compose, indent=2, ensure_ascii=False) + "\n")


def env_value(value):
    clean = str(value).replace("\n", " ").replace("\\", "").replace('"', "")
    return f'"{clean}"'


def write_gym_env(vm, gym, owner_user, owner_password, owner_name, extra=None):
    lines = [
        f"# Gimnasio {gym['name']} ({gym['slug']})",
        f"GYM_NAME={env_value(gym['name'])}",
        f"OWNER_USERNAME={env_value(owner_user)}",
        f"OWNER_NAME={env_value(owner_name)}",
        f"OWNER_PASSWORD={env_value(owner_password)}",
    ]
    for key, value in (extra or {}).items():
        lines.append(f"{key}={env_value(value)}")
    vm.write(f"{REMOTE}/gyms/{gym['slug']}/gym.env", "\n".join(lines) + "\n", 0o600)


def new_password():
    alphabet = "".join(c for c in string.ascii_letters + string.digits if c not in "O0Il1")
    return "-".join("".join(secrets.choice(alphabet) for _ in range(5)) for _ in range(3))


def save_credentials(gym, owner_user, owner_password):
    os.makedirs(CREDENTIALS_DIR, exist_ok=True)
    path = os.path.join(CREDENTIALS_DIR, f"{gym['slug']}.txt")
    base = f"https://{gym['domain']}"
    with open(path, "w", encoding="utf-8") as f:
        f.write(
            f"{gym['name']} - acceso a GymBro (actualizado {datetime.date.today().isoformat()})\n\n"
            f"Dueño:    {base}/#/dueno\n"
            f"  Usuario:    {owner_user}\n"
            f"  Contraseña: {owner_password}\n\n"
            f"Profesores: {base}/#/coach   (cuentas creadas por el dueño en Enlaces > Crear Usuario)\n"
            f"Alumnos:    {base}/#/alumno  (se registran con el QR de Enlaces)\n"
        )
    return path


def compose(vm, args, **kw):
    return vm.run(f"cd {REMOTE} && docker compose {args}", **kw)


def wait_healthy(vm, slug, seconds=120):
    deadline = time.time() + seconds
    status = "?"
    while time.time() < deadline:
        _, status = vm.run(
            f"docker inspect -f '{{{{.State.Health.Status}}}}' gymbro-{slug} 2>/dev/null || echo missing",
            check=False, quiet=True,
        )
        status = status.strip()
        if status == "healthy":
            return True
        time.sleep(3)
    print(f"  gymbro-{slug}: {status}")
    return False


def resolves_to_vm(domain):
    try:
        return socket.gethostbyname(domain) == socket.gethostbyname(ENV["GYMBRO_SSH_HOST"])
    except OSError:
        return False


def write_nginx(vm, gym):
    template = open(os.path.join(ROOT, "deploy", "nginx-gym.conf"), encoding="utf-8").read()
    conf = template.format(name=gym["name"], slug=gym["slug"], domain=gym["domain"], port=gym["port"])
    path = f"/etc/nginx/sites-available/{gym['domain']}"
    vm.write(path, conf)
    vm.run(f"ln -sf {path} /etc/nginx/sites-enabled/{gym['domain']} && nginx -t -q && systemctl reload nginx", quiet=True)


def issue_cert(vm, gym):
    if not resolves_to_vm(gym["domain"]):
        print(f"  El DNS de {gym['domain']} todavía no apunta al servidor ({ENV['GYMBRO_SSH_HOST']}).")
        print(f"  Agregá el registro y después ejecutá: python scripts/gymctl.py cert {gym['slug']}")
        return False
    email = ENV.get("GYMBRO_CERT_EMAIL")
    account = f"-m {shlex.quote(email)}" if email else "--register-unsafely-without-email"
    code, _ = vm.run(
        f"certbot --nginx -d {gym['domain']} --non-interactive --agree-tos {account} --redirect",
        check=False, quiet=True,
    )
    if code != 0:
        print("  certbot falló; revisá el DNS y reintentá con el comando cert.")
        return False
    return True


def ensure_layout(vm):
    vm.run(f"mkdir -p {REMOTE}/gyms {REMOTE}/builds {REMOTE}/static && chmod 700 {REMOTE}/gyms", quiet=True)
    vm.write(f"{REMOTE}/static/suspendido.html", open(os.path.join(ROOT, "deploy", "suspendido.html"), encoding="utf-8").read())


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_deploy(vm, args):
    dirty = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no"], cwd=ROOT, capture_output=True, text=True).stdout
    if dirty.strip():
        print("Aviso: hay cambios sin commit; se despliega solo lo que está commiteado (HEAD).")
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    archive = subprocess.run(["git", "-c", "core.autocrlf=false", "-c", "core.eol=lf", "archive", "--format=tar.gz", "HEAD"], cwd=ROOT, capture_output=True, check=True).stdout

    ensure_layout(vm)
    step(f"Subiendo el código ({sha}) y compilando la imagen en el servidor")
    build_dir = f"{REMOTE}/builds/{sha}"
    with vm.sftp.open(f"{REMOTE}/builds/{sha}.tar.gz", "wb") as f:
        f.write(archive)
    vm.run(f"rm -rf {build_dir} && mkdir -p {build_dir} && tar -xzf {REMOTE}/builds/{sha}.tar.gz -C {build_dir} && rm {REMOTE}/builds/{sha}.tar.gz", quiet=True)
    vm.run(f"docker build --target production -t gymbro:{sha} {build_dir} 2>&1 | tail -3", quiet=False)
    vm.run(f"docker image inspect gymbro:{sha} >/dev/null", quiet=True)

    registry = load_registry(vm)
    write_compose(vm, registry)
    active = [g for g in registry["gyms"] if g.get("status") != "suspended"]

    if active:
        step("Respaldo previo de cada gimnasio")
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        # VACUUM INTO gives a consistent copy while the gym keeps running.
        js = (
            "const fs=require('fs');if(!fs.existsSync('/data/gym.db'))process.exit(0);"
            "fs.mkdirSync('/data/backups',{recursive:true});const q=String.fromCharCode(39);"
            "new (require('node:sqlite').DatabaseSync)('/data/gym.db')"
            ".exec('VACUUM INTO '+q+'/data/backups/pre-deploy-'+process.env.STAMP+'.db'+q)"
        )
        for gym in active:
            vm.run(
                f"docker run --rm -e STAMP={stamp} -e NODE_OPTIONS=--disable-warning=ExperimentalWarning "
                f"-v {REMOTE}/gyms/{gym['slug']}/data:/data --user {CONTAINER_UID} gymbro:{sha} node -e {shlex.quote(js)} "
                f"&& echo '  {gym['slug']}: ok'",
                check=False,
            )

    _, previous = vm.run("docker image inspect -f '{{.Id}}' gymbro:latest 2>/dev/null || true", quiet=True)
    previous = previous.strip()
    step("Actualizando los gimnasios")
    vm.run(f"docker tag gymbro:{sha} gymbro:latest", quiet=True)
    compose(vm, "up -d --remove-orphans 2>&1 | tail -20", quiet=False)
    failed = [g["slug"] for g in active if not wait_healthy(vm, g["slug"])]
    if failed:
        step(f"Fallaron {', '.join(failed)}: vuelvo a la versión anterior")
        if previous:
            vm.run(f"docker tag {previous} gymbro:latest && cd {REMOTE} && docker compose up -d 2>&1 | tail -5", check=False)
        sys.exit("Despliegue revertido. Revisá: python scripts/gymctl.py logs <gimnasio>")

    vm.run(f"cd {REMOTE}/builds && ls -1t | tail -n +4 | xargs -r rm -rf", quiet=True)
    vm.run(
        "docker images gymbro --format '{{.Tag}} {{.ID}}' | grep -v -E '^(latest|<none>) ' | tail -n +4 "
        "| awk '{print \"gymbro:\"$1}' | xargs -r docker rmi >/dev/null 2>&1; docker image prune -f >/dev/null",
        check=False, quiet=True,
    )
    step(f"Listo: {len(active)} gimnasio(s) en la versión {sha}")
    for gym in active:
        print(f"  https://{gym['domain']}")


def cmd_new(vm, args):
    slug = args.slug.lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,30}", slug):
        sys.exit("El identificador debe ser de 2 a 31 letras minúsculas, números o guiones (ej: fitzone).")
    ensure_layout(vm)
    registry = load_registry(vm)
    if any(g["slug"] == slug for g in registry["gyms"]):
        sys.exit(f"Ya existe el gimnasio '{slug}'.")
    domain = (args.domain or f"{slug}.{BASE_DOMAIN}").lower()
    if any(g["domain"] == domain for g in registry["gyms"]):
        sys.exit(f"El dominio {domain} ya está en uso.")
    code, _ = vm.run(f"test -e /etc/nginx/sites-enabled/{domain}", check=False, quiet=True)
    if code == 0:
        sys.exit(f"nginx ya tiene un sitio para {domain} (otra app del servidor).")
    code, _ = vm.run("docker image inspect gymbro:latest >/dev/null 2>&1", check=False, quiet=True)
    if code != 0:
        sys.exit("Todavía no hay imagen en el servidor: ejecutá primero  python scripts/gymctl.py deploy")

    used = {g["port"] for g in registry["gyms"]}
    port = next(p for p in range(FIRST_PORT, FIRST_PORT + 500) if p not in used)
    gym = {"slug": slug, "name": args.name.strip(), "domain": domain, "port": port,
           "status": "active", "created": datetime.date.today().isoformat()}
    owner_user = (args.owner_user or "admin").lower()
    owner_password = new_password()

    step(f"Creando {gym['name']} en https://{domain}")
    vm.run(f"mkdir -p {REMOTE}/gyms/{slug}/data && chown -R {CONTAINER_UID} {REMOTE}/gyms/{slug}/data && chmod 700 {REMOTE}/gyms/{slug}/data", quiet=True)
    write_gym_env(vm, gym, owner_user, owner_password, args.owner_name or "Administrador")
    registry["gyms"].append(gym)
    save_registry(vm, registry)
    compose(vm, f"up -d gym-{slug} 2>&1 | tail -3", quiet=True)
    if not wait_healthy(vm, slug):
        sys.exit(f"El contenedor no arrancó. Revisá: python scripts/gymctl.py logs {slug}")

    step("Configurando nginx y HTTPS")
    write_nginx(vm, gym)
    https = issue_cert(vm, gym)
    creds = save_credentials(gym, owner_user, owner_password)

    step("Gimnasio listo")
    scheme = "https" if https else "http"
    print(f"  Dueño:      {scheme}://{domain}/#/dueno   usuario: {owner_user}   contraseña: {owner_password}")
    print(f"  Profesores: {scheme}://{domain}/#/coach")
    print(f"  Alumnos:    {scheme}://{domain}/#/alumno")
    print(f"  Credenciales guardadas en {creds}")


def cmd_list(vm, args):
    registry = load_registry(vm)
    if not registry["gyms"]:
        print("No hay gimnasios todavía.")
        return
    _, states = vm.run("docker ps -a --filter name=gymbro- --format '{{.Names}} {{.Status}}'", quiet=True)
    status_by_name = {line.split(" ", 1)[0]: line.split(" ", 1)[1] for line in states.splitlines() if " " in line}
    for gym in registry["gyms"]:
        state = status_by_name.get(f"gymbro-{gym['slug']}", "sin contenedor")
        flag = "SUSPENDIDO" if gym.get("status") == "suspended" else "activo"
        print(f"{gym['slug']:<16} {flag:<11} https://{gym['domain']:<34} {gym['name']}  [{state}]")


def cmd_suspend(vm, args):
    registry = load_registry(vm)
    gym = find_gym(registry, args.slug)
    gym["status"] = "suspended"
    save_registry(vm, registry)
    vm.run(f"docker stop gymbro-{gym['slug']} >/dev/null 2>&1 || true", quiet=True)
    print(f"{gym['name']} suspendido: https://{gym['domain']} muestra 'Servicio no disponible'. Los datos se conservan.")


def cmd_resume(vm, args):
    registry = load_registry(vm)
    gym = find_gym(registry, args.slug)
    gym["status"] = "active"
    save_registry(vm, registry)
    compose(vm, f"up -d gym-{gym['slug']} 2>&1 | tail -2", quiet=True)
    ok = wait_healthy(vm, gym["slug"])
    print(f"{gym['name']} {'reactivado' if ok else 'NO arrancó (revisá los logs)'}: https://{gym['domain']}")


def cmd_cert(vm, args):
    gym = find_gym(load_registry(vm), args.slug)
    if issue_cert(vm, gym):
        print(f"HTTPS activo: https://{gym['domain']}")


def cmd_owner_password(vm, args):
    registry = load_registry(vm)
    gym = find_gym(registry, args.slug)
    env_text = vm.read(f"{REMOTE}/gyms/{gym['slug']}/gym.env", "")
    current = dict(
        (k, v.strip().strip('"')) for k, v in (line.split("=", 1) for line in env_text.splitlines() if "=" in line and not line.startswith("#"))
    )
    password = new_password()
    extra = {k: v for k, v in current.items() if k not in ("GYM_NAME", "OWNER_USERNAME", "OWNER_NAME", "OWNER_PASSWORD")}
    write_gym_env(vm, gym, current.get("OWNER_USERNAME", "admin"), password, current.get("OWNER_NAME", "Administrador"), extra)
    compose(vm, f"up -d --force-recreate gym-{gym['slug']} 2>&1 | tail -2", quiet=True)
    wait_healthy(vm, gym["slug"])
    creds = save_credentials(gym, current.get("OWNER_USERNAME", "admin"), password)
    print(f"Nueva contraseña del dueño de {gym['name']}: {password}  (guardada en {creds})")


def cmd_backup(vm, args):
    registry = load_registry(vm)
    target = os.path.join(CREDENTIALS_DIR, "respaldos", datetime.date.today().isoformat())
    os.makedirs(target, exist_ok=True)
    for gym in registry["gyms"]:
        _, latest = vm.run(f"ls -1t {REMOTE}/gyms/{gym['slug']}/data/backups/*.db 2>/dev/null | head -1", check=False, quiet=True)
        latest = latest.strip()
        if not latest:
            print(f"  {gym['slug']}: sin respaldos todavía")
            continue
        local = os.path.join(target, f"{gym['slug']}-{os.path.basename(latest)}")
        vm.sftp.get(latest, local)
        print(f"  {gym['slug']}: {local}")


def cmd_logs(vm, args):
    vm.run(f"docker logs --tail 60 gymbro-{args.slug} 2>&1", check=False)


def cmd_migrate_legacy(vm, args):
    """One-time: move gymbro.local.net.py from the systemd service to a container."""
    registry = load_registry(vm)
    if any(g["slug"] == LEGACY["slug"] for g in registry["gyms"]):
        sys.exit("gymbro ya está migrado.")
    code, _ = vm.run("docker image inspect gymbro:latest >/dev/null 2>&1", check=False, quiet=True)
    if code != 0:
        sys.exit("Ejecutá primero: python scripts/gymctl.py deploy")
    app = LEGACY["app"]
    legacy_env = vm.read(f"{app}/.env", "")
    env = dict((k.strip(), v.strip().strip('"')) for k, v in (l.split("=", 1) for l in legacy_env.splitlines() if "=" in l and not l.strip().startswith("#")))
    if not env.get("OWNER_PASSWORD"):
        sys.exit(f"No encontré OWNER_PASSWORD en {app}/.env")

    used = {g["port"] for g in registry["gyms"]}
    port = next(p for p in range(FIRST_PORT, FIRST_PORT + 500) if p not in used)
    _, gym_name = vm.run(
        f"python3 -c \"import json;print(json.load(open('{app}/gym_database.json')).get('settings',{{}}).get('gymName','GymBro'))\"",
        quiet=True,
    )
    gym = {"slug": LEGACY["slug"], "name": gym_name.strip() or "GymBro", "domain": LEGACY["domain"], "port": port,
           "status": "active", "created": datetime.date.today().isoformat(), "migratedFrom": app}
    data = f"{REMOTE}/gyms/{gym['slug']}/data"
    site = f"/etc/nginx/sites-available/{gym['domain']}"
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

    ensure_layout(vm)
    step("Deteniendo el servicio anterior y copiando sus datos")
    vm.run(f"""set -e
mkdir -p {data}
cp -p {site} /opt/gymbro/backups/nginx-{gym['domain']}.{stamp}
systemctl stop {LEGACY['service']}
cp -p {app}/gym_database.json {data}/
[ -f {app}/gym_sessions.json ] && cp -p {app}/gym_sessions.json {data}/ || true
cp -p {app}/gym_database.json /opt/gymbro/backups/gym_database.pre-docker-{stamp}.json
chown -R {CONTAINER_UID} {data} && chmod 700 {data}
""", quiet=True)
    extra = {"GEMINI_API_KEY": env["GEMINI_API_KEY"]} if env.get("GEMINI_API_KEY") else None
    write_gym_env(vm, gym, env.get("OWNER_USERNAME", "admin"), env["OWNER_PASSWORD"], env.get("OWNER_NAME", "Administrador"), extra)
    registry["gyms"].append(gym)
    save_registry(vm, registry)

    def rollback(reason):
        step(f"{reason}: vuelvo al servicio anterior")
        vm.run(f"cp -p /opt/gymbro/backups/nginx-{gym['domain']}.{stamp} {site}; nginx -t -q && systemctl reload nginx; "
               f"systemctl start {LEGACY['service']}; cd {REMOTE} && docker compose rm -sf gym-{gym['slug']}", check=False)
        registry["gyms"] = [g for g in registry["gyms"] if g["slug"] != gym["slug"]]
        save_registry(vm, registry)
        sys.exit("Migración revertida; el sitio sigue con el servicio anterior.")

    step("Levantando el contenedor (importa la base a SQLite)")
    compose(vm, f"up -d gym-{gym['slug']} 2>&1 | tail -2", quiet=True)
    if not wait_healthy(vm, gym["slug"]):
        vm.run(f"docker logs --tail 30 gymbro-{gym['slug']} 2>&1", check=False)
        rollback("El contenedor no arrancó")

    step("Apuntando nginx al contenedor")
    vm.run(f"""set -e
python3 - <<'PY'
p = "{site}"
s = open(p).read()
s = s.replace("proxy_pass http://127.0.0.1:3500;", "proxy_pass http://127.0.0.1:{port};")
if "suspendido.html" not in s:
    s = s.replace(
        "client_max_body_size 16M;",
        "client_max_body_size 16M;\\n\\n    error_page 502 503 504 /suspendido.html;\\n"
        "    location = /suspendido.html {{ root {REMOTE}/static; internal; }}",
        1,
    )
open(p, "w").write(s)
PY
nginx -t -q && systemctl reload nginx
""", quiet=True)
    code, out = vm.run(f"curl -s -o /dev/null -w '%{{http_code}}' https://{gym['domain']}/api/health", check=False, quiet=True)
    if out.strip() != "200":
        rollback(f"El sitio respondió {out.strip()}")
    vm.run(f"systemctl disable {LEGACY['service']} >/dev/null 2>&1", check=False, quiet=True)
    step(f"Migrado: https://{gym['domain']} ahora corre en Docker (gymbro-{gym['slug']}, puerto {port}).")
    print(f"  El servicio systemd '{LEGACY['service']}' quedó detenido y deshabilitado; {app} se conserva como respaldo.")


def main():
    parser = argparse.ArgumentParser(description="GymBro: gimnasios en Docker sobre la VM")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("deploy", help="compila el código commiteado en la VM y actualiza todos los gimnasios")
    new = sub.add_parser("new", help="da de alta un gimnasio")
    new.add_argument("slug")
    new.add_argument("--name", required=True)
    new.add_argument("--domain")
    new.add_argument("--owner-user")
    new.add_argument("--owner-name")
    sub.add_parser("list", help="lista los gimnasios")
    for name in ("suspend", "resume", "cert", "owner-password", "logs"):
        sub.add_parser(name).add_argument("slug")
    sub.add_parser("backup", help="descarga el último respaldo de cada gimnasio")
    sub.add_parser("migrate-legacy", help="(una vez) pasa gymbro.local.net.py del servicio systemd a Docker")
    args = parser.parse_args()

    vm = VM()
    try:
        {
            "deploy": cmd_deploy, "new": cmd_new, "list": cmd_list, "suspend": cmd_suspend,
            "resume": cmd_resume, "cert": cmd_cert, "owner-password": cmd_owner_password,
            "backup": cmd_backup, "logs": cmd_logs, "migrate-legacy": cmd_migrate_legacy,
        }[args.command](vm, args)
    finally:
        vm.close()


if __name__ == "__main__":
    main()
