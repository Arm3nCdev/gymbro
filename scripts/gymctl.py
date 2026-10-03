"""GymBro platform control: ONE Docker container serves every gym (multi-tenant) on the VM.

Gyms are created, suspended and resumed from the web panel https://gymbro.local.net.py/plataforma.
This script only ships new versions and handles operations; everything heavy (image build,
container) runs on the VM, so this laptop can be switched off at any time.

    python scripts/gymctl.py deploy             build the committed code (HEAD) on the VM and update the platform
    python scripts/gymctl.py status             container health and gyms
    python scripts/gymctl.py logs
    python scripts/gymctl.py backup             download the latest backup of every gym to this laptop
    python scripts/gymctl.py reset-admin        forgot the panel password: remove the administrator and
                                                print a new one-time setup code to create it again
    python scripts/gymctl.py migrate-platform   (once) move from one-container-per-gym to the platform

Layout on the VM (/opt/gymbro-saas):
    compose.yml             one service: gymbro-platform on 127.0.0.1:3601 (nginx: gymbro.local.net.py)
    platform.env            PLATFORM_SETUP_CODE and DEFAULT_TENANT (chmod 600)
    data/platform.db        registry of gyms, platform administrator and its sessions
    data/tenants/<slug>/    gym.db (SQLite) + backups/ of each gym
    builds/<sha>/           source used to build gymbro:<sha>

SSH settings come from .env.deploy (git-ignored): GYMBRO_SSH_HOST, GYMBRO_SSH_USER,
GYMBRO_SSH_PASSWORD, optional GYMBRO_CREDENTIALS_DIR. Requires: pip install paramiko
"""
import argparse
import datetime
import json
import os
import secrets
import shlex
import string
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REMOTE = "/opt/gymbro-saas"
DATA = f"{REMOTE}/data"
PORT = 3601
DOMAIN = "gymbro.local.net.py"
CONTAINER = "gymbro-platform"
CONTAINER_UID = "1000:1000"  # user `node` inside the image


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

    def close(self):
        self.client.close()


def new_password():
    alphabet = "".join(c for c in string.ascii_letters + string.digits if c not in "O0Il1")
    return "-".join("".join(secrets.choice(alphabet) for _ in range(5)) for _ in range(3))


def env_value(value):
    return '"' + str(value).replace("\n", " ").replace("\\", "").replace('"', "") + '"'


def parse_env(text):
    result = {}
    for line in (text or "").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            result[key.strip()] = value.strip().strip('"')
    return result


def write_platform_env(vm, values):
    lines = ["# GymBro platform (scripts/gymctl.py). OWNER_* only applies to DEFAULT_TENANT."]
    lines += [f"{k}={env_value(v)}" for k, v in values.items() if v not in (None, "")]
    vm.write(f"{REMOTE}/platform.env", "\n".join(lines) + "\n", 0o600)


