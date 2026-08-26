#!/usr/bin/env python3
"""Dev server.

Speaks HTTP/1.1 rather than the stdlib default of HTTP/1.0: registering a
service worker over 1.0 fails in Chrome with an unhelpful "unknown error when
fetching the script", and the app is not installable without one.

Nothing is cached, so an edit is always the thing you reload.

Run:  python3 scripts/serve.py [port]
"""
import functools, os, pathlib, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = str(pathlib.Path(__file__).resolve().parent.parent)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 4180))


class H(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        # The service worker is allowed to control the whole origin.
        if self.path.endswith("sw.js"):
            self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def log_message(self, fmt, *a):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % a))


H.extensions_map.update({
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".webmanifest": "application/manifest+json",
    ".json": "application/json",
    ".svg": "image/svg+xml",
})

print(f"serving {ROOT} on http://127.0.0.1:{PORT}")
ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(H, directory=ROOT)).serve_forever()
