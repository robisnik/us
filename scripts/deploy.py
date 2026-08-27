#!/usr/bin/env python3
"""Deploy to Vercel over its REST API. No Node, no CLI, no login state.

The token is read from the environment or from .env.local, which is gitignored.
It is never printed, never passed as an argument (arguments are visible to
anyone running `ps`), and never written anywhere.

    VERCEL_TOKEN=...            required
    VERCEL_TEAM_ID=...          only if the project lives under a team
    VERCEL_PROJECT=us           optional, defaults to "us"

Run:  python3 scripts/deploy.py [--prod]
"""
import hashlib, json, os, pathlib, sys, time, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Everything the app needs at runtime, and nothing else. Photos and secrets are
# excluded by construction rather than by a filter someone has to remember.
INCLUDE_DIRS = ("src", "assets", "content/story")
INCLUDE_EXTRA = ("content/world.json",)
INCLUDE_FILES = ("index.html", "sw.js", "manifest.webmanifest")
SKIP_SUFFIX = (".py", ".pyc")


def load_env():
    env = pathlib.Path(ROOT / ".env.local")
    if env.exists():
        for line in env.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def collect():
    files = []
    for name in INCLUDE_FILES:
        p = ROOT / name
        if p.exists():
            files.append(p)
    for name in INCLUDE_EXTRA:
        p = ROOT / name
        if p.exists():
            files.append(p)
    for d in INCLUDE_DIRS:
        base = ROOT / d
        if not base.exists():
            continue
        for p in sorted(base.rglob("*")):
            if p.is_file() and not p.name.startswith(".") and p.suffix not in SKIP_SUFFIX:
                files.append(p)
    return files


def call(token, team, path, payload=None, method=None, raw=None, headers=None):
    if team:
        path += ("&" if "?" in path else "?") + "teamId=" + team
    h = {"Authorization": "Bearer " + token}
    h.update(headers or {})
    data = raw if raw is not None else (json.dumps(payload).encode() if payload is not None else None)
    if raw is None and payload is not None:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request("https://api.vercel.com" + path, data=data,
                                 headers=h, method=method or ("POST" if data else "GET"))
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:600]
        sys.exit(f"Vercel API {e.code} on {path.split('?')[0]}: {detail}")


def main():
    load_env()
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    if not token:
        sys.exit("No VERCEL_TOKEN. Put it in .env.local as VERCEL_TOKEN=... "
                 "(that file is gitignored) or export it before running.")
    team = os.environ.get("VERCEL_TEAM_ID", "").strip()
    project = os.environ.get("VERCEL_PROJECT", "us").strip()
    prod = "--prod" in sys.argv

    paths = collect()
    if not paths:
        sys.exit("Nothing to deploy.")

    print(f"uploading {len(paths)} files")
    manifest = []
    for p in paths:
        blob = p.read_bytes()
        sha = hashlib.sha1(blob).hexdigest()
        rel = str(p.relative_to(ROOT))
        call(token, team, "/v2/files", raw=blob, headers={
            "Content-Type": "application/octet-stream",
            "x-vercel-digest": sha,
            "Content-Length": str(len(blob)),
        })
        manifest.append({"file": rel, "sha": sha, "size": len(blob)})
        print(f"  {rel}")

    print("creating deployment")
    body = {
        "name": project,
        "files": manifest,
        # No framework, no build step — the files are the site.
        "projectSettings": {"framework": None, "buildCommand": None,
                            "outputDirectory": None, "installCommand": None},
    }
    # Sent only for production. A null target is rejected rather than treated
    # as "preview".
    if prod:
        body["target"] = "production"
    dep = call(token, team, "/v13/deployments", body)

    url = dep.get("url")
    dep_id = dep.get("id")
    for _ in range(60):
        state = call(token, team, f"/v13/deployments/{dep_id}").get("readyState")
        if state in ("READY", "ERROR", "CANCELED"):
            print(f"  {state}")
            break
        time.sleep(2)

    print(f"\nhttps://{url}")
    if not prod:
        print("(preview — run with --prod for the address she should use)")


if __name__ == "__main__":
    main()
