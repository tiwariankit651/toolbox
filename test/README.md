# Test suites

These run the site in a real browser. Nothing here is deployed (`.cfignore` excludes `/test`).

## Setup (one time)

Chrome is extracted into /tmp without touching the system:

```
curl -sL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
mkdir -p /tmp/chrome_x && dpkg-deb -x /tmp/chrome.deb /tmp/chrome_x
mkdir -p /tmp/libs && cd /tmp/libs
apt-get download libnss3 libnspr4 libasound2t64
mkdir -p ext && for f in *.deb; do dpkg-deb -x "$f" ext/; done
npm install playwright --prefix /tmp
npm install jsdom --prefix /tmp
```

## Running

```
node test/serve.js &                 # static server on :8099, mimics clean URLs
node test/func_test.js               # 31 logic assertions, no browser needed
node test/test_all.js                # all 115 tools driven in real Chrome
node test/test_all.js 0-30           # a slice, for faster iteration
node test/deep_test.js               # 13 tools needing real PDFs/WAV/OCR
node test/deep_test.js pdf-editor    # a single tool
```

## What each one proves

| Suite | Proves |
|---|---|
| `func_test.js` | Page-range parser edge cases, no `eval` on user input, crypto randomness, 646 quiz questions well-formed, 118 elements, exams.json integrity, no tool shadows a window global |
| `test_all.js` | Every tool loads, every input accepts a value, primary buttons fire, DOM/canvas actually changes, no undefined inline handlers, no uncaught exceptions |
| `deep_test.js` | Real 3-page PDFs through merger/splitter/compressor/editor/to-image, real OCR reading "HELLO" at 96%, real WAV decoded by audio-trimmer, screen-recorder presets and codec detection, html-editor srcdoc assembly |

## Notes

- `html-editor` and `markdown-editor` are skipped by the blind input-fill: they are code
  sandboxes whose JS panel targets ids from their own HTML panel, so stuffing junk into
  the HTML panel breaks the user's demo code by design.
- `ip-lookup`'s geolocation call sits behind an explicit button and is blocked in the
  sandbox, so the offline CIDR toolkit is asserted instead.
- `screen-recorder` cannot be granted `getDisplayMedia` headlessly, so its preset,
  bitrate and codec logic is asserted instead of an actual capture.
- Sample a whole canvas, not a corner, when checking a PDF rendered: page margins are
  legitimately white and a corner sample gives a false "blank" reading.
