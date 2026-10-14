# LUCY OS - TikTok Launch Campaign Brief

Status: DRAFT. Confirmed by owner: market is Ethiopia (international later), budget is zero, canonical domain is 5-cn.net. Items marked ASSUMPTION still need confirmation.

## 1. Campaign Overview

- Name: "Exam Week, Solved"
- Summary: Short vertical demos that show a school director or teacher finishing the work they dread most (marklists, attendance, fee collection) in minutes, ending in a free pilot signup.
- Primary objective: Pilot signups from school decision makers. ASSUMPTION: 25 registered pilot schools in 30 days (calibrate after week 1 data).
- Secondary objectives: grow a TikTok account to a credible base, collect 100 qualified demo or contact requests, build a library of reusable proof clips.

## 2. Target Audience

Market: Ethiopia (confirmed). The product ships Chapa checkout, ETB pricing, and Amharic, Oromo and Tigrinya dictionaries. International expansion comes later.

| Segment | Role | Why they matter | Stage |
|---|---|---|---|
| Primary | Private school owners, directors, principals | Buy the product, pay the subscription | Awareness to consideration |
| Secondary | Teachers, homeroom teachers | Native TikTok users, feel the marklist pain daily, push directors to adopt | Awareness |
| Tertiary | Parents | Pull demand ("why can't my child's school do this"), fee payment convenience | Awareness |

Pain points: exam-week manual grade calculation, lost attendance slips, chasing parents for fees, messaging scattered across group chats, report cards produced by hand.

## 3. Key Messages

Core message: Run your whole school from one place, in your language, and get paid on time.

Supporting messages, each tied to something the product does today:

1. Marklists and report cards without the spreadsheet. Proof: marklist entry, term report, PDF transcript export.
2. Fees collected on the parent's phone. Proof: invoices, Chapa checkout, receipts.
3. Attendance in under a minute, with a scannable student ID. Proof: attendance module, QR verification page.
4. Teachers, parents and students each get their own portal. Proof: role-based dashboards.
5. Works in the languages your school uses. Proof: Amharic, Oromo, Tigrinya, Swahili, French, Spanish, Arabic dictionaries in the language selector.

## 4. Claims Policy (read before filming or writing copy)

TikTok and consumer-protection rules treat unsubstantiated performance claims as misleading advertising. The existing `MARKETING_AND_COMMUNITY_DROPS.md` and pricing page contain claims that are not backed by anything in the codebase.

| Claim | Where it appears | Rule |
|---|---|---|
| "Schools save 40+ admin hours per week" | Deck script | Do not use until measured at a real pilot school |
| "25% higher on-time fee collection" | Deck script | Do not use until measured |
| "99.9% uptime SLA" / "99.99% SLA" | Pricing page | Only advertise if you can measure and honor it |
| "FERPA, GDPR, EDPP aligned" | One-pager | Remove or have counsel confirm; alignment is not compliance |
| "Works on 2G, zero-drop offline sync" | Telegram drop | Test on a real throttled connection before claiming |
| "Cryptographically secure" | One-pager | Replace with specific, true statements (role-based access, per-school data isolation, audit logs) |
| "$149 original price" strikethrough | Pricing page | A reference price nobody paid can be a deceptive discount; remove or document it |
| "Free up to 3 months" vs "120-day trial" | Pricing page | Fixed: the pricing page now says 120-day trial, matching the trial length the code applies |

Safe claim pattern: describe what the product does and show it on screen. Replace numbers with a real pilot result once you have one, with the school's written permission.

## 5. Channel Strategy

| Channel | Role | Effort | Notes |
|---|---|---|---|
| TikTok organic | Awareness, proof | High (video) | 5 posts per week, 3 content pillars |
| Telegram channel | Retention and conversion | Low | Repost clips, answer questions; the Telegram assets already exist |
| Website (`/pricing`, `/register/admin?plan=pilot`) | Conversion | Medium | Needs tracking before launch (section 8) |
| Direct outreach | Convert interested directors | Medium | DM or call every school that engages; B2B school buyers often close in conversation |

Budget: zero (confirmed). The plan is organic-only. Paid TikTok Spark Ads is a later phase, to be funded from pilot-to-paid revenue. Because there is no spend, effort goes into content quality, comment replies, and direct conversations with school owners.

Free levers to use in place of ads:
- Reply-to-comment videos (TikTok shows these to the people who asked)
- Posting in Amharic and Oromo, which large competitors under-serve
- Direct messages to every school, teacher or parent account that engages
- Cross-posting the same clips to Telegram channels, Facebook and YouTube Shorts
- Asking each pilot school for a short on-camera testimonial (with written permission)

## 6. Content Pillars and Scripts

All scripts: 15 to 30 seconds, vertical, captions burned in, shot on a demo school with seeded fictional data. Never film real student names, photos, grades or IDs. Produce each in English first, then Amharic and Oromo voice-over.

### Pillar A - The pain, then the fix

**Script 1: "Exam week, 3 days vs 3 hours"**
- Hook (0-2s): "This is how a teacher calculates 400 report cards." (stack of paper and a calculator)
- Middle: Cut to the marklist screen. Enter scores for one class, totals and ranks compute, tap export, a PDF report card appears.
- Close: "Free pilot for your school. Link in bio."
- On-screen text: "Marklists to report cards. No spreadsheet."

