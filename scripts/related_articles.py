#!/usr/bin/env python3
"""Add a 'Related Articles' block to every blog post, linking up to 3 posts
from the same hand-curated topic cluster, placed just before <footer>.
Idempotent: an existing block is replaced. Run after adding a blog, and add
the new slug to a cluster below (the script fails if a post is in none).

Why: 125 of 139 posts had no link from any other post, so Google saw them as
weakly connected and many sat in 'Crawled - currently not indexed'. Automatic
similarity paired unrelated posts (budgeting -> binary numbers), so the
clusters are curated by topic."""
import re, html, subprocess, sys, collections

ROOT = '/home/eiwantk/toolbox'
START, END = '<!-- related-articles:start -->', '<!-- related-articles:end -->'

CLUSTERS = {
    'govt-form-photos': ['add-date-on-photo-government-forms', 'compress-photo-under-20kb-50kb-100kb',
        'government-job-photo-requirements-all-exams', 'ibps-po-photo-signature-size-2026',
        'image-resize-for-online-forms-complete-guide', 'passport-size-photo-kaise-banaye-mobile-se',
        'photo-background-white-kaise-kare-free', 'resize-photo-for-government-forms',
        'ssc-photo-size-signature-upload-guide', 'upsc-form-photo-signature-requirements',
        'how-to-fill-ssc-form-online-step-by-step'],
    'signature': ['create-digital-signature-for-documents', 'digital-signature-vs-electronic-signature-india',
        'online-signature-kaise-banaye-free'],
    'image-editing': ['best-free-alternatives-canva-photoshop', 'complete-guide-image-editing-tools-free',
        'convert-photo-to-pencil-sketch-online', 'how-to-add-watermark-to-photos-free',
        'how-to-increase-image-size-without-losing-quality', 'how-to-remove-image-background-without-photoshop',
        'upscale-enhance-images-online-free', 'best-free-meme-generators-online',
        'screenshot-mein-sensitive-info-kaise-hide-kare', 'remove-exif-metadata-from-photos'],
    'colour-design': ['check-color-contrast-accessibility', 'color-palette-generator-for-web-design',
        'css-gradient-design-tips-for-beginners', 'extract-colors-from-images'],
    'pdf': ['best-free-pdf-tools-online-2026', 'convert-jpg-to-pdf-without-app', 'how-to-compress-pdf-for-government-portals',
        'how-to-edit-pdf-without-adobe-free', 'how-to-make-pdf-from-phone-photos', 'how-to-merge-pdf-files-online',
        'how-to-split-pdf-extract-pages-free', 'online-pdf-editor-vs-adobe-acrobat-comparison',
        'ultimate-guide-pdf-editing-online-free'],
    'video-audio': ['convert-video-to-gif-online-free', 'free-screen-recorder-no-install-browser',
        'record-screen-with-camera-pip', 'how-to-trim-audio-online-free', 'youtube-timestamp-links-guide',
        'download-instagram-reels-guide', 'text-to-speech-kaise-use-kare-free'],
    'social': ['fancy-fonts-for-instagram-bio', 'instagram-caption-formatting-tips', 'send-whatsapp-without-saving-number',
        'best-free-url-shorteners-2026', 'how-to-create-qr-code-for-business-free', 'qr-code-kaise-banaye-free-with-logo'],
    'writing': ['check-grammar-online-free', 'check-plagiarism-free-online', 'make-ai-text-sound-human',
        'paraphrasing-tool-for-students-free', 'how-to-summarize-articles-quickly', 'essay-outline-generator-upsc',
        'free-citation-generator-apa-mla-guide', 'how-to-compare-text-files-online', 'lorem-ipsum-kya-hai-dummy-text-guide',
        'make-handwritten-assignment-online', 'handwriting-practice-kids-guide'],
    'career': ['resume-ats-score-tips', 'how-to-make-resume-for-freshers-free', 'write-cover-letter-for-job',
        'professional-email-templates-free', 'create-certificates-online-free', 'business-card-design-tips-free-tool',
        'presentation-timer-viva-tips'],
    'typing': ['how-to-check-typing-speed-online', 'improve-typing-speed-tips', 'how-to-prepare-for-typing-test-30-days',
        'how-to-type-faster-for-government-exams', 'typing-test-hindi-english-ssc'],
    'exam-prep': ['best-study-techniques-for-competitive-exams-india', 'complete-study-guide-competitive-exams-india',
        'how-to-prepare-for-government-exams', 'government-exam-calendar-2026', 'practice-previous-year-questions-free',
        'how-to-create-mcq-quiz-for-exam-prep', 'syllabus-tracker-government-exams', 'track-exam-syllabus-progress-free-tool',
        'formula-sheet-math-physics-chemistry'],
    'vocab-memory': ['build-vocabulary-for-competitive-exams', 'daily/10-vocabulary-words-day1',
        'flashcard-spaced-repetition-exam-prep', 'how-to-make-flashcards-for-exam-preparation',
        'how-to-read-faster-speed-reading-tips', 'mind-map-kaise-banaye-study-notes', 'mind-mapping-for-study-brainstorm',
        'best-note-taking-methods-for-students'],
    'quant': ['daily/profit-loss-shortcuts-banking-ssc', 'percentage-calculation-tricks-shortcut',
        'byaj-sainkda-interest-calculation-guide', 'binary-hex-decimal-conversion-explained',
        'unit-converter-guide-all-conversions', 'bigha-katha-gaj-land-units-guide'],
    'study-time': ['ambient-noise-for-study-focus', 'best-pomodoro-technique-for-upsc', 'pomodoro-technique-study-schedule-for-exams',
        'create-weekly-timetable-students', 'how-to-create-study-timetable-that-works', 'countdown-timer-for-exams-events',
        'how-to-use-countdown-timer-for-productivity', 'how-to-build-good-habits', 'how-to-track-daily-habits-build-streaks'],
    'productivity': ['free-online-kanban-todo-list', 'how-to-use-kanban-board-for-students', 'kanban-board-kya-hai-project-management',
        'free-online-whiteboard-for-teaching', 'random-name-picker-team-generator', 'timezone-meeting-planning-guide',
        'document-expiry-tracking-guide'],
    'student-roundups': ['best-free-online-tools-for-students-2026', 'free-online-tools-every-student-needs-2026',
        'best-free-tools-for-developers-2026', 'complete-guide-online-privacy-tools-2026'],
    'developer': ['html-live-editor-free-online', 'json-format-kaise-kare-developers-guide', 'json-to-csv-conversion-guide',
        'excel-to-csv-conversion-guide', 'regex-tester-guide', 'check-ip-address-online-free', 'strong-password-kaise-banaye-tips'],
    'loans-invest': ['emi-calculator-home-loan-car-loan-guide', 'loan-comparison-calculator-guide', 'loan-prepayment-benefits-save-lakhs',
        'sip-calculator-mutual-fund-returns', 'sip-vs-lumpsum-investment-calculator', 'best-budgeting-methods-for-beginners-india',
        'track-monthly-expenses-free'],
    'salary-tax': ['salary-calculator-ctc-to-inhand-guide', 'salary-slip-format-pf-esi-guide',
        'income-tax-calculator-india-old-vs-new-regime', 'rent-receipt-hra-claim-guide',
        'how-to-create-professional-invoice-gst-free', 'invoice-numbering-system-freelancers-india'],
    'calculators-fun': ['age-calculator-exact-age-birthday-countdown', 'bmi-calculator-healthy-weight-guide-india',
        'free-love-calculator-online'],
}


