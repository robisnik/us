#!/usr/bin/env python3
"""Parse every module the way the browser will.

The previous check stripped module syntax and parsed the rest with
`new Function`, which runs in SLOPPY mode — where a duplicate function
declaration is perfectly legal. In a real module it is a SyntaxError, so a
duplicated function sailed through and broke the page with a blank screen.

This strips the module syntax in Python (no nested escaping to get wrong) and
parses what is left in strict mode, which catches it.

Run:  python3 scripts/check_js.py [files...]
"""
import pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

IMPORT = re.compile(r'^\s*import\s+(?:[\w*\s{},]+\s+from\s+)?[\'"][^\'"]+[\'"];?\s*$', re.M)
EXPORT = re.compile(r'^(\s*)export\s+(?:default\s+)?', re.M)

CHECK = '''
ObjC.import("Foundation");
var s = $.NSString.stringWithContentsOfFileEncodingError("%s", 4, null).js;
try { new Function('"use strict"; { ' + s + ' }'); "OK" }
catch (e) { "ERR " + e.message }
'''


def strip(src):
    """Blank out module syntax, preserving line count so reported line numbers
    still point at the real source."""
    src = IMPORT.sub('', src)
    return EXPORT.sub(r'\1', src)


def check(path):
    tmp = tempfile.NamedTemporaryFile('w', suffix='.js', delete=False)
    tmp.write(strip(path.read_text()))
    tmp.close()
    r = subprocess.run(['osascript', '-l', 'JavaScript', '-e', CHECK % tmp.name],
                       capture_output=True, text=True, timeout=60)
    pathlib.Path(tmp.name).unlink(missing_ok=True)
    out = (r.stdout or r.stderr).strip()
    return None if out == 'OK' else (out[4:].strip() if out.startswith('ERR') else out)


def main(argv):
    files = [ROOT / a for a in argv[1:]] or sorted(
        p for p in ROOT.rglob('*.js')
        if 'node_modules' not in p.parts and '.git' not in p.parts)
    bad = False
    for f in files:
        err = check(f)
        print(f"  {'FAIL' if err else 'ok  '}  {f.relative_to(ROOT)}"
              + (f"\n        {err}" if err else ''))
        bad |= bool(err)
    if bad:
        sys.exit('syntax check failed — not shipping this')
    print('all modules parse')


if __name__ == '__main__':
    main(sys.argv)
