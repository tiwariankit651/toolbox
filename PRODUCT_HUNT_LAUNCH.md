# Product Hunt Launch Kit — FreeToolHubs

Ye file sirf tumhare liye hai (deploy nahi hogi, `.cfignore` mein `/*.md` hai).

Sab kuch official Product Hunt guide se verify kiya hua hai:
https://www.producthunt.com/launch/preparing-for-launch

---

## PEHLE YE SAMAJH LO

- Launch **ek hi din ka event** hai. Homepage ranking **Pacific Time** ke 24-hour cycle pe chalti hai.
- Tum **khud apna product submit kar sakte ho** — "hunter" ko paise dene ki zaroorat NAHI hai
  (Product Hunt khud kehta hai paid hunter use na karo).
- Launch **1 mahina pehle schedule** kar sakte ho, aur usse pehle **"Coming Soon" teaser**
  page bana sakte ho — isse launch se pehle followers jama ho jaate hain. Ye free hai.
- **Upvote maangna MANA hai.** Feedback maango, upvote nahi. PH isko pakadta hai.

---

## STEP 0 — Account Warm-up (launch se 2-3 hafte pehle)

Naya account banake turant launch karna sabse badi galti hai. Pehle ye karo:

- [ ] producthunt.com pe account banao (Google/X se sign in)
- [ ] Profile poora karo: photo, bio, website, X handle
- [ ] Roz 5-10 min: doosre products pe **genuine comments** karo (2-3 din tak minimum)
- [ ] Kuch products upvote karo jo tumhe actually pasand aaye
- [ ] Forums mein 1-2 baar participate karo

**Kyun:** PH naye accounts ki activity ko suspicious maanta hai. Thoda history hona chahiye.

---

## STEP 1 — Assets Banao (launch se 1 hafta pehle)

### Thumbnail (REQUIRED)
- Size: **240x240 px** square, under 3MB
- Kya rakho: gradient background (site ka indigo→purple→pink) + "🧰" ya "FTH" monogram
- Tumhare footer mein already ek "AT" gradient mark hai — usse inspire lo par product ka
  icon banao, personal initials nahi

### Gallery Images (MINIMUM 2 REQUIRED, 4-6 better)
- Size: **1270x760 px** each
- Ye 6 banao:
  1. **Homepage** — tool grid dikhta hua (115 tools ka scale dikhega)
  2. **AI Background Remover** — before/after ek real photo pe
  3. **Image Compressor** — before/after slider + "2.4MB → 180KB" jaisa number
  4. **PDF Merger** — thumbnails + drag reorder
  5. **Resume Builder** — ATS score panel dikhta hua
  6. **Mobile view** — phone frame mein site

**Tip:** Har image pe ek chhota text overlay daalo bataate hue kya ho raha hai.
Screenshots lene ke liye apni hi site ka **Screen Recorder** aur size fix karne ke liye
**Image Resizer** + **Image Compressor** use karo.

### Video (OPTIONAL par 53% Product-of-the-Day winners ke paas hota hai)
- 45-60 second screen recording, YouTube pe upload karo (private NAHI, public/unlisted)
- Flow: homepage → AI bg remover chalao → compressor chalao → "no upload" point highlight karo
- Loom ya apni site ka Screen Recorder use kar sakte ho
- Full YouTube URL chahiye hoga (shortened link kaam nahi karega)

---

## STEP 2 — Coming Soon Teaser (launch se 2-4 hafte pehle)

PH 30 din pehle tak teaser allow karta hai. Ye karo:

- [ ] Submit → New Product → details bharo → **"Schedule"** choose karo (Launch now nahi)
- [ ] Teaser page ban jayega jahan log "notify me" kar sakte hain
- [ ] Us teaser link ko apne X/LinkedIn/WhatsApp pe share karo

**Fayda:** Launch ke din wo followers automatically notify ho jaate hain.

---

## STEP 3 — Form Ke Exact Answers

Ye copy-paste ready hai. PH ke field limits verify kiye hue hain.

### URL
```
https://freetoolhubs.com
```
⚠️ Shortened links (bit.ly) aur UTM tracking links **accept nahi** hote. Plain URL do.

### Name of the product
```
FreeToolHubs
```
Sirf naam. Koi tagline ya emoji nahi.

### Tagline (max 60 characters)
Ye use karo (58 chars):
```
115 free browser tools that never upload your files
```

Backup options:
```
Free online tools that run fully in your browser   (49)
115 free tools for students, creators & developers (50)
```

⚠️ PH tagline ko strict rakhta hai — koi "best", "amazing", "ultimate" nahi. Simple aur
clear rakho: product kya karta hai.

### Description (max 500 characters)
```
FreeToolHubs is a set of 115+ free online tools that run entirely in your browser — your files are never uploaded to a server.

PDF merge, split, compress and edit. AI background remover. Image compressor with target file size. OCR in 10 Indian languages. Resume builder with ATS score. GST invoice generator. Typing test, flashcards, formula sheets for exam prep. JSON, regex, SQL and Base64 tools for developers.

No signup, no watermarks, no limits.
```
(≈480 chars — count check kar lena, agar zyada ho toh last line hata do)

### Launch tags (max 3)
```
Productivity
Design Tools
Education
```
Alternative combo agar upar wale na milein: `Productivity`, `Developer Tools`, `Privacy`

### Pricing
```
Free
```

### X handle
```
@the_ank_tiwari
```
(PH kehta hai product ka handle do, par tumhara personal hi hai toh wahi chalega)

### Makers
Khud ko add karo. Koi co-maker nahi hai toh khali chhod do.