def write_compose(vm):
    # JSON is valid YAML.
    compose = {
        "name": "gymbro-saas",
        "services": {
            "gymbro": {
                "image": "gymbro:latest",
                "container_name": CONTAINER,
                "restart": "unless-stopped",
                "env_file": ["platform.env"],
                "environment": {
                    "NODE_ENV": "production",
                    "HOST": "0.0.0.0",
                    "PORT": "3000",
                    "DATA_DIR": "/data",
                    "TRUST_PROXY": "loopback, uniquelocal",
                },
                "ports": [f"127.0.0.1:{PORT}:3000"],
                "volumes": ["./data:/data"],
                "healthcheck": {
                    "test": ["CMD", "node", "-e",
                             "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],
                    "interval": "30s", "timeout": "5s", "retries": 3, "start_period": "30s",
                },
                "mem_limit": "1g",
            }
        },
    }
    header = "# Generado por scripts/gymctl.py: no editar a mano.\n"
    vm.write(f"{REMOTE}/compose.yml", header + json.dumps(compose, indent=2) + "\n")


def wait_healthy(vm, container=CONTAINER, seconds=150):
    deadline = time.time() + seconds
    status = "?"
    while time.time() < deadline:
        _, status = vm.run(f"docker inspect -f '{{{{.State.Health.Status}}}}' {container} 2>/dev/null || echo missing", check=False, quiet=True)
        status = status.strip()
        if status == "healthy":
            return True
        time.sleep(3)
    print(f"  {container}: {status}")
    return False


def build_image(vm):
    dirty = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no"], cwd=ROOT, capture_output=True, text=True).stdout
    if dirty.strip():
        print("Aviso: hay cambios sin commit; se despliega solo lo que está commiteado (HEAD).")
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    archive = subprocess.run(
        ["git", "-c", "core.autocrlf=false", "-c", "core.eol=lf", "archive", "--format=tar.gz", "HEAD"],
        cwd=ROOT, capture_output=True, check=True,
    ).stdout
    step(f"Subiendo el código ({sha}) y compilando la imagen en el servidor")
    vm.run(f"mkdir -p {REMOTE}/builds", quiet=True)
    build_dir = f"{REMOTE}/builds/{sha}"
    with vm.sftp.open(f"{build_dir}.tar.gz", "wb") as f:
        f.write(archive)
    vm.run(f"rm -rf {build_dir} && mkdir -p {build_dir} && tar -xzf {build_dir}.tar.gz -C {build_dir} && rm {build_dir}.tar.gz", quiet=True)
    vm.run(f"docker build --target production -t gymbro:{sha} {build_dir} 2>&1 | tail -2")
    vm.run(f"docker image inspect gymbro:{sha} >/dev/null", quiet=True)
    return sha


def backup_all(vm, sha, label):
    # VACUUM INTO gives a consistent copy of every gym while the platform keeps running.
    js = (
        "const fs=require('fs'),p=require('path');const root='/data/tenants';if(!fs.existsSync(root))process.exit(0);"
        "const q=String.fromCharCode(39);for(const s of fs.readdirSync(root)){const db=p.join(root,s,'gym.db');"
        "if(!fs.existsSync(db))continue;const dir=p.join(root,s,'backups');fs.mkdirSync(dir,{recursive:true});"
        "new (require('node:sqlite').DatabaseSync)(db).exec('VACUUM INTO '+q+p.join(dir,process.env.LABEL+'.db')+q);console.log('  '+s+': ok')}"
    )
    vm.run(
        f"docker run --rm -e LABEL={label} -e NODE_OPTIONS=--disable-warning=ExperimentalWarning "
        f"-v {DATA}:/data --user {CONTAINER_UID} gymbro:{sha} node -e {shlex.quote(js)}",
        check=False,
    )


def cmd_deploy(vm, args):
    if not vm.read(f"{REMOTE}/platform.env"):
        sys.exit("La plataforma no está instalada en el servidor: ejecutá primero  python scripts/gymctl.py migrate-platform")
    sha = build_image(vm)
    step("Respaldo previo de cada gimnasio")
    backup_all(vm, sha, "pre-deploy-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
    _, previous = vm.run("docker image inspect -f '{{.Id}}' gymbro:latest 2>/dev/null || true", quiet=True)
    previous = previous.strip()
    step("Actualizando la plataforma")
    write_compose(vm)
    vm.run(f"docker tag gymbro:{sha} gymbro:latest && cd {REMOTE} && docker compose up -d --remove-orphans 2>&1 | tail -3")
    if not wait_healthy(vm):
        step("La versión nueva no arrancó: vuelvo a la anterior")
        vm.run(f"docker logs --tail 30 {CONTAINER} 2>&1", check=False)
        if previous:
            vm.run(f"docker tag {previous} gymbro:latest && cd {REMOTE} && docker compose up -d 2>&1 | tail -2", check=False)
        sys.exit("Despliegue revertido.")
    vm.run(f"cd {REMOTE}/builds && ls -1t | tail -n +4 | xargs -r rm -rf", quiet=True, check=False)
    vm.run(
        "docker images gymbro --format '{{.Tag}}' | grep -v -E '^(latest|<none>)$' | tail -n +4 "
        "| sed 's/^/gymbro:/' | xargs -r docker rmi >/dev/null 2>&1; docker image prune -f >/dev/null",
        check=False, quiet=True,
    )
    step(f"Listo: versión {sha} en https://{DOMAIN}")
    cmd_status(vm, args)


def cmd_status(vm, args):
    vm.run(f"docker ps -a --filter name={CONTAINER} --format '{{{{.Names}}}}  {{{{.Status}}}}  {{{{.Image}}}}'", check=False)
    js = (
        "const d=new (require('node:sqlite').DatabaseSync)('/data/platform.db');"
        "for(const t of d.prepare('SELECT slug,name,status FROM tenants ORDER BY created_at').all())"
        f"console.log('  '+t.slug.padEnd(18)+t.status.padEnd(11)+'https://{DOMAIN}/'+t.slug+'/  '+t.name)"
    )
    vm.run(f"docker exec -e NODE_OPTIONS=--disable-warning=ExperimentalWarning {CONTAINER} node -e {shlex.quote(js)}", check=False)


def cmd_logs(vm, args):
    vm.run(f"docker logs --tail 80 {CONTAINER} 2>&1", check=False)


def cmd_backup(vm, args):
    target = os.path.join(CREDENTIALS_DIR, "respaldos", datetime.date.today().isoformat())
    os.makedirs(target, exist_ok=True)
    _, listing = vm.run(f"ls -1 {DATA}/tenants 2>/dev/null", check=False, quiet=True)
    for slug in listing.split():
        _, latest = vm.run(f"ls -1t {DATA}/tenants/{slug}/backups/*.db 2>/dev/null | head -1", check=False, quiet=True)
        latest = latest.strip()
        if not latest:
            print(f"  {slug}: sin respaldos todavía")
            continue
        local = os.path.join(target, f"{slug}-{os.path.basename(latest)}")
        vm.sftp.get(latest, local)
        print(f"  {slug}: {local}")


def save_setup_code(code):
    os.makedirs(CREDENTIALS_DIR, exist_ok=True)
    path = os.path.join(CREDENTIALS_DIR, "plataforma.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(
            f"GymBro - panel de plataforma (actualizado {datetime.date.today().isoformat()})\n\n"
            f"https://{DOMAIN}/plataforma/\n"
            f"  Código de instalación (un solo uso): {code}\n"
            f"  Con este código creás tu usuario administrador; tu contraseña no se guarda acá.\n"
        )
    return path


def cmd_reset_admin(vm, args):
    """Removes the platform administrator(s) and sets a new one-time setup code."""
    env = parse_env(vm.read(f"{REMOTE}/platform.env", ""))
    if not env:
        sys.exit("La plataforma no está instalada (falta platform.env).")
    if not args.yes:
        sys.exit("Esto borra el usuario administrador del panel (los gimnasios no se tocan). Repetí con --yes.")
    js = ("const d=new (require('node:sqlite').DatabaseSync)('/data/platform.db');"
          "d.exec('DELETE FROM admins; DELETE FROM admin_sessions');console.log('  administrador eliminado')")
    vm.run(f"docker exec -e NODE_OPTIONS=--disable-warning=ExperimentalWarning {CONTAINER} node -e {shlex.quote(js)}")
    env["PLATFORM_SETUP_CODE"] = new_password()
    write_platform_env(vm, env)
    vm.run(f"cd {REMOTE} && docker compose up -d --force-recreate 2>&1 | tail -2", quiet=True)
    wait_healthy(vm)
    path = save_setup_code(env["PLATFORM_SETUP_CODE"])
    print(f"Entrá a https://{DOMAIN}/plataforma/ con el código {env['PLATFORM_SETUP_CODE']} y creá tu administrador.")
    print(f"(guardado en {path})")


def cmd_migrate_platform(vm, args):
    """One-time: the per-gym containers (gymbro-<slug>) become one multi-tenant platform."""
    if vm.read(f"{REMOTE}/platform.env"):
        sys.exit("La plataforma ya está instalada.")
    registry = json.loads(vm.read(f"{REMOTE}/gyms.json", '{"gyms": []}'))
    slugs = [g["slug"] for g in registry.get("gyms", [])]
    if slugs not in ([], ["gymbro"]):
        sys.exit(f"Este paso migra solo el gimnasio 'gymbro'; el registro tiene: {slugs}")

    sha = build_image(vm)
    gym_env = parse_env(vm.read(f"{REMOTE}/gyms/gymbro/gym.env", ""))
    platform_password = new_password()
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

    step("Deteniendo el contenedor del gimnasio y moviendo sus datos a la plataforma")
    vm.run(f"""set -e
cd {REMOTE}
[ -f compose.yml ] && cp -p compose.yml compose.per-gym.{stamp}.yml || true
docker stop gymbro-gymbro >/dev/null 2>&1 || true
mkdir -p {DATA}
if [ -d gyms/gymbro/data ]; then
  tar -czf /opt/gymbro/backups/gyms-gymbro-data.pre-platform-{stamp}.tar.gz -C gyms/gymbro data
  mv gyms/gymbro/data/* {DATA}/
fi
chown -R {CONTAINER_UID} {DATA} && chmod 700 {DATA}
""", quiet=True)
    write_platform_env(vm, {
        "PLATFORM_SETUP_CODE": platform_password,
        "DEFAULT_TENANT": "gymbro",
        "OWNER_USERNAME": gym_env.get("OWNER_USERNAME"),
        "OWNER_NAME": gym_env.get("OWNER_NAME"),
        "OWNER_PASSWORD": gym_env.get("OWNER_PASSWORD"),
        "GEMINI_API_KEY": gym_env.get("GEMINI_API_KEY"),
    })

    def rollback(reason):
        step(f"{reason}: vuelvo al contenedor anterior")
        vm.run(f"""cd {REMOTE}
docker rm -f {CONTAINER} >/dev/null 2>&1
rm -f platform.env
mkdir -p gyms/gymbro/data
if [ -d {DATA}/tenants/gymbro ]; then mv {DATA}/tenants/gymbro/* gyms/gymbro/data/; else mv {DATA}/* gyms/gymbro/data/ 2>/dev/null; fi
rm -rf {DATA}/platform.db* {DATA}/tenants
cp -p compose.per-gym.{stamp}.yml compose.yml
docker compose up -d gym-gymbro 2>&1 | tail -2""", check=False)
        sys.exit("Migración revertida; el sitio sigue con el contenedor anterior.")

    step("Levantando la plataforma (importa el gimnasio actual como 'gymbro')")
    write_compose(vm)
    vm.run(f"docker rm gymbro-gymbro >/dev/null 2>&1; docker tag gymbro:{sha} gymbro:latest && cd {REMOTE} && docker compose up -d --remove-orphans 2>&1 | tail -3", check=False)
    if not wait_healthy(vm):
        vm.run(f"docker logs --tail 30 {CONTAINER} 2>&1", check=False)
        rollback("La plataforma no arrancó")
    _, out = vm.run(f"curl -s -o /dev/null -w '%{{http_code}}' https://{DOMAIN}/gymbro/", check=False, quiet=True)
    if out.strip() != "200":
        rollback(f"https://{DOMAIN}/gymbro/ respondió {out.strip()}")
    vm.run(f"cd {REMOTE} && mv gyms.json gyms.json.migrated-{stamp} 2>/dev/null; true", quiet=True, check=False)
    path = save_setup_code(platform_password)
    step("Plataforma instalada")
    print(f"  Panel:  https://{DOMAIN}/plataforma/   código de instalación: {platform_password}")
    print(f"  (guardado en {path})")
    print(f"  Tu gimnasio sigue en https://{DOMAIN}/  (ahora también https://{DOMAIN}/gymbro/)")
    cmd_status(vm, args)


def main():
    parser = argparse.ArgumentParser(description="GymBro: plataforma multi-gimnasio en Docker sobre la VM")
    sub = parser.add_subparsers(dest="command", required=True)
    reset = sub.add_parser("reset-admin", help="olvidé la contraseña del panel: borra el administrador y da un código nuevo")
    reset.add_argument("--yes", action="store_true")
    for name, text in [
        ("deploy", "compila HEAD en la VM y actualiza la plataforma"),
        ("status", "estado del contenedor y gimnasios"),
        ("logs", "últimas líneas del log"),
        ("backup", "descarga el último respaldo de cada gimnasio"),
        ("migrate-platform", "(una vez) pasa de un contenedor por gimnasio a la plataforma"),
    ]:
        sub.add_parser(name, help=text)
    args = parser.parse_args()
    vm = VM()
    try:
        {
            "deploy": cmd_deploy, "status": cmd_status, "logs": cmd_logs, "backup": cmd_backup,
            "reset-admin": cmd_reset_admin, "migrate-platform": cmd_migrate_platform,
        }[args.command](vm, args)
    finally:
        vm.close()


if __name__ == "__main__":
    main()
