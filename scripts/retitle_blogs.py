#!/usr/bin/env python3
"""Retitle blog posts whose <title>/description read like the tool page they
support. Google indexes one page per search; when a guide is titled
'Regex Tester - Test Regular Expressions Online Free' it competes with
/tools/regex-tester and is dropped as 'Crawled - currently not indexed'.
Each new title describes what the article actually teaches (taken from its
own section headings). Updates <title>, meta description, og:/twitter: tags
and the Article schema headline together, and the H1."""
import re, html, sys, json

ROOT = '/home/eiwantk/toolbox'
NEW = {
 'regex-tester-guide': ('Common Regex Mistakes: Dot, Anchors, Flags, Greedy Matching',
   'Why a regex matches too much or nothing at all: the dot and line breaks, anchors, the g flag, ASCII-only \\d and \\w, greedy quantifiers and patterns that hang the browser.',
   'Regex Mistakes That Break Your Patterns'),
 'random-name-picker-team-generator': ('How to Pick Names and Make Teams Fairly',
   'How random selection really works: with vs without replacement, why random is not evenly spread, shuffling, three kinds of fair teams, and running a draw people trust.',
   'How to Pick Names and Make Teams Fairly'),
 'free-online-kanban-todo-list': ('How to Use a Kanban Board: WIP Limits and Columns',
   'The rule that makes Kanban work, how to choose a work-in-progress limit, columns that match reality, sizing cards, and Kanban vs a plain to-do list for study.',
   'How to Use a Kanban Board So It Actually Works'),
 'check-grammar-online-free': ('What Grammar Checkers Catch and Miss',
   'What automated grammar checking finds reliably, what it cannot judge, why correct Indian English gets flagged, passive voice, sentence length and the errors that cost marks.',
   'What a Grammar Checker Catches — and What It Misses'),
 'send-whatsapp-without-saving-number': ('How wa.me Links Work: WhatsApp Without Saving a Number',
   'How the wa.me link format works, country codes, pre-filled messages, QR codes, privacy tips and common mistakes when messaging a number you have not saved.',
   'How to Message on WhatsApp Without Saving the Number'),
 'essay-outline-generator-upsc': ('UPSC Mains Essay: Structure, Brainstorming, Time Plan',
   'How to structure a UPSC Mains essay, brainstorm points, use quotes, split three hours between two essays, plus likely 2026 themes and the do\'s and don\'ts examiners notice.',
   'How to Write a UPSC Mains Essay — Structure and Time Plan'),
 'government-exam-calendar-2026': ('How to Track Government Exam Dates in 2026',
   'Why lists of exam dates go out of date, which body recruits for what, the four dates that matter for every exam, eligibility traps and a simple tracking system.',
   'How to Track Government Exam Dates Without Missing One'),
 'fancy-fonts-for-instagram-bio': ('How Fancy Instagram Fonts Work and What They Cost',
   'Fancy bio fonts are Unicode maths symbols, not fonts. Which blocks are used, why screen readers and search struggle with them, where they break, and better ways to add emphasis.',
   'How Fancy Instagram Fonts Work — and What They Cost'),
 'free-love-calculator-online': ('How Love Calculators Work: Where the Score Comes From',
   'How a love calculator turns two names into a percentage, why the same names always give the same score, the FLAMES method, and why it feels meaningful when it is not.',
   'How a Love Calculator Works'),
 'html-live-editor-free-online': ('Why Your HTML and CSS Look Wrong: Specificity, Box Model',
   'The mistakes that make a live preview misbehave, CSS specificity explained, the box model, and what a browser-based HTML editor can and cannot do.',
   'Why Your HTML and CSS Look Wrong — and How to Fix It'),
 'check-color-contrast-accessibility': ('WCAG Colour Contrast Explained: Ratios and Mistakes',
   'What a contrast ratio measures, why AA and AAA thresholds differ, the mistake that invalidates most checks, gradients, and how to fix a failing colour without redesigning.',
   'WCAG Colour Contrast Explained'),
 'professional-email-templates-free': ('How to Write a Professional Email That Gets a Reply',
   'How to write a professional email that gets answered: subject lines, a four-part structure, openings to avoid, Indian workplace conventions, attachments and CC.',
   'How to Write a Professional Email That Gets a Reply'),
 'how-to-merge-pdf-files-online': ('How to Merge PDFs Without Page-Order and Size Mistakes',
   'What merging a PDF actually does, how to keep pages in the right order, what happens to form fields and signatures, rotation problems and why merging does not shrink files.',
   'How to Merge PDFs Without Common Mistakes'),
 'free-online-whiteboard-for-teaching': ('How to Teach Well With a Digital Whiteboard',
   'Why drawing beats showing slides, writing legibly with a mouse, teaching on a shared screen, structuring a board so it makes sense afterwards, and when not to use one.',
   'How to Teach Well With a Digital Whiteboard'),
 'convert-video-to-gif-online-free': ('Why GIFs Get So Big and How to Make Them Smaller',
   'Why GIF files balloon, the 256-colour limit, the settings that actually change file size, trimming before converting, clean loops and when to use video instead.',
   'Why GIFs Get So Big — and How to Make Them Smaller'),
 'how-to-read-faster-speed-reading-tips': ('Speed Reading: What the Research Says Actually Works',
   'What reading research shows about speed reading, habits that waste time, matching pace to purpose, previewing, why RSVP tests poorly and how to practise without losing comprehension.',
   'Speed Reading — What Actually Works'),
}


def esc(s): return html.escape(s, quote=True)


def main():
    for slug, (title, desc, h1) in NEW.items():
        f = f'{ROOT}/blog/{slug}.html'
        c = open(f, encoding='utf-8').read(); o = c
        full = title if len(title) > 46 else title + ' | FreeToolHubs'
        c = re.sub(r'<title>[^<]*</title>', f'<title>{esc(full)}</title>', c, count=1)
        for pat in (r'(<meta name="description" content=")[^"]*(")', r'(<meta property="og:description" content=")[^"]*(")',
                    r'(<meta name="twitter:description" content=")[^"]*(")'):
            c = re.sub(pat, lambda m: m.group(1) + esc(desc) + m.group(2), c, count=1)
        for pat in (r'(<meta property="og:title" content=")[^"]*(")', r'(<meta name="twitter:title" content=")[^"]*(")'):
            c = re.sub(pat, lambda m: m.group(1) + esc(title) + m.group(2), c, count=1)
        def fix_ld(m):
            d = json.loads(m.group(2))
            for node in (d if isinstance(d, list) else [d]):
                if node.get('@type') in ('Article', 'BlogPosting'):
                    node['headline'] = title; node['description'] = desc
            return m.group(1) + json.dumps(d, ensure_ascii=False) + m.group(3)
        c = re.sub(r'(<script type="application/ld\+json">)(.*?)(</script>)', fix_ld, c, flags=re.S)
        m = re.search(r'(<h1[^>]*>)(.*?)(</h1>)', c, re.S)
        emoji = re.match(r'^([^\w(<]*)', html.unescape(re.sub(r'<[^>]+>', '', m.group(2)))).group(1)
        c = c[:m.start()] + m.group(1) + esc(emoji) + esc(h1) + m.group(3) + c[m.end():]
        assert c != o, slug
        open(f, 'w', encoding='utf-8').write(c)
        print(f'{len(full):3}  {slug}')


main()
