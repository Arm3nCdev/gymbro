"""Rebuild GymBro with Docker, smoke-test it, and deploy it to production.

Usage:  python scripts/deploy.py            (rebuild + test + deploy)
        python scripts/deploy.py --no-deploy (rebuild + test only)

Steps:
  1. docker compose build / up -d, then check /api/health and the home page.
  2. Copy server.cjs + dist/ out of the tested image.
  3. Upload to the VM, back up gym_database.json, swap the files and restart
     only the gymbro service. Rolls back if the service does not come up.

SSH settings come from .env.deploy (git-ignored):
  GYMBRO_SSH_HOST=gymbro.local.net.py
  GYMBRO_SSH_USER=root
  GYMBRO_SSH_PASSWORD=...
Requires: pip install paramiko
"""
import hashlib
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGE = "gymbro:latest"
LOCAL_URL = "http://localhost:3000"
REMOTE_APP = "/opt/gymbro/app"
REMOTE_BACKUPS = "/opt/gymbro/backups"
REMOTE_PORT = 3500
PUBLIC_URL = "https://gymbro.local.net.py/"


def step(msg):
    print(f"\n==> {msg}", flush=True)


def run(cmd):
    print("$ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


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


def wait_for(url, seconds=60):
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                if resp.status == 200:
                    return resp.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        time.sleep(2)
    raise SystemExit(f"No responde: {url}")


def build_and_test():
    step("Rebuild de la imagen Docker")
    run(["docker", "compose", "build"])
    run(["docker", "compose", "up", "-d"])
    step("Prueba del contenedor")
    print(wait_for(f"{LOCAL_URL}/api/health"))
    wait_for(f"{LOCAL_URL}/")
    print("Contenedor OK en", LOCAL_URL)


def extract_release(workdir):
    step("Extrayendo server.cjs y dist/ de la imagen probada")
    rel = os.path.join(workdir, "rel")
    os.makedirs(rel)
    container = subprocess.run(
        ["docker", "create", IMAGE], cwd=ROOT, check=True, capture_output=True, text=True
    ).stdout.strip()
    try:
        for name in ("server.cjs", "dist", "package.json", "package-lock.json"):
            run(["docker", "cp", f"{container}:/app/{name}", os.path.join(rel, name)])
    finally:
        subprocess.run(["docker", "rm", container], cwd=ROOT, capture_output=True)
    tgz = os.path.join(workdir, "gymbro-release.tgz")
    with tarfile.open(tgz, "w:gz") as tar:
        for name in os.listdir(rel):
            tar.add(os.path.join(rel, name), arcname=name)
    return tgz


def ssh_run(client, cmd, check=True):
    _, out, err = client.exec_command(cmd, timeout=900)
    text = out.read().decode("utf-8", errors="replace") + err.read().decode("utf-8", errors="replace")
    code = out.channel.recv_exit_status()
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
    sys.stdout.flush()
    if check and code != 0:
        raise SystemExit(f"Falló en el servidor (rc={code}): {cmd.splitlines()[0]}")
    return code, text


def deploy(tgz):
    import paramiko

    env = load_deploy_env()
    step(f"Conectando a {env['GYMBRO_SSH_HOST']}")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        env["GYMBRO_SSH_HOST"],
        username=env.get("GYMBRO_SSH_USER", "root"),
        password=env["GYMBRO_SSH_PASSWORD"],
        timeout=20,
        look_for_keys=False,
        allow_agent=False,
    )
    try:
        step("Subiendo la versión")
        remote_tgz = "/root/gymbro-release-latest.tgz"
        sftp = client.open_sftp()
        sftp.put(tgz, remote_tgz)
        sftp.close()
        local_sha = hashlib.sha256(open(tgz, "rb").read()).hexdigest()
        _, remote_sha = ssh_run(client, f"sha256sum {remote_tgz}")
        if local_sha not in remote_sha:
            raise SystemExit("El archivo subido no coincide (sha256).")

        step("Respaldo, instalación y reinicio del servicio gymbro")
        ssh_run(client, f"""set -e
TS=$(date +%Y%m%d-%H%M%S); A={REMOTE_APP}; B={REMOTE_BACKUPS}; N=/tmp/gbrel
cp -p $A/gym_database.json $B/gym_database.$TS.json
cp -p $A/server.cjs $B/server.$TS.cjs
tar -czf $B/dist.$TS.tgz -C $A dist
echo $TS > /tmp/gymbro-last-backup
rm -rf $N && mkdir $N && tar -xzf {remote_tgz} -C $N
if ! cmp -s $N/package-lock.json $A/package-lock.json; then
  echo "Dependencias cambiaron: npm ci"
  cp $N/package.json $N/package-lock.json $A/
  chown gymbro:gymbro $A/package.json $A/package-lock.json
  sudo -u gymbro -H env HOME=/opt/gymbro PATH=/opt/node22/bin:/usr/bin:/bin sh -c "cd $A && npm ci --omit=dev"
fi
rm -rf $A/dist && cp -r $N/dist $A/dist && cp $N/server.cjs $A/server.cjs
chown -R gymbro:gymbro $A/dist $A/server.cjs $B
rm -rf $N
systemctl restart gymbro
echo "backup: $TS"
""")

        step("Verificando producción")
        healthy = False
        for _ in range(15):
            time.sleep(2)
            code, _ = ssh_run(client, f"curl -sf http://127.0.0.1:{REMOTE_PORT}/api/health", check=False)
            if code == 0:
                healthy = True
                break
        if not healthy:
            step("El servicio no responde: restaurando la versión anterior")
            ssh_run(client, f"""TS=$(cat /tmp/gymbro-last-backup); A={REMOTE_APP}; B={REMOTE_BACKUPS}
cp $B/server.$TS.cjs $A/server.cjs && rm -rf $A/dist && tar -xzf $B/dist.$TS.tgz -C $A
chown -R gymbro:gymbro $A/dist $A/server.cjs; systemctl restart gymbro; journalctl -u gymbro -n 20 --no-pager -o cat""", check=False)
            raise SystemExit("Despliegue revertido.")
        ssh_run(client, f"curl -s -o /dev/null -w 'publico {PUBLIC_URL}: %{{http_code}}\\n' {PUBLIC_URL}")
    finally:
        client.close()
    print("\nDesplegado en producción:", PUBLIC_URL)


def main():
    build_and_test()
    if "--no-deploy" in sys.argv:
        return
    workdir = tempfile.mkdtemp(prefix="gymbro-deploy-")
    try:
        deploy(extract_release(workdir))
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    main()
