#!/usr/bin/env python3
"""Insert a tool-specific in-depth guide section (scripts/data/guides/<tool>.html)
into each tool page, after the FAQ block. Fenced by markers so re-running
replaces the section instead of adding another.

These 25 tools carried only the templated headings (About / How to Use /
Common Use Cases / FAQ) - pages that read the same as every other tool
page. Each guide was written from the tool's own code."""
import re, os

ROOT = '/home/eiwantk/toolbox'
SRC = f'{ROOT}/scripts/data/guides'
START, END = '<!-- tool-guide:start -->', '<!-- tool-guide:end -->'


def main():
    n = 0
    for name in sorted(os.listdir(SRC)):
        tool = name[:-5]
        f = f'{ROOT}/tools/{tool}.html'
        body = open(f'{SRC}/{name}', encoding='utf-8').read().strip()
        block = (f'{START}<div class="tool-section" id="deep-notes" style="margin-top:1.5rem">\n'
                 f'{body}\n</div>{END}')
        c = open(f, encoding='utf-8').read(); o = c
        if START in c:
            c = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: block, c, flags=re.S)
        else:
            assert 'id="deep-notes"' not in c, f'{tool} already has a deep-notes section'
            # after the tool-faq block's enclosing section; fall back to before Related Tools
            i = c.find('🔗 Related Tools')
            i = c.rfind('<div class="tool-section"', 0, i)
            assert i > 0, tool
            c = c[:i] + block + '\n  ' + c[i:]
        if c != o:
            open(f, 'w', encoding='utf-8').write(c); n += 1
    print(f'{n} tool pages updated')


main()
