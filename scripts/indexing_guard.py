#!/usr/bin/env python3
"""Indexing guard: block a commit that would recreate an indexing problem.

Every indexing problem found on this site was CAUSED by a change that looked
harmless when it was made. This runs before each commit and refuses the ones
that would bring a known problem back:

  1. An internal link ending in .html, or to www / http.
       Each one points at a URL that 301s, which is exactly what fills
       "Page with redirect".
  2. An internal link to a URL that is listed in _redirects.
       Same effect, for the merged blogs.
  3. A sitemap URL that redirects, is noindex, or has no file.
       A sitemap telling Google to index a moved page is a contradiction.
  4. A canonical that does not match the page's own clean URL.
  5. A NEW blog whose topic duplicates an existing one.
       Two pages for one search is what put 29 blogs in "Crawled - currently
       not indexed". The check compares title words and the tool promoted.
  6. A tax or exam figure that is known to be outdated.
       The income-tax guide carried pre-2025 slabs for months.

Exit code 1 blocks the commit. Run from the repository root.
"""
import glob
import itertools
import os
import re
import subprocess
import sys

BASE = 'https://freetoolhubs.com/'
STOP = set('''a an and are as at be best by can complete do does easy for free from
get guide how in into is it its kaise kare karo ke ki ko kya mein of on online or
out se step the this tips to tool tools top use using vs way ways what when why
with without you your 2025 2026 hai hain aur bhi india indian'''.split())

# figures that have been wrong on this site before; any reappearance blocks
OUTDATED = [
    (r'(?:rebate|87A)[^.<]{0,60}(?:Rs\.?|\u20b9)\s?7,00,000', 'pre-2025 new-regime rebate limit (now Rs 12L)'),
    (r'(?:Rs\.?|\u20b9)\s?7\.75 lakh', 'pre-2025 zero-tax salary (now Rs 12.75L)'),
    (r'new regime[^.<]{0,60}above (?:Rs\.?|\u20b9)\s?15', 'pre-2025 top slab (now above Rs 24L)'),
]


def pages():
    out = []
    for p in (glob.glob('*.html') + glob.glob('tools/*.html')
              + glob.glob('blog/*.html') + glob.glob('blog/daily/*.html')):
        out.append((p, open(p, encoding='utf-8').read()))
    return out


def clean_url(path):
    s = path[:-5]
    if s.endswith('/index'):
        s = s[:-6] + '/'
    if s == 'index':
        s = ''
    return BASE + s


def redirected_paths():
    r = open('_redirects', encoding='utf-8').read()
    return {m.group(1) for m in re.finditer(r'^(/[^\s*]+)\s+\S+\s+30[12]', r, re.M)}


def words(s):
    s = re.sub(r'[^a-z0-9\u0900-\u097f]+', ' ', s.lower())
    return {w for w in s.split() if len(w) > 2 and w not in STOP}


def new_blogs():
    """Blogs added in the commit being made, so only NEW duplicates block."""
    r = subprocess.run(['git', 'diff', '--cached', '--name-status'],
                       capture_output=True, text=True)
    return {line.split('\t')[-1] for line in r.stdout.splitlines()
            if line.startswith('A') and re.match(r'.*blog/.*\.html$', line)}


