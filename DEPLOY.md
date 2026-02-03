# Nebula – Deploy to Mini-Beast

## Push this branch to GitHub (one-time or per feature)

```bash
# From repo root, on feature/init-github (or your feature branch)
git push -u origin feature/init-github
```

Then on GitHub: open a PR from `feature/init-github` into `main`, merge, and set default branch to `main` if needed.

**Or merge locally and push main:**

```bash
git checkout main
git merge feature/init-github -m "Merge feature/init-github: DEPLOY.md and .gitignore"
git push origin main
```

## Verification after push

On Mini-Beast (or any host that can reach the service):

```bash
curl -s http://127.0.0.1:8000/api/health
sudo systemctl is-active astra-nebula
```

Success: health returns JSON; service is `active`. If there is a web UI, load it in a browser.

---

## Prerequisites

- SSH access to Mini-Beast
- Nebula runs from `/opt/astra-nebula` (or set `NEBULA_ROOT` below)
- systemd service: `astra-nebula`

## One-time: clone on Mini-Beast (if not already)

```bash
sudo mkdir -p /opt/astra-nebula
sudo chown $USER:$USER /opt/astra-nebula
git clone git@github.com:biggyclops/nebula-map.git /opt/astra-nebula
cd /opt/astra-nebula
# Create .venv, install deps, install systemd unit (see deploy_on_minibeast.sh or runbook)
```

## Regular deploy (pull + restart)

```bash
cd /opt/astra-nebula
git fetch origin && git checkout main && git pull --rebase origin main
# If requirements changed: source .venv/bin/activate && pip install -r requirements.txt -q
sudo systemctl restart astra-nebula
sudo journalctl -u astra-nebula -n 50 --no-pager
```

## Health check

```bash
curl -s http://127.0.0.1:8000/api/health
```

## Useful commands

- Status: `sudo systemctl status astra-nebula`
- Logs (follow): `sudo journalctl -u astra-nebula -f`
- Restart: `sudo systemctl restart astra-nebula`

## Finding the Nebula project on Mini-Beast

If you need to locate the project directory:

**Method A – systemd:**  
`grep -E 'WorkingDirectory|ExecStart' /etc/systemd/system/astra-nebula.service 2>/dev/null`

**Method B – common paths:**  
`for d in /opt/astra-nebula /opt/nebula /home/*/nebula-map; do [ -d "$d" ] && echo "FOUND: $d"; done`

**Method C – search:**  
`sudo find /opt /home -maxdepth 5 -name 'main.py' -type f 2>/dev/null | while read f; do dir=$(dirname "$f"); [ -f "$dir/package.json" ] && echo "CANDIDATE: $dir"; done`

---

## Reusable checklist for future updates

- [ ] Work on a feature branch (e.g. `feature/my-change`), not directly on `main`.
- [ ] Commit and push branch; open PR to `main` (or merge locally and push `main`).
- [ ] On Mini-Beast: `cd /opt/astra-nebula && git pull --rebase origin main && sudo systemctl restart astra-nebula`.
- [ ] Run `curl -s http://127.0.0.1:8000/api/health` and check UI.
- [ ] Tail logs if needed: `sudo journalctl -u astra-nebula -f -n 100`.
