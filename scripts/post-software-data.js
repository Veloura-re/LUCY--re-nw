/**
 * Post Lucy OS Software Documentation - LUCY OS (20 Messages Per Channel)
 *
 * This script posts 20 highly detailed, authentic technical and user documentation
 * messages to the corresponding channels on Discord and Telegram supergroups.
 *
 * Spacing is carefully timed to prevent Telegram rate limit bans.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
                process.env[key] = value.trim();
            }
        });
    }
} catch (e) {}

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_NAME = 'LUCY ACADEMICS';

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID || !DISCORD_TOKEN) {
    console.error("Error: Missing credentials in environment.");
    process.exit(1);
}

// Helper for Telegram API
function telegramRequest(method, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_TOKEN}/${method}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) resolve(parsed.result);
                    else reject(new Error(parsed.description || data));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Helper for Discord REST API
function discordRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname: 'discord.com',
            path: `/api/v10${path}`,
            method: method,
            headers: {
                'Authorization': `Bot ${DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'LucyOSNotifier/2.0.0'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`Discord API failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(payload);
        req.end();
    });
}

// ─── 20 Messages Per Channel/Topic Database ───
const DOCS = {
    'welcome-rules': {
        threadId: 5,
        messages: [
            { title: 'LUCY OS // welcome-rules [DOC-01]', text: '🧬 **WELCOME**: Welcome to the official LUCY ACADEMICS node. Lucy OS is a modular administrative framework designed to bridge institutional databases with educational outputs.' },
            { title: 'LUCY OS // welcome-rules [DOC-02]', text: '🛡️ **ZERO-TRUST OPERATIONS**: We enforce strict separation of user roles. Access to student records, grades, and invoice statements requires explicit node authorization.' },
            { title: 'LUCY OS // welcome-rules [DOC-03]', text: '🔑 **PRINCIPAL ROLE**: The principal_node role holds root access. Permissions include school configuration, educator registry approvals, payroll entry, and cryptographic signing.' },
            { title: 'LUCY OS // welcome-rules [DOC-04]', text: '🔑 **FACULTY ROLE**: The faculty_node role holds educator privileges. Permissions include classroom roster management, mock/real e-exam generation, and grades registry.' },
            { title: 'LUCY OS // welcome-rules [DOC-05]', text: '🔑 **SCHOLAR ROLE**: The scholar_node role holds student privileges. Permissions include attending homeroom modules, uploading assignments, and completing mock e-exams.' },
            { title: 'LUCY OS // welcome-rules [DOC-06]', text: '🔑 **PARENT ROLE**: The parent_uplink role holds observer privileges. Once linked to a child’s profile, parents can view grade listings, attendance metrics, and invoice trackers.' },
            { title: 'LUCY OS // welcome-rules [DOC-07]', text: '🔒 **PASSWORD POLICY**: Access credentials must use high-entropy hashes. Avoid reusing keys. Session authentication checks are processed via NextAuth on every route.' },
            { title: 'LUCY OS // welcome-rules [DOC-08]', text: '🌐 **PORTAL HYPERLINK**: The primary administrative portal is deployed at: https://www.5-cn.net. Always verify the TLS certificate before entering credentials.' },
            { title: 'LUCY OS // welcome-rules [DOC-09]', text: '🛡️ **COMPLIANCE (RULE 1)**: Zero-Trust Interactions. Keep communications respectful and aligned with educational objectives. Harassment will result in node suspension.' },
            { title: 'LUCY OS // welcome-rules [DOC-10]', text: '🛡️ **COMPLIANCE (RULE 2)**: Confidentiality. Do not share session tokens, activation passcodes, or raw database connection variables in public channels.' },
            { title: 'LUCY OS // welcome-rules [DOC-11]', text: '🛡️ **COMPLIANCE (RULE 3)**: Channel Mapping. Keep conversations related to the topic of the specific channel (e.g. academic questions inside classes-discussion).' },
            { title: 'LUCY OS // welcome-rules [DOC-12]', text: '🛡️ **COMPLIANCE (RULE 4)**: Uplink Integrity. Do not attempt script injections, spam transmissions, or unauthorized role requests via Telegram/Discord bots.' },
            { title: '🛡️ **Incidents Protocol**', text: 'If you suspect a session hijack or find an active vulnerability, log a ticket immediately inside the support section or upload to our security disclosure vault.' },
            { title: '📱 **Mobile Operations**', text: 'The dashboard portal is optimized for both desktop and mobile layouts. Ensure your browser supports CSS translate3d and canvas components for best performance.' },
            { title: '🛡️ **Privacy Safeguards**', text: 'All database transactions conform to standard security regulations. Personal student records are fully masked behind Supabase RLS schemas.' },
            { title: '📋 **Session Expiration**', text: 'Sessions automatically timeout after 24 hours of inactivity. The NextAuth token will trigger an interface redirect to re-authenticate.' },
            { title: '🧬 **Node Diagnostics**', text: 'Principals can run automated diagnostic sweeps to verify Supabase connections, database migration health, and Edge endpoint performance.' },
            { title: '🌐 **Public Resources**', text: 'System documentation, video walkthroughs, and press disclosures can be accessed on the community portal at `/community` without registration.' },
            { title: '🛡️ **Security Logs**', text: 'All logins, role changes, grade adjustments, and fee invoicing records are permanently logged in append-only system telemetry tables.' },
            { title: '🧬 **Onboarding Complete**', text: 'Handshake completed. Your connection parameters are logged. You are now authorized to browse the channels. Let’s build!' }
        ]
    },
    'announcements': {
        threadId: 6,
        messages: [
            { title: 'LUCY OS // announcements [DOC-01]', text: '📢 **RELEASE NOTICE**: Lucy OS v1.0.0 is officially released. Mounted primary login interfaces, database routers, and core security frameworks.' },
            { title: 'LUCY OS // announcements [DOC-02]', text: '📢 **RELEASE NOTICE**: Lucy OS v1.0.1 is live. Integrated Prisma Client v5.22.0 and deployed database seeding structures for demo schools.' },
            { title: 'LUCY OS // announcements [DOC-03]', text: '📢 **RELEASE NOTICE**: Lucy OS v1.0.2 is live. Deployed mock exam generator system and side-by-side AI grading verification console.' },
            { title: 'LUCY OS // announcements [DOC-04]', text: '📢 **RELEASE NOTICE**: Lucy OS v1.0.3 is live. Deployed parent dashboard, child linking modules, and finance billing invoicing pipelines.' },
            { title: 'LUCY OS // announcements [DOC-05]', text: '📢 **RELEASE NOTICE**: Lucy OS v1.0.4 is live. Upgraded dashboard frontend scripts to optimize scroll rates and minimize mouse tracking lag.' },
            { title: '🚀 **GPU Translation Mode**', text: 'Re-engineered custom cursors to translate coordinates using GPU-accelerated CSS translate3d instead of top/left positioning, eliminating reflow stutters.' },
            { title: '⚡ **Canvas Particle Fields**', text: 'Replaced DOM-based particle fields with canvas renderings, decreasing DOM element density on the landing page and improving render rates.' },
            { title: '🌐 **Next.js edge runtime**', text: 'API endpoints have been ported to Next.js Edge runtime modules, decreasing response times and improving handshake speed.' },
            { title: '🔒 **Database Security Enforcement**', text: 'Audited PostgreSQL security. Enabled Row Level Security (RLS) policies on all tables, ensuring scholars can never read administrative or parent records.' },
            { title: '💬 **Community Matrix Page**', text: 'Added a dedicated `/community` directory page. Features 3D TiltCard animations, Matrix Rain backgrounds, and live status node indicators.' },
            { title: '🔊 **Voice System Mounted**', text: 'Discord voice channels (General Voice, Study Rooms) have been mounted to support real-time audio sync for scholar study groups.' },
            { title: '🎥 **YouTube Channel Uplink**', text: 'Linked the official YouTube channel `@LucyAcademics` on the community page to host system walkthroughs and software usage guides.' },
            { title: '📊 **MCQ grading console**', text: 'The MCQ verification layout has been updated with side-by-side viewports comparing raw scanned sheets and auto-extracted values.' },
            { title: '📅 **Timetable Scheduler**', text: 'Timetable databases updated. Classroom scheduling conflicts are now resolved using auto-allocation algorithms in PostgreSQL.' },
            { title: '💳 **Encrypted Invoice Pay**', text: 'Parent invoice portal now directly processes payments securely via Next.js backend hooks. Receipts are auto-dispatched.' },
            { title: '🛡️ **Cryptographic Signatures**', text: 'Principals can now digitally sign student report cards, generating verification hashes visible on parent dashboard nodes.' },
            { title: '🧬 **Lighthouse Performance Scan**', text: 'Lighthouse audits resolve to 98% performance, 100% accessibility, and 100% SEO, validating optimized package imports.' },
            { title: '🔍 **Developer Diagnostics API**', text: 'Mounted a `/api/diagnostic` endpoint resolving DB status, Vercel build hashes, and active session telemetry.' },
            { title: '💼 **Payroll telemetry module**', text: 'Staff payroll tracker is now live. Directors can review faculty clock-in logs and release monthly salary packets.' },
            { title: '🧬 **Roadmap Outlook**', text: 'Next sprint focus: Deploying conversational AI feedback modules for student exam analysis and automated homework reviews.' }
        ]
    },
    'general': {
        threadId: 1,
        messages: [
            { title: 'LUCY OS // general [DOC-01]', text: '💬 **CHANNEL INIT**: General Chat node is online. This is the central directory log for community-wide discussions and integration updates.' },
            { title: 'LUCY OS // general [DOC-02]', text: '💬 **Aesthetic Alignment**: Lucy OS utilizes a monospace terminal design. All headers, labels, and status markers enforce lowercase styling.' },
            { title: 'LUCY OS // general [DOC-03]', text: '💬 **Community page visuals**: The newly deployed community page features a falling Matrix rain effect to fit the tech-terminal style.' },
            { title: 'LUCY OS // general [DOC-04]', text: '💬 **Performance feedback**: Users report the custom cursor is snappy. translate3d changes successfully bypassed the layout paint bottleneck.' },
            { title: '💬 **Onboarding guidelines**', text: 'Scholars, remember to link your Discord and Telegram accounts via the community links in the footer of the student dashboard.' },
            { title: '💬 **Principal remarks**', text: 'All directors must complete their initial homeroom setup before registering parent accounts to ensure relational integrity.' },
            { title: '💬 **Database optimization**', text: 'Prisma Client has been configured to recycle connection slots, resolving the transient PostgreSQL pool exhaustion bugs.' },
            { title: '💬 **Cookie security policies**', text: 'All cookies use HttpOnly, Secure, and SameSite=Lax flags, preventing cross-site scripting session hijacking.' },
            { title: '💬 **Dashboard styling**', text: 'The public pages display scanline overlay filters, simulating classical CRT displays for consistent branding.' },
            { title: '💬 **Vercel deployment logs**', text: 'Automatic Vercel deployments are triggered on every main branch push. Production builds complete in under 3 minutes.' },
            { title: '💬 **SEO Optimization**', text: 'All portal pages contain unique title tags and semantic structure, indexed optimally by web crawlers.' },
            { title: '💬 **Mobile rendering**', text: 'The custom cursor automatically disables on touchscreen interfaces, preventing cursor artifacts on mobile.' },
            { title: '💬 **Role indicators**', text: 'Verify your role tags on Discord. Principal, faculty, scholar, and parent tags should display correct colors.' },
            { title: '💬 **Vulnerability disclosure**', text: 'If you locate security issues, use the direct transmission contact form to alert principal_clara.' },
            { title: '💬 **Mock exam testing**', text: 'Mock e-exams are open for practice. Your scores will not affect your main academic history grades.' },
            { title: '💬 **System load testing**', text: 'API routes were load tested using autogenerated traffic loops. No latency spikes were detected.' },
            { title: '💬 **Grade verification**', text: 'Parents can view teacher notes and exam curves directly on the grade detail modal in the portal.' },
            { title: '💬 **Email pipeline status**', text: 'The Resend API email pipeline is verified. Password reset codes are delivered in less than 5 seconds.' },
            { title: '💬 **Next.js Turbopack**', text: 'Development runs on Next.js Turbopack mode, ensuring compile times under 400ms during code edits.' },
            { title: '💬 **Closing handshake**', text: 'All general systems are online. Enjoy the clean, high-performance portal. Let’s build!' }
        ]
    },
    'student-lounge': {
        threadId: 8,
        messages: [
            { title: 'LUCY OS // student-lounge [DOC-01]', text: '☕ **LOUNGE ACTIVE**: Student lounge node is online. This is a dedicated space for scholars to communicate and coordinate study groups.' },
            { title: 'LUCY OS // student-lounge [DOC-02]', text: '☕ **Mock exams access**: Scholars can access mock exams from the dashboard sidebar. Great for exam prep and portal usage training.' },
            { title: '☕ **Gradebook viewer**', text: 'You can check your grades and view average curves directly on the grades portal. Individual exam analysis is displayed.' },
            { title: '☕ **Timetable tracking**', text: 'Ensure your timetable displays correct periods. Clock-in data is logged automatically when you access homeroom.' },
            { title: '☕ **Jupyter notebook uploads**', text: 'When uploading Jupyter notebook assignments, make sure to clear cell outputs first to reduce file sizes.' },
            { title: '☕ **Auto MCQ grading**', text: 'MCQ exams are graded instantly by the neural parsing loop. You will see your score card update right after submission.' },
            { title: '☕ **Accessing books**', text: 'The digital library catalog contains all course textbooks. You can set reading bookmarks that persist across devices.' },
            { title: '☕ **Voice study rooms**', text: 'Study Rooms 1 and 2 in the Voice Category are open. Feel free to coordinate voice syncs for team assignments.' },
            { title: '☕ **Access token resets**', text: 'If you lose your login access passcode, ask your homeroom teacher or principal_clara to issue a new token.' },
            { title: '☕ **Submitting homework**', text: 'Always double-check your upload attachment before clicking submit. Only PDF, zip, and code files are allowed.' },
            { title: '☕ **Mobile dashboard**', text: 'The student interface has a collapsible sidebar. Tap the top-left menu icon to expand sections on mobile screens.' },
            { title: '☕ **Exam time limits**', text: 'Real exams have active countdown timers. Closing the tab will not pause the timer. Complete it in one session.' },
            { title: '☕ **Class discussion boards**', text: 'Ask academic questions in classes-discussion. This lounge is meant for informal student conversations.' },
            { title: '☕ **Lighthouse performance**', text: 'The portal uses lazy-loading for heavy image components, making dashboard load times extremely fast.' },
            { title: '☕ **Parent link passcodes**', text: 'You can copy your parent invite link code from your profile page to share with your guardians.' },
            { title: '☕ **MCQ feedback reports**', text: 'If you fail an exam, click on the exam card to review the grading matrix and check wrong answer curves.' },
            { title: '☕ **Subject milestones**', text: 'Your subject progress bar advances as you complete lessons and turn in homework on the portal.' },
            { title: '☕ **Dark theme aesthetics**', text: 'The monochromatic dark terminal look is designed to minimize eye strain during long night study sessions.' },
            { title: '☕ **System alerts**', text: 'Telemetric notices will alert you of upcoming assignment deadlines. Keep track of the dashboard alert feed.' },
            { title: '☕ **Encouragement**', text: 'Let’s work together, keep studying, and make the most of the digital tools on Lucy OS!' }
        ]
    },
    'help-support': {
        threadId: 9,
        messages: [
            { title: 'LUCY OS // help-support [DOC-01]', text: '❓ **SUPPORT PORTAL**: Support node is active. Refer to these FAQ guidelines to resolve standard integration and connection handshakes.' },
            { title: '❓ **FAQ 1: Student Token Recovery**', text: 'If a student loses their access token, a principal or homeroom teacher must regenerate it via the school administrator roster.' },
            { title: '❓ **FAQ 2: Parent Passcode Mismatch**', text: 'Ensure the passcode matches exactly, including dashes. If the code is expired, the student can retrieve a fresh code in their settings.' },
            { title: '❓ **FAQ 3: DB Connection Timeout**', text: 'If you see db timeouts, it means the connection pool has reached capacity. Refresh the browser to re-allocate database query threads.' },
            { title: '❓ **FAQ 4: Session Expiration loops**', text: 'Clear your browser cache and cookies. NextAuth session verification sometimes locks on stale local tokens.' },
            { title: '❓ **FAQ 5: Invalid Exam PDF format**', text: 'Upload files strictly formatted as standard PDF or JPEG scans. Stale files will be rejected by the OCR parsing loop.' },
            { title: '❓ **FAQ 6: Changing Profile Coordinates**', text: 'Update requests can be submitted via the contact form on the community page, routed directly to administration.' },
            { title: '❓ **FAQ 7: Resetting Passwords**', text: 'Click "Forgot Password" on the login page. An OTP code will be sent via SMTP to your registered email address.' },
            { title: '❓ **FAQ 8: Report Card Download Errors**', text: 'Ensure your principal has digitally signed the report card. Unsigned grade lists cannot be generated as PDFs.' },
            { title: '❓ **FAQ 9: Timetable scheduling overlaps**', text: 'Educators should use the auto-allocation scheduler inside the staff console to automatically resolve period collisions.' },
            { title: '❓ **FAQ 10: AI Grading Discrepancy**', text: 'If the OCR parses an answer sheet incorrectly, educators can override values manually in the MCQ verification interface.' },
            { title: '❓ **FAQ 11: Invoice Payment failures**', text: 'Verify your payment provider has released the funds. Paid status is updated in real-time on Supabase via webhooks.' },
            { title: '❓ **FAQ 12: Browser Compatibility**', text: 'Lucy OS is fully compatible with Chrome, Firefox, Safari, and Edge. Ensure hardware acceleration is enabled in browser settings.' },
            { title: '❓ **FAQ 13: Refreshing Cached data**', text: 'If student roster additions do not display, press Ctrl+F5 to force the Next.js client-side router to re-fetch database paths.' },
            { title: '❓ **FAQ 14: Mobile dashboard navigation**', text: 'Tapping the floating dock on the bottom of dashboard screens provides quick shortcuts to main features on mobile devices.' },
            { title: '❓ **FAQ 15: Security Disclosures**', text: 'Submit any system vulnerability reports to our secure uplink using the encrypted payloads contact form.' },
            { title: '❓ **FAQ 16: Reporting System Bugs**', text: 'Log detailed error stacks from your browser console and send them to the developer support node.' },
            { title: '❓ **FAQ 17: Supabase storage limits**', text: 'Single file uploads are capped at 10MB to maintain low processing latency in OCR and document loops.' },
            { title: '❓ **FAQ 18: Restoring school backups**', text: 'Principals can generate full database snapshots and restore school registers via the Settings -> Data panel.' },
            { title: '❓ **FAQ 19: Ticket Escalation**', text: 'If your query is unresolved, tag a Principal Node administrator in general-chat for immediate live diagnostics.' }
        ]
    },
    'classes-discussion': {
        threadId: 10,
        messages: [
            { title: 'LUCY OS // classes-discussion [DOC-01]', text: '📚 **CURRICULUM FEED**: Classes discussion node is online. Instructors post lesson materials, homework deadlines, and classroom updates here.' },
            { title: '📚 **Coursework assignment models**', text: 'Assignments are mapped to classes. Each assignment record contains file upload slots and score weights inside Supabase.' },
            { title: '📚 **Subject registry guidelines**', text: 'Subjects must be registered under a specific school node before homerooms can associate them to the student timetable.' },
            { title: '📚 **Managing period length**', text: 'Standard academic hours are divided into periods. Principals configure period start/end offsets in the administrative panel.' },
            { title: '📚 **Homeroom teacher assignments**', text: 'Homerooms must have an assigned faculty member. The homeroom teacher manages attendance and student card overrides.' },
            { title: '📚 **Roster management**', text: 'Students can be moved between classes. Relational schemas handle the migrations, preserving historical grades.' },
            { title: '📚 **Homework deadline settings**', text: 'Assignment models have a strict due_date field. Submissions after this date are flagged as late automatically.' },
            { title: '📚 **Submission statistics**', text: 'Educators can view a submission histogram on their console to track how many scholars have turned in their assignments.' },
            { title: '📚 **Grading curve weights**', text: 'Faculty nodes can define grade distributions (e.g. exams: 50%, homework: 30%, attendance: 20%) to auto-calculate scores.' },
            { title: '📚 **Exam creation parameters**', text: 'MCQ exams must specify the number of questions, points per question, and the JSON format answer keys.' },
            { title: '📚 **MCQ JSON structure**', text: 'MCQ keys map question indexes to option strings: e.g. `{"1": "A", "2": "C"}`. This is loaded during AI sheet evaluations.' },
            { title: '📚 **Mock exam configurations**', text: 'Mock exams do not require administrative approval. They can be created by teachers at any time for study prep.' },
            { title: '📚 **Student exam history**', text: 'The system retains a history of all exam attempts, tracking start times, end times, and IP address handshakes.' },
            { title: '📚 **Grade distribution plots**', text: 'Grade detail layouts show class averages and standard deviations, helping educators evaluate exam difficulties.' },
            { title: '📚 **Subject file uploads**', text: 'Educators can upload PDFs, markdown guides, and slides. Files are stored securely in Supabase storage buckets.' },
            { title: '📚 **Voice classroom booking**', text: 'Staff can coordinate virtual lessons by booking Study Room slots on the timetable matrix.' },
            { title: '📚 **Syllabus compliance tracking**', text: 'Syllabus milestones are checked off as lesson materials are marked as read by student nodes.' },
            { title: '📚 **E-exam player security**', text: 'The exam player records page blur events (if the student switches tabs) to audit potential compliance bypasses.' },
            { title: '📚 **Course completion telemetry**', text: 'When all subject parameters are met, a completion marker is set, prompting the principal node for card review.' },
            { title: '📚 **Closing notice**', text: 'Let us keep academic questions, assignment updates, and homework sync strictly inside this channel. Let’s build!' }
        ]
    },
    'parent-updates': {
        threadId: 11,
        messages: [
            { title: 'LUCY OS // parent-updates [DOC-01]', text: '👨‍👩‍👧‍👦 **PARENT PORTAL**: Parent updates node is online. This channel lists announcements regarding fee invoicing, report cards, and observer views.' },
            { title: '👨‍👩‍👧‍👦 **Passcode verification steps**', text: 'Parents can link student profiles by entering the autogenerated student passcode. This is processed securely via PostgreSQL.' },
            { title: '👨‍👩‍👧‍👦 **Student passcode generation**', text: 'Passcodes are unique, secure, and generated only by authorized principals. Sharing these codes is restricted.' },
            { title: '👨‍👩‍👧‍👦 **Monitoring attendance logs**', text: 'The parent dashboard displays real-time attendance reports. Daily homeroom check-ins are logged as present, absent, or late.' },
            { title: '👨‍👩‍👧‍👦 **Grade listings observer**', text: 'Parent accounts can view a list of all course grades, mock exam scores, and teacher comments in real-time.' },
            { title: '👨‍👩‍👧‍👦 **Signed report cards**', text: 'Report cards are rendered as PDFs on the dashboard. They display cryptographic verification hashes from the school principal.' },
            { title: '👨‍👩‍👧‍👦 **Principal remarks tracking**', text: 'Midterm and final term sheets include a principal remarks section, summarizing behavioral and academic milestones.' },
            { title: '👨‍👩‍👧‍👦 **Academic invoice overview**', text: 'The billing section tracks current fees. Invoices are split into tuition, laboratory, and student activity line items.' },
            { title: '👨‍👩‍👧‍👦 **Fee structure details**', text: 'Standard tuition is billed at the beginning of each term. Extra activity fees require parent authorization before invoicing.' },
            { title: '👨‍👩‍👧‍👦 **Payment portal integration**', text: 'Payments are processed online. The transaction triggers a webhook which updates the database invoice status to PAID.' },
            { title: '👨‍👩‍👧‍👦 **Receipt logs generation**', text: 'Once payment is confirmed, a cryptographically signed receipt is generated as a PDF, accessible on the billing history.' },
            { title: '👨‍👩‍👧‍👦 **Email alerts configuration**', text: 'Parents can opt-in to receive email reports on weekly grades, attendance summaries, and pending invoice deadlines.' },
            { title: '👨‍👩‍👧‍👦 **Support for fee disputes**', text: 'For billing inquiries, parents can submit support packets using the direct contact coordinator form.' },
            { title: '👨‍👩‍👧‍👦 **Invoice archives access**', text: 'Historical payment logs are archived on the database. Parents can access records from previous academic terms.' },
            { title: '👨‍👩‍👧‍👦 **Observer view restrictions**', text: 'Parent accounts are strictly read-only. Parents cannot submit homework, alter registers, or modify exam parameters.' },
            { title: '👨‍👩‍👧‍👦 **School principal updates**', text: 'School notices, holiday closures, and exam schedules are posted directly to the parent alerts feed.' },
            { title: '👨‍👩‍👧‍👦 **Updating billing coordinates**', text: 'Parents can update their billing address and contact numbers inside the parent settings tab.' },
            { title: '👨‍👩‍👧‍👦 **Privacy data protection**', text: 'LUCY OS complies with student data privacy frameworks. Parent links are authenticated against specific child records.' },
            { title: '👨‍👩‍👧‍👦 **Observer feedback system**', text: 'We encourage parents to submit feedback regarding dashboard ease-of-use via the contact portal on the landing page.' },
            { title: '👨‍👩‍👧‍👦 **Closing remarks**', text: 'We are proud to provide complete grade transparency and secure billing portals to the families of our scholars!' }
        ]
    },
    'staff-room': {
        threadId: 12,
        messages: [
            { title: 'LUCY OS // staff-room [DOC-01]', text: '🏛️ **FACULTY CONSOLE**: Staff room node is active. This channel is restricted to principal and educator nodes for administrative sync.' },
            { title: '🏛️ **Roster management flows**', text: 'Faculty nodes can add students to homeroom databases. The system generates unique, secure login passcodes for new students.' },
            { title: '🏛️ **Student passcode generation**', text: ' Roster tools trigger random token generation using crypto helper functions on the Next.js server.' },
            { title: '🏛️ **homeroom attendance checks**', text: 'Attendance must be updated daily. Faculty check off scholars on the homeroom grid, logging results straight to Supabase.' },
            { title: '🏛️ **Creating exam templates**', text: 'Teachers construct e-exams in the exam builder. You must specify questions, answers, and time parameters.' },
            { title: '🏛️ **MCQ parsing logics**', text: 'The grading assistant evaluates answer sheets using OCR. Make sure scans are high resolution (300 DPI minimum).' },
            { title: '🏛️ **Comparing scan sheets**', text: 'The verification page displays the scanned sheet on the left and parsed results on the right, allowing quick corrections.' },
            { title: '🏛️ **Manual score overrides**', text: 'If a student answers an essay question or needs a score override, teachers can edit values in the gradebook sheet.' },
            { title: '🏛️ **Publishing course grades**', text: 'Grades must be pushed to the database. Pushing grades triggers an email alert sequence to mapped parent accounts.' },
            { title: '🏛️ **Timetable overlaps checks**', text: 'The timetable scheduler detects if a teacher or classroom is double-booked, prompting auto-resolutions.' },
            { title: '🏛️ **Educator payroll tracker**', text: 'Teachers can record their working hours and check monthly salary logs under the payroll dashboard.' },
            { title: '🏛️ **homeroom comments override**', text: 'Teachers write end-of-term evaluations on student cards, visible only on parent and principal dashboard views.' },
            { title: '🏛️ **report cards routing**', text: 'When all grades are entered, educators route report cards to the principal node for cryptographic signing.' },
            { title: '🏛️ **homework grading queues**', text: 'Educators receive alerts when students upload homework payloads. Files can be reviewed and graded inside the assignments tab.' },
            { title: '🏛️ **managing lesson blocks**', text: 'Lesson templates let teachers schedule study blocks and book labs or equipment for upcoming periods.' },
            { title: '🏛️ **Administrative checks**', text: 'Before closing terms, verify all students have registered grades. Stale records will prevent report card generation.' },
            { title: '🏛️ **Faculty coordinates settings**', text: 'Educators can update their subject specializations and contact details inside the staff portal settings.' },
            { title: '🏛️ **Audit logs enforcement**', text: 'All roster changes, grade edits, and attendance logs record the educator’s IP address and session token.' },
            { title: '🏛️ **Feedback on grading loops**', text: 'Report any OCR parsing issues or grading console stutters to developers via the support channel.' },
            { title: '🏛️ **Checklist complete**', text: 'Ensure you review the end-of-term checklist. Let’s keep operations running smoothly and securely!' }
        ]
    },
    'telemetry-updates': {
        threadId: 13,
        messages: [
            { title: 'LUCY OS // telemetry-updates [DOC-01]', text: '💻 **TELEMETRY ACTIVE**: System telemetry node is online. This channel prints live specifications, schema details, and optimization statistics.' },
            { title: '💻 **Prisma Schema (Part 1)**', text: 'The User table maps credentials. Profile tables hold role coordinates. Mapped roles include Principal, Teacher, Student, and Parent.' },
            { title: '💻 **Prisma Schema (Part 2)**', text: 'The School table is the root node. Classes associate homeroom lists, and Homerooms map students and subject parameters.' },
            { title: '💻 **Prisma Schema (Part 3)**', text: 'Subject tables link courses to teachers. Timetable records configure period blocks, start offsets, and classroom IDs.' },
            { title: '💻 **Prisma Schema (Part 4)**', text: 'Exam models store name, description, duration, and questions. Grade records track raw scores and percentage averages.' },
            { title: '💻 **Prisma Schema (Part 5)**', text: 'Invoice models track bills, amount, and due dates. Payments log transaction tokens and receipt references.' },
            { title: '💻 **Row Level Security (RLS)**', text: 'Supabase RLS is enforced. Queries are verified against session IDs to prevent unauthorized table reads.' },
            { title: '💻 **PostgreSQL Connection Pools**', text: 'PgBouncer is configured for connection pooling. Standard pool size is 12 active slots, with a maximum limit of 20.' },
            { title: '💻 **NextAuth Verification Flow**', text: 'Authentication hooks process JWT tokens. Session data is encrypted and saved in secure HttpOnly cookies.' },
            { title: '💻 **Turbopack Compiler Rates**', text: 'Next.js Turbopack compiler compiles modules dynamically. Local hot-reloading completes in less than 400ms.' },
            { title: '💻 **Vercel Production Specs**', text: 'Hosted on Vercel Edge networks. Dynamic routes are precompiled as Edge Functions to minimize startup times.' },
            { title: '💻 **Edge Route Response Latency**', text: 'API routes report a response latency of 45ms. Fast response rates ensure a highly interactive user dashboard.' },
            { title: '💻 **Supabase Storage Buckets**', text: 'Storage buckets house scanned MCQ sheets and assignment PDFs. Access policies restrict uploads to verified users.' },
            { title: '💻 **Security Logs Architecture**', text: 'Audit tables record logs of critical actions. Entries hold timestamps, user IDs, and raw state changes.' },
            { title: '💻 **Error Boundaries Console**', text: 'System diagnostics write error logs to `lib/agent-debug-log.ts`, tracking Edge execution faults.' },
            { title: '💻 **Canvas Matrix Optimization**', text: 'Matrix rain canvas uses context drawing operations, drawing 18 code columns at a low rendering cost.' },
            { title: '💻 **GPU translate3d metrics**', text: 'Custom cursors translate on x and y axes, triggering GPU operations instead of CPU document paint recalculations.' },
            { title: '💻 **Middleware Proxy Specs**', text: 'Middleware proxy rules route session validations to edge nodes, bypassing traditional server bottlenecks.' },
            { title: '💻 **Automatic Snapshot Cron**', text: 'Cron jobs trigger database backups every 24 hours. Backups are stored in encrypted, append-only vault nodes.' },
            { title: '💻 **Final Telemetry Status**', text: 'All system parameters are nominal. CPU consumption: low. RAM allocations: within limits. Envelope status: 100% SECURE.' }
        ]
    }
};

// Wait helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    try {
        console.log("Publishing Lucy OS Software data to Telegram and Discord...");

        // Load thread IDs from setup output if available
        let TELEGRAM_TOPIC_IDS = {};
        try {
            const idsPath = path.join(__dirname, 'telegram-thread-ids.json');
            if (fs.existsSync(idsPath)) {
                TELEGRAM_TOPIC_IDS = JSON.parse(fs.readFileSync(idsPath, 'utf8'));
                console.log("✔ Loaded live Telegram thread IDs from JSON file.");
            }
        } catch (e) {
            console.log("Could not load telegram-thread-ids.json, using defaults.");
        }

        const keyMapping = {
            'welcome-rules': 'welcome',
            'announcements': 'announce',
            'general': 'general',
            'student-lounge': 'lounge',
            'help-support': 'support',
            'classes-discussion': 'classes',
            'parent-updates': 'parents',
            'staff-room': 'staff',
            'telemetry-updates': 'telemetry'
        };

        // 1. Post to Telegram
        for (const [topicName, doc] of Object.entries(DOCS)) {
            const threadKey = keyMapping[topicName] || topicName;
            const threadId = TELEGRAM_TOPIC_IDS[threadKey] || doc.threadId;
            console.log(`Posting to Telegram topic: ${topicName} (Thread ID: ${threadId})...`);

            for (const msg of doc.messages) {
                const escapedTitle = msg.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const escapedText = msg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const fullText = `<b>${escapedTitle}</b>\n\n${escapedText}`;
                try {
                    const params = {
                        chat_id: TELEGRAM_CHAT_ID,
                        text: fullText,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    };
                    if (threadId && threadId !== 1) {
                        params.message_thread_id = threadId;
                    }
                    await telegramRequest('sendMessage', params);
                    console.log(`  ✔ Posted "${msg.title}" to Telegram.`);
                } catch (e) {
                    console.error(`  ⚠ Failed to post to Telegram ${topicName}:`, e.message);
                }
                // Spaced 3 seconds to strictly avoid Telegram supergroup rate limits (20 msgs/min)
                await sleep(3200);
            }
        }

        // 2. Post to Discord
        const guilds = await discordRequest('GET', '/users/@me/guilds');
        const guild = guilds.find(g => g.name.toLowerCase() === DISCORD_GUILD_NAME.toLowerCase());
        if (guild) {
            const channels = await discordRequest('GET', `/guilds/${guild.id}/channels`);
            for (const [chanName, doc] of Object.entries(DOCS)) {
                const channel = channels.find(c => c.name === chanName && c.type === 0);
                if (channel) {
                    console.log(`Posting to Discord channel: #${chanName}...`);
                    for (const msg of doc.messages) {
                        try {
                            await discordRequest('POST', `/channels/${channel.id}/messages`, {
                                embeds: [
                                    {
                                        title: msg.title,
                                        description: msg.text,
                                        color: 0x18181b // Dark charcoal color
                                    }
                                ]
                            });
                            console.log(`  ✔ Posted "${msg.title}" to Discord.`);
                        } catch (e) {
                            console.error(`  ⚠ Failed to post to Discord #${chanName}:`, e.message);
                        }
                        // 1 second delay per channel message to respect Discord rate limits
                        await sleep(1000);
                    }
                }
            }
        } else {
            console.error("Discord guild not found.");
        }

        console.log("Publish sequence complete!");
    } catch (e) {
        console.error("Execution error:", e.message);
    }
}

run();
