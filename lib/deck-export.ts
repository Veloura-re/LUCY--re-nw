export interface DeckSlideData {
  id: string;
  act: string;
  title: string;
  subtitle: string;
  stats?: Array<{ label: string; value: string; sub?: string }>;
  cards?: Array<{ title: string; desc: string; badge?: string }>;
  personas?: Array<{ role: string; quote: string; problem: string }>;
  comparisons?: Array<{ manual: string; lucy: string }>;
  flywheel?: Array<{ step: string; title: string; desc: string }>;
  speakerNotes: string;
}

export const DECK_SLIDES_EXPORT_DATA: DeckSlideData[] = [
  {
    id: "act_01",
    act: "ACT 01 // THE SILENT TAX ON SCHOOLS",
    title: "The Friction Holding Your Campus Back",
    subtitle: "Behind every great school is an invisible operational tax: hundreds of wasted educator hours, unverified bank receipts, and anxious parents locked in communication blackouts.",
    personas: [
      {
        role: "Senior Faculty (11:45 PM)",
        quote: "I spend 20 hours calculating weighted averages on scratch paper every exam week instead of mentoring students. I haven't slept before 1 AM all term.",
        problem: "40 Hours Monthly Grading Fatigue"
      },
      {
        role: "Anxious Parent (Home)",
        quote: "I pay premium tuition, yet I have zero visibility into my son's daily attendance or test scores until finals are already over.",
        problem: "90-Day Information Blackout"
      },
      {
        role: "School Principal",
        quote: "Our master timetable collapsed twice this term because Room 204 was double-booked for Physics and Chemistry. 45 students had nowhere to sit.",
        problem: "Classroom & Schedule Collisions"
      },
      {
        role: "Finance Director",
        quote: "We spend 4 days matching unverified bank slips across three different banks while tuition arrears compound into uncollected debt.",
        problem: "Revenue Leakage & Manual Slip Chasing"
      }
    ],
    speakerNotes: `Good morning, everyone. Every single morning, hundreds of thousands of students walk through the gates of our schools. Dedicated educators, principals, and families invest everything into education, yet schools run on a massive silent operational tax. Senior faculty calculate grades at midnight, parents are kept in 90-day blackouts, timetables clash in hallways, and finances are lost in unverified paper slips. LUCY eliminates this friction entirely.`
  },
  {
    id: "act_02",
    act: "ACT 02 // THE ARCHITECTURAL SHIFT",
    title: "Software Must Execute The Work, Not Just Host It",
    subtitle: "Scanning paper into PDFs is not innovation. LUCY executes the underlying cognitive workload autonomously—computing weighted marklists, preventing schedule collisions, and streaming live campus telemetry.",
    comparisons: [
      {
        manual: "Faculty members spend 18 hours manually crunching weighted percentages, ranking formulas, and grade curves with a calculator.",
        lucy: "Continuous automated aggregation computes weighted marklists, grade distributions, and student rankings in milliseconds."
      },
      {
        manual: "Administrative staff spend 3 full days printing, sorting, stamping, and manually sealing paper report cards.",
        lucy: "Cryptographically verified, school-branded digital PDF report dossiers generated in 60 seconds with QR verification."
      },
      {
        manual: "Parents endure a 90-day communication blackout, discovering learning obstacles only after term finals are finished.",
        lucy: "Real-time visibility into daily attendance, test scores, homework rosters, and teacher notes on any smartphone."
      }
    ],
    speakerNotes: `Software must eliminate cognitive labor, not just digitize paper forms. Putting a paper form into a PDF is just paper with a backlight. LUCY does the heavy computation: automated marklists, 60-second QR report dossiers, and live smartphone portals.`
  },
  {
    id: "act_03",
    act: "ACT 03 // ACADEMIC INFRASTRUCTURE",
    title: "The 40-Hour Gift to Every Educator",
    subtitle: "When repetitive arithmetic and manual paperwork are automated with 100% mathematical precision, burnout drops, lesson quality surges, and faculty retention climbs.",
    stats: [
      { label: "Monthly Time Reclaimed", value: "40 Hours", sub: "Per faculty member on grading" },
      { label: "Formula Precision", value: "100%", sub: "Zero calculation discrepancies" }
    ],
    cards: [
      {
        title: "Autonomous Marklists",
        desc: "Enter raw scores directly into structured matrices. Weighted totals, grade distributions, and student ranks calculate automatically.",
        badge: "Instant Math"
      },
      {
        title: "60-Second Report Dossiers",
        desc: "Generate elegant, school-branded PDF report cards with QR security stamps and principal signatures for hundreds of scholars in 60 seconds.",
        badge: "60 Seconds"
      }
    ],
    speakerNotes: `Teachers are buried beneath thousands of scores every term. LUCY reclaims 40 hours every month per teacher with 100% mathematical precision and generates report cards in 60 seconds. Rested teachers bring energy back into classrooms.`
  },
  {
    id: "act_04",
    act: "ACT 04 // FAMILY ALIGNMENT",
    title: "Continuous Transparency Builds Fierce Parent Loyalty",
    subtitle: "Eliminate chaotic WhatsApp gossip groups. Empower families with direct, live academic visibility and protect teacher sanity with automated evening quiet hours.",
    stats: [
      { label: "Absence SMS Dispatch", value: "3 Seconds", sub: "Instant notification to parents" },
      { label: "Family Trust Index", value: "98%", sub: "Reported parental satisfaction" }
    ],
    cards: [
      {
        title: "Live Parental Portal",
        desc: "Parents track test grades, lesson pacing, and daily attendance immediately from their smartphones. No more 90-day blackouts.",
        badge: "Real-Time"
      },
      {
        title: "Boundary-Enforced School Chat",
        desc: "Official institutional messaging keeps teacher phone numbers private with automated evening quiet hours to protect faculty wellbeing.",
        badge: "Private & Safe"
      }
    ],
    speakerNotes: `Parent anxiety comes from silence. With LUCY, automated SMS alerts dispatch within 3 seconds of absence, parents track daily progress on mobile, and official messaging protects faculty privacy with evening quiet hours.`
  },
  {
    id: "act_05",
    act: "ACT 05 // CAMPUS OPERATIONS",
    title: "Zero Double-Bookings. Flawless Campus Command.",
    subtitle: "Constraint-satisfaction scheduling that prevents room and teacher clashes, paired with 10-second single-tap roll calls across the entire campus.",
    cards: [
      {
        title: "10-Second Digital Roll Call",
        desc: "Teachers mark present or absent with single-tap rosters, updating school records and parent portals in real time.",
        badge: "Single-Tap Roster"
      },
      {
        title: "Collision-Free Timetables",
        desc: "Intelligent scheduling engine prevents room double-bookings and balances teacher workloads across the campus.",
        badge: "Zero Clashes"
      },
      {
        title: "Structured Curriculum Tracking",
        desc: "Teachers organize curriculum topics and lesson notes in clean digital views for academic coordinators.",
        badge: "Curriculum Sync"
      },
      {
        title: "Paperless Absence Permits",
        desc: "Parents submit medical notes and leave requests directly via smartphone. Approved by principals with a single tap.",
        badge: "Paperless"
      }
    ],
    speakerNotes: `Managing campuses with hundreds of students requires operational precision. LUCY provides 10-second digital roll calls, collision-free master timetables, digital curriculum pacing, and paperless leave requests.`
  },
  {
    id: "act_06",
    act: "ACT 06 // INSTITUTIONAL CAPITAL",
    title: "Instant Mobile Settlement & 100% Ledger Precision",
    subtitle: "Direct Telebirr, CBE Birr, and card payments reconcile automatically. School owners monitor live tuition revenues, arrears, and operating costs.",
    stats: [
      { label: "Faster Fee Collection", value: "25%", sub: "Via automated SMS reminders" },
      { label: "Tuition Record Accuracy", value: "100%", sub: "Zero missing bank slips" }
    ],
    cards: [
      {
        title: "Automated Digital Invoices",
        desc: "Parents settle tuition via Telebirr, CBE Birr, or card, receiving verified digital receipts with instant ledger reconciliation.",
        badge: "Instant Settlement"
      },
      {
        title: "Live Cash-Flow Dashboard",
        desc: "School directors track incoming tuition, pending arrears, and operating expenditures in real time.",
        badge: "Executive View"
      }
    ],
    speakerNotes: `Schools need healthy, predictable cash flow. Automated reminders speed up collections by 25%. Mobile payments via Telebirr and CBE Birr reconcile instantly into digital ledgers with zero unverified bank slips.`
  },
  {
    id: "act_07",
    act: "ACT 07 // STUDENT WELLBEING",
    title: "The Sanctuary: Anonymous Student Mental Health & Safety",
    subtitle: "Scholars in Grades 7–12 cannot excel academically if they are suffering in silence. A protected, zero-doxxing space with real-time PII shields and faculty guidance.",
    cards: [
      {
        title: "Anonymous Peer Uplink",
        desc: "Students discuss academic anxiety and peer pressure with a fellow secondary scholar across the school network without stigma.",
        badge: "Grades 7–12"
      },
      {
        title: "Verified Educator Mentorship",
        desc: "Scholars connect with verified faculty counselors for confidential academic advice and emotional encouragement.",
        badge: "Verified Faculty"
      },
      {
        title: "Real-Time Anti-Doxxing Shields",
        desc: "Automated guardrail engine instantly intercepts and scrubs personal phone numbers, emails, and social media handles.",
        badge: "Anti-Doxxing"
      },
      {
        title: "Ephemeral Privacy & 24/7 Crisis Guard",
        desc: "Sessions dissolve on exit with anti-capture veils and immediate automated routing to 24/7 crisis lifelines. No student is left alone.",
        badge: "Zero Trace"
      }
    ],
    speakerNotes: `Students cannot learn when overwhelmed by stress in silence. The Sanctuary gives secondary students a safe, anonymous peer conversation space, counselor mentorship, real-time PII filters, and 24/7 crisis safety.`
  },
  {
    id: "act_08",
    act: "ACT 08 // ENTERPRISE SECURITY",
    title: "Permanent Cloud Records & Immutable Audit Trails",
    subtitle: "Academic marks and institutional finances protected with cryptographic tenant isolation, role-based boundaries, and zero on-premise hardware costs.",
    stats: [
      { label: "Platform Uptime", value: "99.9%", sub: "High-availability cloud" },
      { label: "Server Hardware Cost", value: "$0", sub: "Zero local server overhead" }
    ],
    cards: [
      {
        title: "Cryptographic Audit Ledger",
        desc: "Every mark entry, fee adjustment, and record modification is permanently logged with exact user attribution and timestamps.",
        badge: "100% Traceable"
      },
      {
        title: "Encrypted Hourly Snapshots",
        desc: "Runs securely in the cloud on any device. Hourly cloud snapshots protect against hardware failures or physical fire damage.",
        badge: "AES-256 Cloud"
      }
    ],
    speakerNotes: `Academic and financial records are sacred institutional assets. LUCY provides 99.9% uptime, zero hardware costs, cryptographic multi-tenant isolation, and immutable audit logs.`
  },
  {
    id: "act_09",
    act: "ACT 09 // THE MULTIPLIER EFFECT",
    title: "The Flywheel: How Modern Campuses Dominate Their Market",
    subtitle: "When operational friction disappears, a compounding cycle of teacher energy, parent loyalty, and student achievement turns a campus into a market leader.",
    flywheel: [
      { step: "01", title: "Zero-Friction Operations", desc: "Automating repetitive workflows reclaims dozens of hours every week for teachers and administrators." },
      { step: "02", title: "Energized Faculty", desc: "Educators invest reclaimed energy into richer lesson pacing and individualized student mentorship." },
      { step: "03", title: "Continuous Transparency", desc: "Live parent portals build deep, enduring institutional trust and eliminate communication blackouts." },
      { step: "04", title: "Thriving Scholars", desc: "Students feel safe, valued, and motivated—accelerating exam performance and emotional wellbeing." },
      { step: "05", title: "Campus Market Dominance", desc: "Exceptional parent loyalty and academic prestige drive word-of-mouth waitlists and enrollment growth." }
    ],
    speakerNotes: `When operational friction is eliminated, a compounding flywheel begins: clear operations lead to energized teachers, transparent parent trust, thriving students, and campus enrollment growth.`
  },
  {
    id: "act_10",
    act: "ACT 10 // THE PARTNERSHIP MANDATE",
    title: "Deploy Across Your Campus: 4 Months Free",
    subtitle: "Experience the entire LUCY operating system across your entire school for a full academic term—with zero risk, zero hardware, and complete hands-on onboarding.",
    stats: [
      { label: "Free Trial Duration", value: "4 Months", sub: "Full academic term" },
      { label: "Hardware Required", value: "$0", sub: "Cloud native on any device" }
    ],
    cards: [
      {
        title: "Unlimited Institutional Access",
        desc: "Complete access for all directors, teachers, parents, and students with zero per-user fees during your trial term.",
        badge: "Unlimited"
      },
      {
        title: "15-Minute Campus Activation",
        desc: "White-glove data migration, staff orientation, and parent portal activation handled by our dedicated technical support team.",
        badge: "White Glove"
      }
    ],
    speakerNotes: `We are offering a complete 4-month free trial—an entire academic term—with unlimited accounts, zero server hardware, and full onboarding support. Partner with LUCY to lead the future of education.`
  }
];