### Shoutouts (max 3)
Jo tools actually use kiye:
```
Cloudflare Pages
GitHub
Claude
```

### Promo
Skip karo — sab free hai, promo code ka matlab nahi.

---

## STEP 4 — First Comment (SABSE IMPORTANT)

PH ka data: **70% Product-of-the-Day winners ke paas maker ka first comment tha.**

Ye ready-to-paste hai. Apne hisaab se tweak kar lena — but tone honest rakho:

```
Hey Product Hunt 👋

I'm Ankit, a solo developer from India. I built FreeToolHubs because I kept
hitting the same wall: every time I needed to compress a photo for a government
exam form or merge a couple of PDFs, I had to upload my personal documents to
some random website.

That never sat right with me. So I built tools that don't do that.

🔒 Everything runs in your browser
No server, no upload, no account. Your file never leaves your device — you can
check the network tab and see nothing goes out. Many tools keep working after
the first load, even offline.

🧰 What's in it (115 tools)
• PDF — merge, split, compress, edit, add text, convert
• Images — AI background remover (WebAssembly model, runs locally), compressor
  with target-KB mode, converter, upscaler, watermark
• Career — resume builder with a live ATS score, cover letter builder, GST invoice
  generator
• Students — OCR in 10 Indian languages, typing test with Hindi mode, 700+ formula
  reference, 650+ vocabulary words with spaced repetition, 640+ practice questions
• Developers — JSON formatter with tree view, regex tester with a pattern library,
  SQL formatter, Base64, crontab builder

🇮🇳 Built with Indian users in mind
A lot of it came from real pain: exam form photo specs, PDF size limits on
government portals, GST invoices, CGPA conversions, Hindi typing tests.

🙏 What I'd love feedback on
• Does the AI background remover hold up on your photos? It downloads a ~40MB
  model on first use, which I know is a lot — I'm curious whether that tradeoff
  feels worth it.
• Which tool felt genuinely useful, and which one felt half-baked? I'd rather
  hear the harsh version.
• Anything you expected to find and didn't?

It's free with no paid tier and no plans for one. Happy to answer anything.
```

⚠️ **"Please upvote" kabhi na likho.** PH isko penalise karta hai.

---

## STEP 5 — Launch Day

### Timing
- **12:01 AM Pacific Time** = **12:31 PM IST** (jab PST hai, Nov–Mar)
- **12:01 AM PDT** = **12:31 PM IST** (jab PDT hai, Mar–Nov)

India ke liye ye actually convenient hai — dopahar 12:30 baje.

**Din:** Tuesday–Thursday pe traffic sabse zyada, par competition bhi. PH ka apna data
kehta hai weekend launches ko **15% zyada "Visit" clicks** milte hain aur badi companies
kam launch karti hain. Solo project ke liye **weekend ya Monday** better ho sakta hai.

Meri rai: **Tuesday ya Wednesday** try karo. Traffic chahiye, aur tumhara product broad
audience ke liye hai.

### Launch ke baad pehle 4 ghante (sabse zaroori)
- [ ] X/Twitter pe post karo PH link ke saath
- [ ] LinkedIn pe post karo — apni story likho, sirf link nahi
- [ ] WhatsApp/Telegram groups mein share karo (jahan tum genuinely member ho)
- [ ] Reddit r/SideProject aur r/InternetIsBeautiful pe post karo
- [ ] **Har comment ka jawab do, 15-20 min ke andar** — ye ranking mein count hota hai

### Pura din
- [ ] Har 1-2 ghante check karo, comments ka reply do
- [ ] Criticism aaye toh defensive na ho — "good point, let me look at that" bolo
- [ ] Koi bug bataye toh **usi din fix karke reply karo** — PH community isko bahut respect karti hai

⚠️ **Ye MAT karo:**
- Paise deke upvote kharidna (PH detect karta hai, product hide ho jaata hai)
- Doston se "bas upvote kar do" bolna — unhe kehna site try karo aur honest comment karo
- Multiple accounts banana

---

## STEP 6 — Launch Ke Baad

- [ ] Jo bugs mile unhe fix karo aur comment mein update do
- [ ] PH badge apni site pe lagao (agar top 5 mein aaye)
- [ ] Jo log comment kiye unko thank you bolo
- [ ] 6 mahine baad **dobara launch** kar sakte ho (agar bada update kiya ho)

---

## REALISTIC EXPECTATIONS

Sach ye hai:
- **Top 5 mein aana mushkil hai** — funded startups $$$ marketing lagate hain
- Ek decent launch se **500-3000 visitors** aa sakte hain us din
- Sabse badi value: **backlink** (PH ka domain authority high hai) — ye Google crawling
  ke liye kaam ka hai, jo tumhari abhi ki problem hai
- Traffic 2-3 din mein girega. **Ek din ka event hai, permanent traffic source nahi.**

**Isliye:** PH ko ek **backlink + initial visibility** ke liye karo, "ye sab badal dega"
soch ke nahi.

---

## LAUNCH SE PEHLE FINAL CHECKLIST

- [ ] Account 2-3 hafte purana + kuch activity hai
- [ ] Thumbnail 240x240 ready
- [ ] 4-6 gallery images 1270x760 ready
- [ ] Video YouTube pe (optional)
- [ ] Tagline 60 char ke andar
- [ ] Description 500 char ke andar
- [ ] First comment likha hua ready
- [ ] Site mobile pe test kiya
- [ ] AI background remover test kiya (40MB model download hota hai — slow net pe check karo)
- [ ] Launch din pe 6-8 ghante free ho comments reply karne ke liye
- [ ] Coming Soon teaser 2 hafte pehle live kiya
