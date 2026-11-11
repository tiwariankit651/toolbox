#!/usr/bin/env python3
"""Connect visible <label> text to its form control so screen readers announce it.

Only rewrites unambiguous static markup, idempotently:
  A) <label>Text</label><input|select|textarea id="x" ...>   -> <label for="x">
     (label is the element immediately before the control, label has no
      'for' and contains no control of its own)
  B) <input type="checkbox|radio" ...><span>Text</span> inside the same
     wrapper, control has no id/label -> aria-label="Text"
  C) control preceded by a heading-like <div>Text</div> (e.g. ambient-noise
     cards) -> aria-label="Text volume" for range inputs
Run:  python3 scripts/link_labels.py [--dry]
"""
import re, glob, html, sys

DRY = '--dry' in sys.argv
CTRL = r'<(?:input|select|textarea)\b'

def text_of(fragment):
    t = re.sub(r'<[^>]+>', ' ', fragment)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip(' :')

def fix(c):
    n = 0
    # A) label immediately followed (whitespace only) by a control with an id
    def a(m):
        nonlocal n
        lab_open, lab_inner, gap, ctrl = m.group(1), m.group(2), m.group(3), m.group(4)
        if 'for=' in lab_open or re.search(CTRL, lab_inner, re.I):
            return m.group(0)
        idm = re.search(r'\bid="([^"]+)"', ctrl)
        if not idm or "'" in idm.group(1) or '+' in idm.group(1):
            return m.group(0)
        n += 1
        return lab_open[:-1] + f' for="{idm.group(1)}">' + lab_inner + '</label>' + gap + ctrl
    c = re.sub(r'(<label(?:\s[^>]*)?>)((?:(?!</label>).){1,200}?)</label>(\s*)(' + CTRL + r'[^>]*>)', a, c, flags=re.S | re.I)

    # B) checkbox/radio followed by a <span>text</span>, no id, no aria-label, not inside a <label>
    def b(m):
        nonlocal n
        ctrl, span = m.group(1), m.group(2)
        if 'aria-label' in ctrl or re.search(r'\bid="', ctrl):
            return m.group(0)
        t = text_of(span)
        if not t or len(t) > 120 or '{' in t or "'+" in t:
            return m.group(0)
        n += 1
        return ctrl[:-1].rstrip('/').rstrip() + f' aria-label="{html.escape(t, quote=True)}">' + span
    c = re.sub(r'(<input\b[^>]*type="(?:checkbox|radio)"[^>]*>)(\s*<span[^>]*>(?:(?!</span>).){1,160}</span>)', b, c, flags=re.S | re.I)

    # C) range input right after a bold title div: give it "<title> volume/level"
    def cc(m):
        nonlocal n
        title, gap, ctrl = m.group(1), m.group(2), m.group(3)
        if 'aria-label' in ctrl:
            return m.group(0)
        t = text_of(title)
        if not t or len(t) > 60:
            return m.group(0)
        n += 1
        return m.group(0).replace(ctrl, ctrl[:-1] + f' aria-label="{html.escape(t, quote=True)} level">', 1)
    c = re.sub(r'<div style="font-weight:600[^"]*">((?:(?!</div>).){1,80})</div>(\s*)(<input\b[^>]*type="range"[^>]*>)', cc, c, flags=re.S | re.I)
    return c, n

total = 0
for f in sorted(glob.glob('tools/*.html') + glob.glob('*.html')):
    src = open(f, encoding='utf-8').read()
    # never touch JavaScript or JSON-LD: split them out, fix only markup
    parts = re.split(r'(<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>)', src, flags=re.S | re.I)
    k = 0
    for i in range(0, len(parts), 2):
        parts[i], d = fix(parts[i]); k += d
    if k:
        total += k
        print(f'{f}: {k}')
        if not DRY:
            open(f, 'w', encoding='utf-8').write(''.join(parts))
print('total links added', total)