/**
 * Generate and download PowerPoint (.pptx) with animations and speaker notes
 */
export async function downloadDeckAsPPTX() {
  const pptxgenModule = await import("pptxgenjs");
  const PptxGen = (pptxgenModule.default || pptxgenModule) as any;
  const pres = new PptxGen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "LUCY OS";
  pres.company = "LUCY Institutional Education Systems";
  pres.title = "LUCY OS - Keynote Stage Presentation";

  // Define Colors
  const BG_COLOR = "0A0F1D";
  const CARD_BG = "131D31";
  const CARD_BORDER = "1E2D4A";
  const EMERALD = "10B981";
  const EMERALD_BG = "064E3B";
  const TEXT_WHITE = "FFFFFF";
  const TEXT_MUTED = "94A3B8";
  const ACCENT_ROSE = "F43F5E";

  DECK_SLIDES_EXPORT_DATA.forEach((slideData) => {
    const slide = pres.addSlide();
    slide.background = { color: BG_COLOR };

    // Slide Transition Animation (Supported across Microsoft PowerPoint & Keynote)
    // Uses Fade Transition
    (slide as any).transition = { type: "fade", duration: 0.5 };

    // Speaker Notes attached to the slide
    slide.addNotes(slideData.speakerNotes);

    // Top Tag Badge
    slide.addText(slideData.act, {
      x: 0.8,
      y: 0.5,
      w: 8.5,
      h: 0.35,
      fontSize: 11,
      fontFace: "Arial",
      bold: true,
      color: EMERALD,
      charSpacing: 3
    });

    // Main Slide Title
    slide.addText(slideData.title, {
      x: 0.8,
      y: 0.9,
      w: 11.5,
      h: 0.7,
      fontSize: 26,
      fontFace: "Arial",
      bold: true,
      color: TEXT_WHITE
    });

    // Subtitle
    slide.addText(slideData.subtitle, {
      x: 0.8,
      y: 1.65,
      w: 11.5,
      h: 0.65,
      fontSize: 13,
      fontFace: "Arial",
      color: TEXT_MUTED,
      lineSpacing: 18
    });

    // Content: Personas
    if (slideData.personas) {
      slideData.personas.forEach((p, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cardX = 0.8 + col * 5.9;
        const cardY = 2.45 + row * 2.2;

        slide.addShape(pres.ShapeType.roundRect, {
          x: cardX,
          y: cardY,
          w: 5.7,
          h: 2.05,
          rectRadius: 0.15,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1.5 }
        });

        slide.addText(p.role.toUpperCase(), {
          x: cardX + 0.3,
          y: cardY + 0.2,
          w: 5.1,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: ACCENT_ROSE
        });

        slide.addText(`"${p.quote}"`, {
          x: cardX + 0.3,
          y: cardY + 0.55,
          w: 5.1,
          h: 0.9,
          fontSize: 11,
          italic: true,
          color: TEXT_WHITE,
          lineSpacing: 16
        });

        slide.addText(`PAIN: ${p.problem.toUpperCase()}`, {
          x: cardX + 0.3,
          y: cardY + 1.55,
          w: 5.1,
          h: 0.3,
          fontSize: 9,
          bold: true,
          color: EMERALD
        });
      });
    }

    // Content: Comparisons (Old Way vs LUCY)
    if (slideData.comparisons) {
      slideData.comparisons.forEach((comp, idx) => {
        const rowY = 2.5 + idx * 1.5;

        // Legacy Box
        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.8,
          y: rowY,
          w: 5.7,
          h: 1.35,
          rectRadius: 0.15,
          fill: { color: "1E131D" },
          line: { color: "4A1E2D", width: 1.5 }
        });

        slide.addText(`[LEGACY STRAIN] ${comp.manual}`, {
          x: 1.1,
          y: rowY + 0.15,
          w: 5.1,
          h: 1.05,
          fontSize: 11,
          color: "FCA5A5",
          lineSpacing: 16
        });

        // LUCY Box
        slide.addShape(pres.ShapeType.roundRect, {
          x: 6.7,
          y: rowY,
          w: 5.7,
          h: 1.35,
          rectRadius: 0.15,
          fill: { color: EMERALD_BG },
          line: { color: EMERALD, width: 1.5 }
        });

        slide.addText(`[LUCY OS] ${comp.lucy}`, {
          x: 7.0,
          y: rowY + 0.15,
          w: 5.1,
          h: 1.05,
          fontSize: 11,
          bold: true,
          color: "D1FAE5",
          lineSpacing: 16
        });
      });
    }

    // Content: Stats & Cards
    if (slideData.stats && slideData.cards) {
      // Stats Top Row
      slideData.stats.forEach((st, idx) => {
        const statX = 0.8 + idx * 5.9;
        slide.addShape(pres.ShapeType.roundRect, {
          x: statX,
          y: 2.45,
          w: 5.7,
          h: 1.5,
          rectRadius: 0.15,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1.5 }
        });

        slide.addText(st.value, {
          x: statX + 0.3,
          y: 2.55,
          w: 5.1,
          h: 0.65,
          fontSize: 32,
          bold: true,
          color: EMERALD
        });

        slide.addText(st.label.toUpperCase(), {
          x: statX + 0.3,
          y: 3.25,
          w: 5.1,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: TEXT_WHITE
        });

        if (st.sub) {
          slide.addText(st.sub, {
            x: statX + 0.3,
            y: 3.55,
            w: 5.1,
            h: 0.25,
            fontSize: 9,
            color: TEXT_MUTED
          });
        }
      });

      // Cards Bottom Row
      slideData.cards.forEach((card, idx) => {
        const cardX = 0.8 + idx * 5.9;
        slide.addShape(pres.ShapeType.roundRect, {
          x: cardX,
          y: 4.15,
          w: 5.7,
          h: 2.45,
          rectRadius: 0.15,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1.5 }
        });

        if (card.badge) {
          slide.addText(card.badge.toUpperCase(), {
            x: cardX + 0.3,
            y: 4.35,
            w: 5.1,
            h: 0.3,
            fontSize: 10,
            bold: true,
            color: EMERALD
          });
        }

        slide.addText(card.title, {
          x: cardX + 0.3,
          y: 4.7,
          w: 5.1,
          h: 0.45,
          fontSize: 14,
          bold: true,
          color: TEXT_WHITE
        });

        slide.addText(card.desc, {
          x: cardX + 0.3,
          y: 5.2,
          w: 5.1,
          h: 1.2,
          fontSize: 11,
          color: TEXT_MUTED,
          lineSpacing: 16
        });
      });
    }

    // Content: Cards Only (e.g. 4 cards grid)
    if (!slideData.stats && slideData.cards) {
      slideData.cards.forEach((card, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cardX = 0.8 + col * 5.9;
        const cardY = 2.45 + row * 2.15;

        slide.addShape(pres.ShapeType.roundRect, {
          x: cardX,
          y: cardY,
          w: 5.7,
          h: 2.0,
          rectRadius: 0.15,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1.5 }
        });

        if (card.badge) {
          slide.addText(card.badge.toUpperCase(), {
            x: cardX + 0.3,
            y: cardY + 0.2,
            w: 5.1,
            h: 0.3,
            fontSize: 10,
            bold: true,
            color: EMERALD
          });
        }

        slide.addText(card.title, {
          x: cardX + 0.3,
          y: cardY + 0.55,
          w: 5.1,
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: TEXT_WHITE
        });

        slide.addText(card.desc, {
          x: cardX + 0.3,
          y: cardY + 1.0,
          w: 5.1,
          h: 0.85,
          fontSize: 11,
          color: TEXT_MUTED,
          lineSpacing: 16
        });
      });
    }

    // Content: Flywheel Steps
    if (slideData.flywheel) {
      slideData.flywheel.forEach((step, idx) => {
        const stepY = 2.45 + idx * 0.85;

        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.8,
          y: stepY,
          w: 11.6,
          h: 0.75,
          rectRadius: 0.1,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 }
        });

        slide.addText(step.step, {
          x: 1.0,
          y: stepY + 0.12,
          w: 0.6,
          h: 0.5,
          fontSize: 14,
          bold: true,
          color: EMERALD
        });

        slide.addText(step.title.toUpperCase(), {
          x: 1.8,
          y: stepY + 0.12,
          w: 3.5,
          h: 0.5,
          fontSize: 11,
          bold: true,
          color: TEXT_WHITE
        });

        slide.addText(step.desc, {
          x: 5.4,
          y: stepY + 0.12,
          w: 6.8,
          h: 0.5,
          fontSize: 10,
          color: TEXT_MUTED
        });
      });
    }

    // Footer
    slide.addText("LUCY OS // INSTITUTIONAL KEYNOTE", {
      x: 0.8,
      y: 7.0,
      w: 8.0,
      h: 0.3,
      fontSize: 9,
      color: "475569"
    });
  });

  await pres.writeFile({ fileName: "LUCY_OS_Keynote_Presentation.pptx" });
}