def main():
    errors = []
    all_pages = pages()
    redirected = redirected_paths()

    for p, c in all_pages:
        # A noindex page is reported by Search Console as 'Excluded by noindex'
        # for as long as it exists. Old URLs must be 301s in _redirects, not
        # stub pages. Only the 404 page may be noindex.
        if re.search(r'<meta[^>]+name="robots"[^>]+noindex', c) and p != '404.html':
            errors.append(f'{p}: noindex page - Google reports it as excluded. '
                          'Delete it and add a 301 in _redirects instead')
            continue
        if 'noindex' in c:
            continue
        for href in re.findall(r'href="([^"#?]+)"', c):
            if href.startswith(('mailto:', 'tel:', 'data:', 'javascript:')):
                continue
            if re.match(r'https?://(www\.)?freetoolhubs\.com', href):
                if href.startswith('http://') or '://www.' in href:
                    errors.append(f'{p}: link to a redirecting host: {href}')
                    continue
                href = '/' + href.split('freetoolhubs.com/', 1)[-1]
            elif href.startswith('http'):
                continue
            if href.endswith('.html') and not href.endswith('/index.html'):
                errors.append(f'{p}: internal link ends in .html (301s): {href}')
            if href.rstrip('/') in redirected:
                errors.append(f'{p}: internal link to a redirected URL: {href}')

        m = re.search(r'rel="canonical"\s+href="([^"]+)"', c)
        if m and m.group(1).rstrip('/') != clean_url(p).rstrip('/'):
            errors.append(f'{p}: canonical {m.group(1)} is not its own URL')

        txt = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', c))
        for pat, why in OUTDATED:
            if re.search(pat, txt, re.I):
                errors.append(f'{p}: {why}')

    # 7. internal files that would be publicly served.
    #    .cfignore is ignored by Cloudflare Pages and _redirects cannot block
    #    an existing file, so the ONLY thing keeping internal files private is
    #    the Cloudflare WAF custom rule "Block internal files". This mirrors
    #    that rule exactly. A tracked file the rule does not cover would go
    #    live publicly, so the commit is BLOCKED until either the file is moved
    #    under a covered path or the WAF rule and WAF_RULE below are updated
    #    together.
    #
    #    WAF expression, as deployed 2026-10-23:
    #      starts_with(path, "/.git") or ends_with(path, ".md")
    #      or starts_with(path, "/scripts/") or starts_with(path, "/Setup")
    #      or path eq "/.cfignore"
    def waf_blocks(path):
        return (path.startswith('/.git') or path.endswith('.md')
                or path.startswith('/scripts/') or path.startswith('/Setup')
                or path == '/.cfignore')
    tracked = subprocess.run(['git', 'ls-files'], capture_output=True, text=True).stdout.splitlines()
    # what a deployed copy of a NEW file would look like, too — staged files
    staged = subprocess.run(['git', 'diff', '--cached', '--name-only', '--diff-filter=A'],
                            capture_output=True, text=True).stdout.splitlines()
    site_ext = re.compile(r'\.(html|css|js|png|jpg|jpeg|svg|ico|xml|webp|gif|json|webmanifest|woff2?|ttf)$')
    allowed = {'_redirects', '_headers', 'robots.txt', 'ads.txt', '.gitignore',
               '.well-known/security.txt'}
    for t in sorted(set(tracked) | set(staged)):
        if t in allowed or site_ext.search(t):
            continue
        if waf_blocks('/' + t):
            continue
        errors.append(f'{t}: would be PUBLIC on freetoolhubs.com - the Cloudflare '
                      f'"Block internal files" rule does not cover it. Move it under '
                      f'/scripts/, rename it to .md, or add it to the WAF rule AND to '
                      f'waf_blocks() in scripts/indexing_guard.py')

    # sitemaps
    files = {clean_url(p).rstrip('/'): c for p, c in all_pages}
    for sm in glob.glob('sitemap-*.xml'):
        for loc in re.findall(r'<loc>([^<]+)</loc>', open(sm, encoding='utf-8').read()):
            key = loc.rstrip('/')
            rel = '/' + loc[len(BASE):]
            if rel.rstrip('/') in redirected:
                errors.append(f'{sm}: lists a redirected URL: {loc}')
            elif key not in files and key + '/' not in files and loc != BASE:
                errors.append(f'{sm}: lists a URL with no page: {loc}')
            elif key in files and 'noindex' in files[key]:
                errors.append(f'{sm}: lists a noindex page: {loc}')

    # new blogs that duplicate an existing topic
    added = new_blogs()
    if added:
        info = {}
        for p, c in all_pages:
            if not p.startswith('blog/') or 'noindex' in c or p.endswith('index.html'):
                continue
            t = re.search(r'<title>(.*?)</title>', c, re.DOTALL)
            tools = re.findall(r'href="/tools/([a-z0-9-]+)"', c)
            info[p] = (words((t.group(1) if t else '') + ' ' + os.path.basename(p)[:-5].replace('-', ' ')),
                       max(set(tools), key=tools.count) if tools else None)
        for new in added:
            if new not in info:
                continue
            nw, nt = info[new]
            for old, (ow, ot) in info.items():
                if old == new or old in added:
                    continue
                j = len(nw & ow) / max(1, len(nw | ow))
                if (nt and nt == ot and j >= 0.20 and len(nw & ow) >= 2) or j >= 0.45:
                    errors.append(f'{new}: same search as existing {old} '
                                  f'(shared: {", ".join(sorted(nw & ow))}). '
                                  f'Extend the existing article instead.')

    if errors:
        print(f'  INDEXING GUARD: {len(errors)} problem(s) would hurt indexing\n')
        for e in errors[:40]:
            print('    ' + e)
        if len(errors) > 40:
            print(f'    ... and {len(errors) - 40} more')
        return 1
    print('  indexing guard: clean')
    return 0


if __name__ == '__main__':
    sys.exit(main())