def blog_files():
    out = subprocess.check_output(['git', 'ls-files', 'blog/*.html', 'blog/daily/*.html'], cwd=ROOT).decode().split()
    return [f for f in out if f != 'blog/index.html'
            and 'noindex' not in open(f'{ROOT}/{f}', encoding='utf-8').read()]


def h1_of(c):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', c, re.S)
    s = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else ''
    s = re.sub(r'^[^\w(]+', '', s).strip()
    return s if len(s) <= 90 else s[:87].rsplit(' ', 1)[0] + '…'


def main():
    files = blog_files()
    slug = lambda f: f[5:-5]
    have = {slug(f) for f in files}
    where = {}
    for k, v in CLUSTERS.items():
        for s in v:
            assert s in have, f'cluster {k}: no such post {s}'
            assert s not in where, f'{s} is in two clusters'
            where[s] = k
    missing = sorted(have - set(where))
    assert not missing, f'posts in no cluster (add them): {missing}'
    H = {slug(f): h1_of(open(f'{ROOT}/{f}', encoding='utf-8').read()) for f in files}
    incoming = collections.Counter()
    for f in files:
        s = slug(f); peers = CLUSTERS[where[s]]
        i = peers.index(s)
        # the next 3 posts in the cluster, wrapping round: every post is linked from
        # up to 3 neighbours and links to 3, so nobody is left out
        picks = [peers[(i + k) % len(peers)] for k in (1, 2, 3) if len(peers) > k][:3]
        for p in picks: incoming[p] += 1
        items = ''.join(f'<li><a href="/blog/{p}">{html.escape(H[p])}</a></li>' for p in picks)
        block = (f'{START}<div class="tool-section" style="margin-top:1.5rem"><h2>📖 Related Articles</h2>'
                 f'<ul style="margin-left:1.5rem;line-height:2.2">{items}</ul></div>{END}\n')
        c = open(f'{ROOT}/{f}', encoding='utf-8').read()
        if START in c:
            c = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', lambda m: block, c, flags=re.S)
        else:
            j = c.index('<footer'); c = c[:j] + block + c[j:]
        open(f'{ROOT}/{f}', 'w', encoding='utf-8').write(c)
    zero = [s for s in have if incoming[s] == 0]
    print(f'{len(files)} posts updated; posts with no related link pointing at them: {len(zero)} {zero}')


main()