/**
 * Generate and download PDF (.pdf) with dark stage styling and full typography
 */
export async function downloadDeckAsPDF() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4" // 297mm x 210mm
  });

  const pageWidth = 297;
  const pageHeight = 210;

  DECK_SLIDES_EXPORT_DATA.forEach((slide, idx) => {
    if (idx > 0) doc.addPage("a4", "landscape");

    // Dark Background
    doc.setFillColor(10, 15, 29);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Emerald Tag
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text(slide.act, 20, 18);

    // Main Title
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(slide.title, 20, 28);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184);
    const splitSub = doc.splitTextToSize(slide.subtitle, 257);
    doc.text(splitSub, 20, 36);

    let startY = 54;

    // Personas
    if (slide.personas) {
      slide.personas.forEach((p, pIdx) => {
        const col = pIdx % 2;
        const row = Math.floor(pIdx / 2);
        const cardX = 20 + col * 130;
        const cardY = startY + row * 62;

        doc.setFillColor(19, 29, 49);
        doc.setDrawColor(30, 45, 74);
        doc.roundedRect(cardX, cardY, 125, 56, 4, 4, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(244, 63, 94);
        doc.text(p.role.toUpperCase(), cardX + 6, cardY + 10);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        const splitQuote = doc.splitTextToSize(`"${p.quote}"`, 113);
        doc.text(splitQuote, cardX + 6, cardY + 20);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 185, 129);
        doc.text(`PAIN: ${p.problem.toUpperCase()}`, cardX + 6, cardY + 48);
      });
    }

    // Comparisons
    if (slide.comparisons) {
      slide.comparisons.forEach((comp, cIdx) => {
        const rowY = startY + cIdx * 42;

        // Legacy
        doc.setFillColor(30, 19, 29);
        doc.setDrawColor(74, 30, 45);
        doc.roundedRect(20, rowY, 125, 36, 4, 4, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(244, 63, 94);
        doc.text("[LEGACY STRAIN]", 26, rowY + 10);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(252, 165, 165);
        const splitMan = doc.splitTextToSize(comp.manual, 113);
        doc.text(splitMan, 26, rowY + 18);

        // LUCY
        doc.setFillColor(6, 78, 59);
        doc.setDrawColor(16, 185, 129);
        doc.roundedRect(150, rowY, 127, 36, 4, 4, "FD");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text("[LUCY OS]", 156, rowY + 10);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(209, 250, 229);
        const splitLucy = doc.splitTextToSize(comp.lucy, 115);
        doc.text(splitLucy, 156, rowY + 18);
      });
    }

    // Stats & Cards
    if (slide.stats && slide.cards) {
      slide.stats.forEach((st, sIdx) => {
        const statX = 20 + sIdx * 130;
        doc.setFillColor(19, 29, 49);
        doc.setDrawColor(30, 45, 74);
        doc.roundedRect(statX, startY, 125, 38, 4, 4, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129);
        doc.text(st.value, statX + 8, startY + 16);

        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(st.label.toUpperCase(), statX + 8, startY + 26);

        if (st.sub) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text(st.sub, statX + 8, startY + 33);
        }
      });

      slide.cards.forEach((card, cdIdx) => {
        const cardX = 20 + cdIdx * 130;
        const cardY = startY + 44;

        doc.setFillColor(19, 29, 49);
        doc.setDrawColor(30, 45, 74);
        doc.roundedRect(cardX, cardY, 125, 68, 4, 4, "FD");

        if (card.badge) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(16, 185, 129);
          doc.text(card.badge.toUpperCase(), cardX + 8, cardY + 12);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text(card.title, cardX + 8, cardY + 22);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        const splitDesc = doc.splitTextToSize(card.desc, 109);
        doc.text(splitDesc, cardX + 8, cardY + 32);
      });
    }

    // Cards Only (4 cards)
    if (!slide.stats && slide.cards) {
      slide.cards.forEach((card, cdIdx) => {
        const col = cdIdx % 2;
        const row = Math.floor(cdIdx / 2);
        const cardX = 20 + col * 130;
        const cardY = startY + row * 62;

        doc.setFillColor(19, 29, 49);
        doc.setDrawColor(30, 45, 74);
        doc.roundedRect(cardX, cardY, 125, 56, 4, 4, "FD");

        if (card.badge) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(16, 185, 129);
          doc.text(card.badge.toUpperCase(), cardX + 8, cardY + 10);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text(card.title, cardX + 8, cardY + 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        const splitDesc = doc.splitTextToSize(card.desc, 109);
        doc.text(splitDesc, cardX + 8, cardY + 30);
      });
    }

    // Flywheel
    if (slide.flywheel) {
      slide.flywheel.forEach((step, sIdx) => {
        const stepY = startY + sIdx * 25;
        doc.setFillColor(19, 29, 49);
        doc.setDrawColor(30, 45, 74);
        doc.roundedRect(20, stepY, 257, 21, 3, 3, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(16, 185, 129);
        doc.text(step.step, 28, stepY + 14);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(step.title.toUpperCase(), 46, stepY + 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(148, 163, 184);
        doc.text(step.desc, 120, stepY + 14);
      });
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("LUCY OS // INSTITUTIONAL PRESENTATION", 20, 202);
    doc.text(`SLIDE ${idx + 1} OF ${DECK_SLIDES_EXPORT_DATA.length}`, 240, 202);
  });

  doc.save("LUCY_OS_Keynote_Presentation.pdf");
}
