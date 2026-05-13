/**
 * LUCY HTTP Role API Test Suite
 * Tests every major role's HTTP endpoints against the live Cloudflare Edge deployment.
 * Uses real Supabase JWT session tokens to authenticate API requests.
 */

const BASE_URL = "https://5-cn.net";

const ACCOUNTS = {
    teacher: { email: "teacher@lucy.edu", password: "Password123!" },
    student: { email: "student@lucy.edu", password: "Password123!" }
};

const SUPABASE_URL = "https://caeeusbhwrkelnffbbub.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZWV1c2Jod3JrZWxuZmZiYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTA1MjMsImV4cCI6MjA4NjIyNjUyM30.eKeVzCPiBHiFSh-QU4cT9FwRK7MDO7HQQzxLHminvRE";

// Known test data IDs from DB
const CLASS_ID   = "236fec34-4920-4fc2-b9a3-493964b388d8";
const SUBJECT_ID = "86d4922f-4b6b-45ec-9fac-fcd0841d2a1a";
const SCHOOL_ID  = "c4020909-c825-4490-9790-18e0632dbeaf";

let passed = 0, failed = 0;

async function supabaseLogin(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
    return data.access_token;
}

async function apiRequest(method, path, token, body = null) {
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        // Supabase also needs cookie-based session — pass auth header for API routes
        "Cookie": `sb-caeeusbhwrkelnffbbub-auth-token=${JSON.stringify({access_token: token})}`
    };
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE_URL}${path}`, opts);
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
        return { status: res.status, ok: res.ok, data: json };
    } catch (e) {
        return { status: 0, ok: false, data: { error: e.message } };
    }
}

function log(icon, label, status, detail = "") {
    const statusStr = status ? `[${status}]` : "";
    console.log(`  ${icon} ${label} ${statusStr} ${detail}`);
    if (icon === "✅") passed++;
    if (icon === "❌") failed++;
}

async function testTeacherRole(token) {
    console.log("\n━━━ 👩‍🏫 TEACHER ROLE ━━━");

    // 1. Get teacher's classes
    const classes = await apiRequest("GET", `/api/teacher/classes`, token);
    if (classes.ok && classes.data) {
        log("✅", "GET /api/teacher/classes", classes.status, `- ${Array.isArray(classes.data) ? classes.data.length : '?'} classes`);
    } else {
        log("❌", "GET /api/teacher/classes", classes.status, JSON.stringify(classes.data).slice(0, 120));
    }

    // 2. Create an assignment via HTTP
    const newAssignment = await apiRequest("POST", "/api/school/assignments", token, {
        classId: CLASS_ID,
        subjectId: SUBJECT_ID,
        title: "HTTP Live Test Assignment " + Date.now(),
        description: "This assignment was created via the live HTTP API test suite.",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        type: "HOMEWORK"
    });
    if (newAssignment.ok && newAssignment.data?.assignment?.id) {
        log("✅", "POST /api/school/assignments", newAssignment.status, `- ID: ${newAssignment.data.assignment.id}`);
        
        // 3. Fetch assignments to confirm it was created
        const fetchAssignments = await apiRequest("GET", `/api/school/assignments?classId=${CLASS_ID}`, token);
        if (fetchAssignments.ok) {
            log("✅", "GET /api/school/assignments?classId=...", fetchAssignments.status, `- ${fetchAssignments.data?.assignments?.length || 0} found`);
        } else {
            log("❌", "GET /api/school/assignments?classId=...", fetchAssignments.status, JSON.stringify(fetchAssignments.data).slice(0, 120));
        }
    } else {
        log("❌", "POST /api/school/assignments", newAssignment.status, JSON.stringify(newAssignment.data).slice(0, 180));
    }

    // 4. Log attendance
    const attendance = await apiRequest("POST", "/api/school/attendance", token, {
        classId: CLASS_ID,
        date: new Date().toISOString().split("T")[0],
        records: [{ studentId: "bce8b6b8-aa2c-42e3-b620-7939fc5f09e5", status: "PRESENT" }]
    });
    if (attendance.ok) {
        log("✅", "POST /api/school/attendance", attendance.status, "- Attendance logged");
    } else {
        log("❌", "POST /api/school/attendance", attendance.status, JSON.stringify(attendance.data).slice(0, 180));
    }

    // 5. Teacher stats
    const stats = await apiRequest("GET", "/api/user/stats", token);
    if (stats.ok) {
        log("✅", "GET /api/user/stats", stats.status, "- Stats fetched");
    } else {
        log("❌", "GET /api/user/stats", stats.status, JSON.stringify(stats.data).slice(0, 120));
    }

    return newAssignment.data?.assignment?.id;
}

async function testStudentRole(token, assignmentId) {
    console.log("\n━━━ 🎓 STUDENT ROLE ━━━");

    // 1. Fetch student's attendance
    const attendance = await apiRequest("GET", "/api/student/attendance", token);
    if (attendance.ok) {
        log("✅", "GET /api/student/attendance", attendance.status, "- Attendance data fetched");
    } else {
        log("❌", "GET /api/student/attendance", attendance.status, JSON.stringify(attendance.data).slice(0, 120));
    }

    // 2. Fetch student grades
    const grades = await apiRequest("GET", "/api/student/grades", token);
    if (grades.ok) {
        log("✅", "GET /api/student/grades", grades.status, "- Grade data fetched");
    } else {
        log("❌", "GET /api/student/grades", grades.status, JSON.stringify(grades.data).slice(0, 120));
    }

    // 3. Submit assignment (if we have an assignmentId from teacher test)
    if (assignmentId) {
        const submission = await apiRequest("POST", "/api/school/assignments/submissions", token, {
            assignmentId,
            content: "Student HTTP submission: The edge architecture is working perfectly."
        });
        if (submission.ok) {
            log("✅", "POST /api/school/assignments/submissions", submission.status, "- Submission created");
        } else {
            log("❌", "POST /api/school/assignments/submissions", submission.status, JSON.stringify(submission.data).slice(0, 180));
        }
    }

    // 4. Fetch user profile
    const profile = await apiRequest("GET", "/api/user/settings", token);
    if (profile.ok) {
        log("✅", "GET /api/user/settings", profile.status, "- Profile fetched");
    } else {
        log("❌", "GET /api/user/settings", profile.status, JSON.stringify(profile.data).slice(0, 120));
    }
}

async function testHealthAndPublicEndpoints() {
    console.log("\n━━━ 🌐 PUBLIC / HEALTH ENDPOINTS ━━━");

    // Health check
    const health = await apiRequest("GET", "/api/health", null);
    if (health.ok) {
        log("✅", "GET /api/health", health.status, JSON.stringify(health.data).slice(0, 80));
    } else {
        log("❌", "GET /api/health", health.status, JSON.stringify(health.data).slice(0, 80));
    }

    // Homepage
    const home = await fetch(BASE_URL + "/");
    const homeOk = home.status === 200;
    homeOk ? log("✅", "GET / (homepage)", home.status, "") : log("❌", "GET / (homepage)", home.status, "");

    // Login page
    const login = await fetch(BASE_URL + "/login");
    login.status === 200 ? log("✅", "GET /login", login.status, "") : log("❌", "GET /login", login.status, "");

    // Register page
    const register = await fetch(BASE_URL + "/register");
    register.status === 200 ? log("✅", "GET /register", register.status, "") : log("❌", "GET /register", register.status, "");
}

async function runAll() {
    console.log("════════════════════════════════════════════");
    console.log("  🚀 LUCY LIVE HTTP ROLE TEST SUITE");
    console.log(`  Target: ${BASE_URL}`);
    console.log("════════════════════════════════════════════");

    await testHealthAndPublicEndpoints();

    // Login as teacher
    let teacherToken, studentToken;
    try {
        console.log("\n  🔑 Authenticating teacher@lucy.edu...");
        teacherToken = await supabaseLogin(ACCOUNTS.teacher.email, ACCOUNTS.teacher.password);
        console.log("  ✅ Teacher token acquired");
    } catch (e) {
        console.log("  ❌ Teacher login failed:", e.message);
    }

    try {
        console.log("  🔑 Authenticating student@lucy.edu...");
        studentToken = await supabaseLogin(ACCOUNTS.student.email, ACCOUNTS.student.password);
        console.log("  ✅ Student token acquired");
    } catch (e) {
        console.log("  ❌ Student login failed:", e.message);
    }

    let createdAssignmentId = null;
    if (teacherToken) {
        createdAssignmentId = await testTeacherRole(teacherToken);
    }

    if (studentToken) {
        await testStudentRole(studentToken, createdAssignmentId);
    }

    console.log("\n════════════════════════════════════════════");
    console.log(`  RESULTS: ✅ ${passed} PASSED  |  ❌ ${failed} FAILED`);
    if (failed === 0) {
        console.log("  🎯 ALL LIVE HTTP TESTS PASSED — Edge is 100% Stable");
    } else {
        console.log("  ⚠️  Some endpoints need attention (see logs above)");
    }
    console.log("════════════════════════════════════════════\n");
}

runAll().catch(console.error);
