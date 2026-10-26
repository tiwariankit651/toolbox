#!/usr/bin/env python3
"""Keep every link to a blog post in sync with that post's current H1, and
drop duplicate list items that point to the same post on one page.

Tool pages and the blog index carried old titles ('Regex Tester - Test
Regular Expressions Online Free') after posts were retitled, and some lists
linked one post twice because two merged URLs now resolve to the same page.
Only the anchor text of <a href="/blog/slug"> is touched."""
import re, html, subprocess

ROOT = '/home/eiwantk/toolbox'


def h1(slug):
    try:
        c = open(f'{ROOT}/blog/{slug}.html', encoding='utf-8').read()
    except FileNotFoundError:
        return None
    if 'noindex' in c: return None
    m = re.search(r'<h1[^>]*>(.*?)</h1>', c, re.S)
    s = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else ''
    return re.sub(r'^[^\w(]+', '', s).strip() or None


def main():
    files = subprocess.check_output(['git', 'ls-files', '*.html'], cwd=ROOT).decode().split()
    H = {}
    changed = dup = 0
    for f in files:
        c = open(f'{ROOT}/{f}', encoding='utf-8').read(); o = c

        def relabel(m):
            slug = m.group(2)
            if slug not in H: H[slug] = h1(slug)
            t = H[slug]
            inner = m.group(4)
            # only replace plain-text anchors; leave cards with nested markup alone
            if not t or '<' in inner or not inner.strip(): return m.group(0)
            return m.group(1) + html.escape(t) + m.group(5)
        c = re.sub(r'(<a href="/blog/([a-z0-9/-]+)"([^>]*)>)([^<]*)(</a>)',
                   lambda m: relabel(m), c)

        def dedupe(ul):
            seen, out = set(), []
            for li in re.findall(r'<li>.*?</li>', ul.group(2), re.S):
                k = re.search(r'href="(/blog/[a-z0-9/-]+)"', li)
                k = k.group(1) if k else li
                if k in seen: continue
                seen.add(k); out.append(li)
            return ul.group(1) + ''.join(out) + ul.group(3)
        before = c.count('<li>')
        c = re.sub(r'(<ul[^>]*>)((?:<li><a href="/blog/[^"]+">.*?</a>.*?</li>\s*)+)(</ul>)', dedupe, c, flags=re.S)
        dup += before - c.count('<li>')
        if c != o:
            open(f'{ROOT}/{f}', 'w', encoding='utf-8').write(c); changed += 1
    print(f'{changed} files updated, {dup} duplicate list items removed')


main()
