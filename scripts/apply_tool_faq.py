#!/usr/bin/env python3
"""Replace the templated 5-question FAQ on tool pages with tool-specific
questions, and keep FAQPage schema in sync.

The template ('Is this tool really free? / Does it work on mobile? / Is my
data safe? / Can I use this for commercial purposes? / Does it work
offline?') was pasted onto 113 tools in April with the tool name swapped in.
AdSense rejected the site for low-value content; a block that is the same on
113 pages is the textbook signal. Source FAQs live in scripts/data/faq/<tool>.json,
each written from that tool's own code.

The block is fenced by markers so re-running replaces it rather than adding.
Run:  python3 scripts/apply_tool_faq.py"""
import re, html, json, os, subprocess, sys

ROOT = '/home/eiwantk/toolbox'
SRC = f'{ROOT}/scripts/data/faq'
GEN = ['Is this tool really free?', 'Does it work on mobile?', 'Is my data safe?',
       'Can I use this for commercial purposes?', 'Does it work offline?']
START, END = '<!-- tool-faq:start -->', '<!-- tool-faq:end -->'


def block(faq):
    items = ''.join(f'<details><summary>{html.escape(e["q"])}</summary><p>{html.escape(e["a"])}</p></details>\n'
                    for e in faq)
    return f'{START}\n<h2>Frequently Asked Questions</h2>\n{items}{END}'


def schema(faq):
    d = {'@context': 'https://schema.org', '@type': 'FAQPage',
         'mainEntity': [{'@type': 'Question', 'name': e['q'],
                         'acceptedAnswer': {'@type': 'Answer', 'text': e['a']}} for e in faq]}
    return '<script type="application/ld+json" data-tool-faq>' + json.dumps(d, ensure_ascii=False) + '</script>'


def main():
    done = 0
    for name in sorted(os.listdir(SRC)):
        tool = name[:-5]
        f = f'{ROOT}/tools/{tool}.html'
        faq = json.load(open(f'{SRC}/{name}', encoding='utf-8'))['faq']
        assert 3 <= len(faq) <= 6, tool
        c = open(f, encoding='utf-8').read(); o = c
        if START in c:
            c = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: block(faq), c, flags=re.S)
        else:
            # An <h2>Frequently Asked Questions</h2> followed by a run of <details>. The
            # generic template questions may be mixed with older tool-specific ones; keep
            # the specific ones (unless the new FAQ already asks the same thing).
            pat = re.compile(r'<h2>Frequently Asked Questions</h2>\s*((?:<details>.*?</details>\s*)+)', re.S)
            m = None
            for cand in pat.finditer(c):
                if any(f'<summary>{q}</summary>' in cand.group(1) for q in GEN): m = cand; break
            assert m, f'{tool}: template FAQ not found'
            keep = []
            newq = {e['q'].strip().lower() for e in faq}
            for d in re.findall(r'<details>.*?</details>', m.group(1), re.S):
                q = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<summary>(.*?)</summary>', d, re.S).group(1))).strip()
                if q in GEN or q.lower() in newq or re.match(r'(is my .* (data )?safe|is (this|it) .*free)', q, re.I):
                    continue
                keep.append(d)
            c = c[:m.start()] + block(faq) + ('\n' + '\n'.join(keep) if keep else '') + '\n' + c[m.end():]
        assert not any(f'<summary>{q}</summary>' in c for q in GEN), f'{tool}: template question left'
        c = re.sub(r'<script type="application/ld\+json" data-tool-faq>.*?</script>\n?', '', c, flags=re.S)
        c = c.replace('</head>', schema(faq) + '\n</head>', 1)
        if c != o:
            open(f, 'w', encoding='utf-8').write(c); done += 1
    print(f'{done} tool pages updated')


main()