**Script 2: "Where did the attendance slip go?"**
- Hook: Teacher searching a desk for a paper slip.
- Middle: Take attendance on the phone for a class, mark absentees, show the parent notification and the director's dashboard rate updating.
- Close: "Attendance in under a minute. Pilot link in bio."

### Pillar B - Money

**Script 3: "A parent pays school fees from a phone"**
- Hook: "Parents should not have to queue to pay fees."
- Middle: Invoice appears, parent opens checkout, pays through Chapa, receipt appears, director sees the ledger update.
- Close: "Collect fees without chasing anyone."
- Compliance note: use a test-mode payment; blur any real account details.

**Script 4: "Verify a student ID in one scan"**
- Hook: Guard at a gate squinting at a paper ID.
- Middle: Scan the QR on a student card, verification page opens and confirms the student.
- Close: "Every student gets a scannable ID."

### Pillar C - Trust and build-in-public

**Script 5: "Your school, in your language"**
- Hook: "Can your school software speak Amharic?"
- Middle: Switch the language selector between English, Amharic, Oromo and Tigrinya on one dashboard screen.
- Close: "Built for the schools we actually live next to."

**Script 6: "We audited our own security this month"**
- Hook: "Before we asked schools to trust us, we attacked our own app."
- Middle: Text-on-screen list of what was hardened, kept general and true: per-school data isolation checks, role checks on every endpoint, rate limits on public forms, payment confirmation with the gateway. Do not name specific past vulnerabilities.
- Close: "Security is a feature we ship every week."
- Review the final script with whoever owns security before posting.

### Hook bank (rotate across posts)
- "Your marklist should not take three days."
- "Stop chasing parents for tuition."
- "One login for the director, teacher, parent and student."
- "If your school still runs on WhatsApp groups, watch this."
- "What a principal sees at 7 a.m. on LUCY."

## 7. Content Calendar (30 days)

| Week | Posts | Channel | Notes |
|---|---|---|---|
| 0 (prep) | Demo school seeded, tracking live, 6 scripts filmed | - | Do not post until section 8 is done |
| 1 | Scripts 1, 2, 5; hook tests on 2 more cuts | TikTok, Telegram | Learn which hook holds attention past 3s |
| 2 | Scripts 3, 4; reply-to-comment videos | TikTok, Telegram | Start DM outreach to engaged school accounts |
| 3 | Script 6; best-performing script re-cut in Amharic and Oromo | TikTok, Telegram | Keep 20 percent of slots free for reactive content |
| 4 | Founder walkthrough, FAQ answers from comments, first pilot-school story if permitted | TikTok, Telegram | Review results; decide what to repeat |

## 8. Pre-launch Requirements (engineering and ops)

Marketing will send traffic to the site, so these must be true first.

1. Tracking: there is no TikTok Pixel, Events API or UTM capture in the app today. Add the pixel, record `utm_*` and `ttclid` on the pilot registration, and fire a registration event. The enforced Content-Security-Policy in `middleware.ts` does not allow TikTok script or connect hosts, so it must be extended when the pixel is added.
2. Domain: 5-cn.net is canonical and the only domain owned (confirmed). All `lucy-os.com` links in the marketing docs now point to it. Do not publish any `lucy-os.com` link until that domain is purchased.
3. Pricing page: resolve the trial wording and the $149 strikethrough (section 4).
4. Demo tenant: a fictional school with seeded classes, marks, invoices and a QR card, resettable before each shoot.
5. Lead path: confirm `/contact` (the uplink form) and `/register/admin?plan=pilot` work end to end and someone answers within one business day.
6. Privacy: `/privacy`, `/dpa`, `/terms` pages exist; make sure the TikTok pixel and any lead form are disclosed there.
7. Rotate the three leaked API keys and set `CRON_SECRET` (see the security checklist).

## 9. Success Metrics

| Level | Metric | Target (ASSUMPTION, recalibrate after week 1) |
|---|---|---|
| Primary | Registered pilot schools | 25 in 30 days |
| Secondary | Qualified contact or demo requests | 100 |
| Secondary | Average watch time on demo videos | Above 40 percent of video length |
| Secondary | Profile-to-site click rate | Track as baseline in week 1 |
| Secondary | Signup conversion on the pilot page | Track as baseline in week 1 |

Reporting: weekly review of views, watch time, link clicks, signups by `utm_content` (which script), and DM conversations.

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Decision makers are not on TikTok; reach goes to the wrong people | Target teachers and parents for awareness; use DM outreach and Telegram for director conversion |
| Unverified claims get ads rejected or create legal exposure | Follow the claims policy in section 4 |
| Student data appears in a video | Demo tenant only; review every frame before posting |
| Traffic arrives before the product is ready | Complete section 8 first; ship security fixes before launch |
| No budget means slow reach |  Post consistently, reply to every comment, and lean on direct outreach and Telegram |
| Pilot schools churn after 3 months | Plan onboarding calls and a conversion offer before the pilot ends |

## 11. Next Steps

1. Owner confirms: market, budget, timeline, canonical domain, TikTok account handle.
2. Engineering adds pixel, UTM capture and CSP update; fixes pricing page wording.
3. Seed the demo tenant and film Scripts 1, 2 and 5 first.
4. Revisit paid ads only after pilot revenue exists. Until then, the TikTok ads connection is not needed.
