import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sb = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const SCHOOL_ID = 'school-apex-horizon-2026';
const SCHOOL_CODE = 'APEX-2026';
const SCHOOL_NAME = 'Apex Horizon International Academy';
const DOMAIN = 'apexhorizon.lucy.edu';

const PASSWORDS = {
    SUPERADMIN: 'Lucy@SuperAdmin2026!',
    OWNER: 'Lucy@Owner2026!',
    PRINCIPAL: 'Lucy@Principal2026!',
    TEACHER: 'Lucy@Teacher2026!',
    PARENT: 'Lucy@Parent2026!',
    STUDENT: 'Lucy@Student2026!'
};

const FIRST_NAMES = [
    'Alexander', 'Sophia', 'Lucas', 'Emma', 'Oliver', 'Isabella', 'Ethan', 'Mia', 'Liam', 'Charlotte',
    'Noah', 'Amelia', 'James', 'Harper', 'Benjamin', 'Evelyn', 'Elijah', 'Abigail', 'William', 'Emily',
    'Henry', 'Elizabeth', 'Mateo', 'Mila', 'Sebastian', 'Ella', 'Daniel', 'Avery', 'Jack', 'Sofia',
    'Samuel', 'Camila', 'David', 'Aria', 'Joseph', 'Scarlett', 'Carter', 'Victoria', 'Owen', 'Madison',
    'Wyatt', 'Luna', 'John', 'Grace', 'Luke', 'Chloe', 'Asher', 'Penelope', 'Julian', 'Layla',
    'Leo', 'Riley', 'Gabriel', 'Zoey', 'Anthony', 'Nora', 'Isaac', 'Lily', 'Dylan', 'Eleanor',
    'Thomas', 'Hannah', 'Christopher', 'Lillian', 'Joshua', 'Addison', 'Andrew', 'Aubrey', 'Theodore', 'Ellie',
    'Caleb', 'Stella', 'Ryan', 'Natalie', 'Adrian', 'Zoe', 'Miles', 'Leah', 'Christian', 'Hazel',
    'Nolan', 'Violet', 'Hunter', 'Aurora', 'Cameron', 'Savannah', 'Eli', 'Audrey', 'Aaron', 'Brooklyn',
    'Ezra', 'Bella', 'Colton', 'Claire', 'Angel', 'Skylar', 'Roman', 'Lucy', 'Landon', 'Paisley',
    'Naomi', 'Elias', 'Maya', 'Silas', 'Elena', 'Declan', 'Iris', 'Xavier', 'Freya', 'Jasper',
    'Clara', 'August', 'Alice', 'Felix', 'Cora', 'Tobias', 'Ivy', 'Arthur', 'Margot', 'Simon',
    'Eliza', 'Jonas', 'Vera', 'Hugo', 'Adele', 'Astrid', 'Leif', 'Kaelen', 'Tariq', 'Amina',
    'Youssef', 'Fatima', 'Zayd', 'Zahra', 'Kenji', 'Mei', 'Jun', 'Hana', 'Haruto', 'Yuna',
    'Ren', 'Aoi', 'Chen', 'Wei', 'Lin', 'Xiao', 'Tadesse', 'Bekele', 'Abebe', 'Fischer'
];

const LAST_NAMES = [
    'Vance', 'Sterling', 'Novak', 'Thornton', 'Mercer', 'Blackwood', 'Chen', 'Dubois', 'Kowalski', 'Tanaka',
    'Rousseau', 'Sinclair', 'Castillo', 'Hawthorne', 'Montgomery', 'Lindqvist', 'Al-Mansoor', 'O\'Connor', 'Kassaye', 'Tadesse',
    'Bekele', 'Abebe', 'Mendoza', 'Fischer', 'Yamamoto', 'Gomez', 'Sato', 'Moreau', 'Haddad', 'Nakamura',
    'Okafor', 'Mensah', 'Diallo', 'Traore', 'Kamara', 'Borges', 'Silva', 'Santos', 'Costa', 'Pereira',
    'Ivanov', 'Petrov', 'Popov', 'Sokolov', 'Morozov', 'Ferrari', 'Rossi', 'Ricci', 'Marino', 'Greco',
    'Watanabe', 'Takahashi', 'Suzuki', 'Schneider', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz',
    'Dupont', 'Laurent', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard',
    'Navarro', 'Torres', 'Ramirez', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Cruz', 'Reyes', 'Morales'
];

let globalExistingAuthUsers: Map<string, string> = new Map();

async function cacheAuthUsers() {
    try {
        const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
        if (data?.users) {
            for (const u of data.users as any[]) {
                if (u.email) {
                    globalExistingAuthUsers.set(u.email.toLowerCase(), u.id);
                }
            }
        }
    } catch (e: any) {
        console.warn('Failed to pre-cache Supabase auth users:', e.message);
    }
}

async function ensureAuthUser(email: string, pass: string, name: string, role: string): Promise<string | null> {
    const normalized = email.toLowerCase().trim();
    const existingId = globalExistingAuthUsers.get(normalized);

    try {
        if (existingId) {
            await sb.auth.admin.updateUserById(existingId, {
                password: pass,
                user_metadata: { role, name }
            });
            return existingId;
        }

        const { data: created, error } = await sb.auth.admin.createUser({
            email: normalized,
            password: pass,
            email_confirm: true,
            user_metadata: { role, name }
        });

        if (error) {
            if (error.message?.includes('already registered') || error.message?.includes('exists')) {
                const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
                const matched = (data?.users as any[])?.find((u: any) => u.email?.toLowerCase() === normalized);
                if (matched) {
                    globalExistingAuthUsers.set(normalized, matched.id);
                    return matched.id;
                }
            }
            throw error;
        }

        if (created?.user) {
            globalExistingAuthUsers.set(normalized, created.user.id);
            return created.user.id;
        }

        return null;
    } catch (e: any) {
        console.warn(`Auth user provision warning (${email}):`, e.message);
        return null;
    }
}

async function ensureAuthBatch(items: Array<{ email: string; pass: string; name: string; role: string }>, batchSize = 10) {
    const results: Array<{ email: string; id: string | null }> = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const slice = items.slice(i, i + batchSize);
        const chunkResults = await Promise.all(
            slice.map(async item => {
                const id = await ensureAuthUser(item.email, item.pass, item.name, item.role);
                return { email: item.email, id };
            })
        );
        results.push(...chunkResults);
    }
    return results;
}

function deterministicUuid(seed: string): string {
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16),
        '8' + hash.substring(17, 20),
        hash.substring(20, 32)
    ].join('-');
}

async function withRetry<T>(fn: () => Promise<T>, retries = 4, delay = 1500): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (e: any) {
            if (attempt === retries) throw e;
            console.warn(`Database connection retry (attempt ${attempt}/${retries}): ${e.message?.slice(0, 80)}`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error('Retry limit exhausted');
}

async function main() {
    console.log('---------------------------------------------------------');
    console.log('LUCY OS Master Enterprise Academy Provisioning Engine');
    console.log(`Target: ${SCHOOL_NAME} [Code: ${SCHOOL_CODE}]`);
    console.log('---------------------------------------------------------');

    console.log('Step 0: Caching existing Supabase authentication users...');
    await cacheAuthUsers();
    console.log(`Pre-cached ${globalExistingAuthUsers.size} auth users.`);

    // 1. Provision School
    console.log('Step 1: Provisioning School record...');
    const school = await withRetry(() => prisma.school.upsert({
        where: { schoolCode: SCHOOL_CODE },
        update: {
            name: SCHOOL_NAME,
            domain: DOMAIN,
            status: 'ACTIVE',
            subscriptionStatus: 'active',
            address: '742 Evergreen Quantum Boulevard, Silicon Valley, CA',
            logoUrl: '/apple-icon.png',
            attendanceConfig: {
                type: 'PERIOD',
                lockAfterMinutes: 30,
                enableLateMarking: true
            },
            communicationsConfig: {
                replyTo: 'admissions@apexhorizon.edu',
                sendInvites: true,
                sendReports: true,
                sendInvoices: true
            },
            defaultBillingCycle: 'TERM',
            termStructure: 'SEMESTERS'
        },
        create: {
            id: SCHOOL_ID,
            name: SCHOOL_NAME,
            schoolCode: SCHOOL_CODE,
            domain: DOMAIN,
            status: 'ACTIVE',
            subscriptionStatus: 'active',
            address: '742 Evergreen Quantum Boulevard, Silicon Valley, CA',
            logoUrl: '/apple-icon.png',
            attendanceConfig: {
                type: 'PERIOD',
                lockAfterMinutes: 30,
                enableLateMarking: true
            },
            communicationsConfig: {
                replyTo: 'admissions@apexhorizon.edu',
                sendInvites: true,
                sendReports: true,
                sendInvoices: true
            },
            defaultBillingCycle: 'TERM',
            termStructure: 'SEMESTERS'
        }
    }));
    console.log(`School verified: ID ${school.id}`);

    // 2. Provision Academic Terms
    console.log('Step 2: Provisioning Academic Terms...');
    const termFall = await prisma.academicTerm.upsert({
        where: { id: `${SCHOOL_ID}-term-fall-2026` },
        update: {
            name: 'Fall Semester 2026',
            startDate: new Date('2026-09-01'),
            endDate: new Date('2026-12-20'),
            isActive: true,
            schoolId: school.id
        },
        create: {
            id: `${SCHOOL_ID}-term-fall-2026`,
            name: 'Fall Semester 2026',
            startDate: new Date('2026-09-01'),
            endDate: new Date('2026-12-20'),
            isActive: true,
            schoolId: school.id
        }
    });

    await prisma.academicTerm.upsert({
        where: { id: `${SCHOOL_ID}-term-spring-2027` },
        update: {
            name: 'Spring Semester 2027',
            startDate: new Date('2027-01-15'),
            endDate: new Date('2027-05-30'),
            isActive: false,
            schoolId: school.id
        },
        create: {
            id: `${SCHOOL_ID}-term-spring-2027`,
            name: 'Spring Semester 2027',
            startDate: new Date('2027-01-15'),
            endDate: new Date('2027-05-30'),
            isActive: false,
            schoolId: school.id
        }
    });
    console.log(`Academic term Fall Semester 2026 active.`);

    // 3. Provision Daily Periods
    console.log('Step 3: Provisioning Daily Schedule Periods...');
    const PERIOD_CONFIGS = [
        { id: `${SCHOOL_ID}-p1`, name: 'Period 1: Morning Core', startTime: '08:30', endTime: '09:15', order: 1, isBreak: false },
        { id: `${SCHOOL_ID}-p2`, name: 'Period 2: Humanities & STEM', startTime: '09:20', endTime: '10:05', order: 2, isBreak: false },
        { id: `${SCHOOL_ID}-brk1`, name: 'Morning Convocation & Break', startTime: '10:05', endTime: '10:25', order: 3, isBreak: true },
        { id: `${SCHOOL_ID}-p3`, name: 'Period 3: Laboratory & Practicum', startTime: '10:25', endTime: '11:10', order: 4, isBreak: false },
        { id: `${SCHOOL_ID}-p4`, name: 'Period 4: Advanced Theory', startTime: '11:15', endTime: '12:00', order: 5, isBreak: false },
        { id: `${SCHOOL_ID}-lunch`, name: 'Refectory Lunch & Fellowship', startTime: '12:00', endTime: '12:50', order: 6, isBreak: true },
        { id: `${SCHOOL_ID}-p5`, name: 'Period 5: Quantitative Seminar', startTime: '12:50', endTime: '13:35', order: 7, isBreak: false },
        { id: `${SCHOOL_ID}-p6`, name: 'Period 6: Arts & Athletics', startTime: '13:40', endTime: '14:25', order: 8, isBreak: false },
        { id: `${SCHOOL_ID}-p7`, name: 'Period 7: Colloquium & Mentorship', startTime: '14:30', endTime: '15:15', order: 9, isBreak: false }
    ];

    for (const p of PERIOD_CONFIGS) {
        await prisma.period.upsert({
            where: { id: p.id },
            update: { name: p.name, startTime: p.startTime, endTime: p.endTime, order: p.order, isBreak: p.isBreak, schoolId: school.id },
            create: { id: p.id, name: p.name, startTime: p.startTime, endTime: p.endTime, order: p.order, isBreak: p.isBreak, schoolId: school.id }
        });
    }
    const createdPeriods = await prisma.period.findMany({ where: { schoolId: school.id }, orderBy: { order: 'asc' } });
    console.log(`Provisioned ${createdPeriods.length} daily timetable periods.`);

    // 4. Provision Curriculum Subjects
    console.log('Step 4: Provisioning Curriculum Subjects...');
    const SUBJECT_DEFINITIONS = [
        { code: 'MATH', name: 'Advanced Mathematics & Analysis' },
        { code: 'ENG', name: 'English Literature & Rhetoric' },
        { code: 'PHYS', name: 'Physics & Applied Mechanics' },
        { code: 'CHEM', name: 'Chemistry & Molecular Biology' },
        { code: 'BIO', name: 'Biology & Life Systems' },
        { code: 'CS', name: 'Computer Science & AI Systems' },
        { code: 'HIST', name: 'World History & Civilizations' },
        { code: 'GEO', name: 'Geography & Environmental Science' },
        { code: 'ECON', name: 'Economics & Financial Systems' },
        { code: 'ART', name: 'Visual Arts & Spatial Design' },
        { code: 'PE', name: 'Physical Education & Athletics' },
        { code: 'ETH', name: 'Ethics, Logic & Philosophy' }
    ];

    const subjects: any[] = [];
    for (const s of SUBJECT_DEFINITIONS) {
        const subId = `${SCHOOL_ID}-subj-${s.code.toLowerCase()}`;
        const subject = await prisma.subject.upsert({
            where: { id: subId },
            update: { name: s.name, schoolId: school.id },
            create: { id: subId, name: s.name, schoolId: school.id }
        });
        subjects.push(subject);
    }
    console.log(`Provisioned ${subjects.length} curriculum subjects.`);

    // 5. Provision Executive & Administrative Leadership
    console.log('Step 5: Provisioning Executive Leadership...');
    
    // School Owner
    const ownerEmail = 'owner@apex.edu';
    const ownerName = 'Dr. Julian Sterling';
    const ownerAuthId = await ensureAuthUser(ownerEmail, PASSWORDS.OWNER, ownerName, 'OWNER');
    const ownerUser = await prisma.user.upsert({
        where: { email: ownerEmail },
        update: { name: ownerName, role: 'OWNER', schoolId: school.id, verified: true, qualification: 'Founding Chancellor & Board Chair' },
        create: { id: ownerAuthId || deterministicUuid(ownerEmail), email: ownerEmail, name: ownerName, role: 'OWNER', schoolId: school.id, verified: true, qualification: 'Founding Chancellor & Board Chair' }
    });

    // Principal
    const principalEmail = 'principal@apex.edu';
    const principalName = 'Dr. Evelyn Vance';
    const principalAuthId = await ensureAuthUser(principalEmail, PASSWORDS.PRINCIPAL, principalName, 'PRINCIPAL');
    const principalUser = await prisma.user.upsert({
        where: { email: principalEmail },
        update: { name: principalName, role: 'PRINCIPAL', schoolId: school.id, verified: true, qualification: 'Head of Academy & Chief Academic Officer' },
        create: { id: principalAuthId || deterministicUuid(principalEmail), email: principalEmail, name: principalName, role: 'PRINCIPAL', schoolId: school.id, verified: true, qualification: 'Head of Academy & Chief Academic Officer' }
    });
    console.log(`Leadership established: Owner (${ownerUser.email}), Principal (${principalUser.email})`);

    // 6. Provision 14 Faculty Members
    console.log('Step 6: Provisioning 14 Faculty Members in Supabase Auth & Database...');
    const FACULTY_SPECS = [
        { code: 'TCH-101', name: 'Prof. Marcus Aurelius', email: 'teacher1@apex.edu', title: 'Chair of Mathematics', subjectIdx: 0 },
        { code: 'TCH-102', name: 'Dr. Elena Rostova', email: 'teacher2@apex.edu', title: 'Senior Physics Fellow', subjectIdx: 2 },
        { code: 'TCH-103', name: 'Sarah Jenkins, M.A.', email: 'teacher3@apex.edu', title: 'Lead Literature Faculty', subjectIdx: 1 },
        { code: 'TCH-104', name: 'Dr. Kenji Tanaka', email: 'teacher4@apex.edu', title: 'Professor of Molecular Chemistry', subjectIdx: 3 },
        { code: 'TCH-105', name: 'Dr. Maya Patel', email: 'teacher5@apex.edu', title: 'Director of Biological Sciences', subjectIdx: 4 },
        { code: 'TCH-106', name: 'Alan Turing Jr.', email: 'teacher6@apex.edu', title: 'Lead Architect, Computer Science & AI', subjectIdx: 5 },
        { code: 'TCH-107', name: 'Prof. David O\'Connor', email: 'teacher7@apex.edu', title: 'Chair of Global Historical Studies', subjectIdx: 6 },
        { code: 'TCH-108', name: 'Amara Diallo, M.Sc.', email: 'teacher8@apex.edu', title: 'Senior Geopolitical Analyst', subjectIdx: 7 },
        { code: 'TCH-109', name: 'Dr. Arthur Pendelton', email: 'teacher9@apex.edu', title: 'Dean of Economic Sciences', subjectIdx: 8 },
        { code: 'TCH-110', name: 'Isabella Chen', email: 'teacher10@apex.edu', title: 'Director of Fine Arts Studio', subjectIdx: 9 },
        { code: 'TCH-111', name: 'Coach Viktor Vance', email: 'teacher11@apex.edu', title: 'Director of Athletics & Kinesiology', subjectIdx: 10 },
        { code: 'TCH-112', name: 'Dr. Claire Beaumont', email: 'teacher12@apex.edu', title: 'Senior Fellow in Logic & Rhetoric', subjectIdx: 11 },
        { code: 'TCH-113', name: 'Lucas Thorne, M.Ed.', email: 'teacher13@apex.edu', title: 'STEM Practicum Specialist', subjectIdx: 0 },
        { code: 'TCH-114', name: 'Hannah Montgomery', email: 'teacher14@apex.edu', title: 'Humanities & Social Sciences Specialist', subjectIdx: 1 }
    ];

    const facultyBatchItems = FACULTY_SPECS.map(f => ({
        email: f.email,
        pass: PASSWORDS.TEACHER,
        name: f.name,
        role: 'TEACHER'
    }));
    await ensureAuthBatch(facultyBatchItems, 7);

    const facultyUsers: any[] = [];
    for (const f of FACULTY_SPECS) {
        const authId = globalExistingAuthUsers.get(f.email.toLowerCase()) || deterministicUuid(f.email);
        const user = await prisma.user.upsert({
            where: { email: f.email },
            update: {
                name: f.name,
                role: 'TEACHER',
                schoolId: school.id,
                verified: true,
                teacherCode: f.code,
                qualification: f.title
            },
            create: {
                id: authId,
                email: f.email,
                name: f.name,
                role: 'TEACHER',
                schoolId: school.id,
                verified: true,
                teacherCode: f.code,
                qualification: f.title
            }
        });
        facultyUsers.push({ user, spec: f });
    }
    console.log(`Provisioned ${facultyUsers.length} faculty members.`);

    // 7. Provision All 12 Grades and 12 Cohort Classes
    console.log('Step 7: Provisioning Grades 1 through 12 and Cohort Classes...');
    const GRADE_NAMES = [
        'Grade 1 (Primary Academy)',
        'Grade 2 (Primary Academy)',
        'Grade 3 (Primary Academy)',
        'Grade 4 (Primary Academy)',
        'Grade 5 (Intermediate Cohort)',
        'Grade 6 (Intermediate Cohort)',
        'Grade 7 (Middle School)',
        'Grade 8 (Middle School)',
        'Grade 9 (Freshman Division)',
        'Grade 10 (Sophomore Division)',
        'Grade 11 (Junior Laureate)',
        'Grade 12 (Senior Laureate)'
    ];

    const CLASS_HOMEROOM_MAP = [
        facultyUsers[11].user, // Grade 1 -> Dr. Claire Beaumont
        facultyUsers[10].user, // Grade 2 -> Coach Viktor Vance
        facultyUsers[9].user,  // Grade 3 -> Isabella Chen
        facultyUsers[8].user,  // Grade 4 -> Dr. Arthur Pendelton
        facultyUsers[7].user,  // Grade 5 -> Amara Diallo
        facultyUsers[6].user,  // Grade 6 -> Prof. David O'Connor
        facultyUsers[5].user,  // Grade 7 -> Alan Turing Jr.
        facultyUsers[4].user,  // Grade 8 -> Dr. Maya Patel
        facultyUsers[0].user,  // Grade 9 -> Prof. Marcus Aurelius
        facultyUsers[1].user,  // Grade 10 -> Dr. Elena Rostova
        facultyUsers[2].user,  // Grade 11 -> Sarah Jenkins
        facultyUsers[3].user   // Grade 12 -> Dr. Kenji Tanaka
    ];

    const grades: any[] = [];
    const classes: any[] = [];

    for (let g = 1; g <= 12; g++) {
        const gradeId = `${SCHOOL_ID}-grade-${g}`;
        const gradeName = GRADE_NAMES[g - 1];

        const grade = await prisma.grade.upsert({
            where: { id: gradeId },
            update: { level: g, name: gradeName, schoolId: school.id },
            create: { id: gradeId, level: g, name: gradeName, schoolId: school.id }
        });
        grades.push(grade);

        const classId = `${SCHOOL_ID}-class-g${g.toString().padStart(2, '0')}-alpha`;
        const className = `Grade ${g}-Alpha`;
        const homeroomTeacher = CLASS_HOMEROOM_MAP[g - 1];

        const cls = await prisma.class.upsert({
            where: { id: classId },
            update: {
                name: className,
                gradeId: grade.id,
                schoolId: school.id,
                homeroomTeacherId: homeroomTeacher.id
            },
            create: {
                id: classId,
                name: className,
                gradeId: grade.id,
                schoolId: school.id,
                homeroomTeacherId: homeroomTeacher.id
            }
        });
        classes.push(cls);
    }
    console.log(`Synchronized all 12 grades and 12 cohort classes with homeroom faculty leads.`);

    // 8. Provision Teacher Assignments & Timetables via Batch Operations
    console.log('Step 8: Fast-Batching Faculty Assignments & Timetable Matrices...');
    const DAYS_OF_WEEK: Array<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'> = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const teachingPeriods = createdPeriods.filter(p => !p.isBreak);

    const teacherAssignmentData: any[] = [];
    const timetableData: any[] = [];

    for (let cIdx = 0; cIdx < classes.length; cIdx++) {
        const cls = classes[cIdx];
        
        for (let sIdx = 0; sIdx < subjects.length; sIdx++) {
            const subject = subjects[sIdx];
            const facultyMember = facultyUsers[sIdx % facultyUsers.length].user;
            const assignId = `ta-${cls.id}-${facultyMember.id}-${subject.id}`;

            teacherAssignmentData.push({
                id: assignId,
                teacherId: facultyMember.id,
                classId: cls.id,
                subjectId: subject.id,
                periodsPerWeek: 5
            });
        }

        for (let d = 0; d < DAYS_OF_WEEK.length; d++) {
            const day = DAYS_OF_WEEK[d];
            for (let p = 0; p < teachingPeriods.length; p++) {
                const period = teachingPeriods[p];
                const subjIndex = (cIdx + d + p) % subjects.length;
                const subject = subjects[subjIndex];
                const teacher = facultyUsers[subjIndex % facultyUsers.length].user;
                const ttId = `tt-${cls.id}-${period.id}-${day}`;

                timetableData.push({
                    id: ttId,
                    classId: cls.id,
                    periodId: period.id,
                    dayOfWeek: day,
                    subjectId: subject.id,
                    teacherId: teacher.id
                });
            }
        }
    }

    await prisma.teacherAssignment.createMany({
        data: teacherAssignmentData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${teacherAssignmentData.length} TeacherAssignment records.`);

    await prisma.timetable.createMany({
        data: timetableData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${timetableData.length} Timetable period schedules.`);

    // 9. Provision 20 Students in Every Class (240 Total Students)
    console.log('Step 9: Provisioning 240 Students across all 12 classes (20 per class)...');
    
    let studentSequence = 0;
    const studentRosterData: Array<{
        seq: number;
        fName: string;
        lName: string;
        email: string;
        code: string;
        cls: any;
        grade: any;
        rankInClass: number;
    }> = [];

    for (let cIdx = 0; cIdx < classes.length; cIdx++) {
        const targetClass = classes[cIdx];
        const targetGrade = grades[cIdx];

        for (let s = 1; s <= 20; s++) {
            studentSequence++;
            const nameIndex = (studentSequence - 1) % FIRST_NAMES.length;
            const lastIndex = (studentSequence + cIdx * 5) % LAST_NAMES.length;
            let fName = FIRST_NAMES[nameIndex];
            let lName = LAST_NAMES[lastIndex];

            // Explicit personas matching master video production script
            if (targetGrade.level === 10 && s === 1) { fName = 'Dawit'; lName = 'Mengistu'; }
            if (targetGrade.level === 10 && s === 2) { fName = 'Lydia'; lName = 'Tadesse'; }
            if (targetGrade.level === 10 && s === 3) { fName = 'Kaleb'; lName = 'Worku'; }
            if (targetGrade.level === 7 && s === 1) { fName = 'Sara'; lName = 'Mengistu'; }

            const email = `student${studentSequence}@apex.edu`;
            const code = `APEX-G${targetGrade.level.toString().padStart(2, '0')}-${s.toString().padStart(2, '0')}`;

            studentRosterData.push({
                seq: studentSequence,
                fName,
                lName,
                email,
                code,
                cls: targetClass,
                grade: targetGrade,
                rankInClass: s
            });
        }
    }

    // Select primary video demo students for immediate Supabase Auth provisioning
    const prioritizedDemoEmails = new Set<string>();
    for (const item of studentRosterData) {
        if (item.rankInClass <= 3 || item.grade.level === 9 || item.grade.level === 10 || item.grade.level === 7) {
            prioritizedDemoEmails.add(item.email.toLowerCase());
        }
    }

    const studentAuthBatchQueue = studentRosterData
        .filter(st => prioritizedDemoEmails.has(st.email.toLowerCase()))
        .map(st => ({
            email: st.email,
            pass: PASSWORDS.STUDENT,
            name: `${st.fName} ${st.lName}`,
            role: 'STUDENT'
        }));

    console.log(`Provisioning ${studentAuthBatchQueue.length} primary video demo student accounts in Supabase Auth...`);
    await ensureAuthBatch(studentAuthBatchQueue, 10);
    console.log(`Supabase Auth accounts provisioned.`);

    // Batch insert User and Student records into PostgreSQL
    const studentUsersData: any[] = [];
    const studentsData: any[] = [];

    for (const st of studentRosterData) {
        const normalizedEmail = st.email.toLowerCase();
        const userId = globalExistingAuthUsers.get(normalizedEmail) || deterministicUuid(normalizedEmail);
        const studentId = `${SCHOOL_ID}-student-${st.seq}`;
        const baseBirthYear = 2026 - (st.grade.level + 6);
        const dob = new Date(`${baseBirthYear}-05-15`);

        studentUsersData.push({
            id: userId,
            email: st.email,
            name: `${st.fName} ${st.lName}`,
            role: 'STUDENT',
            schoolId: school.id,
            verified: true,
            preferences: { neuralSync: true, analyticExport: false, immersiveVisuals: true }
        });

        studentsData.push({
            id: studentId,
            userId: userId,
            schoolId: school.id,
            classId: st.cls.id,
            gradeId: st.grade.id,
            firstName: st.fName,
            lastName: st.lName,
            email: st.email,
            studentCode: st.code,
            enrollmentStatus: 'ACTIVE',
            enrolledAt: new Date('2026-08-15'),
            dob,
            guardianName: `Dr. Robert ${st.lName}`,
            guardianPhone: `+1-415-555-${(1000 + st.seq).toString().slice(1)}`,
            guardianRelation: 'Guardian',
            address: `${100 + st.seq} Academic Way, Silicon Valley, CA`
        });
    }

    await prisma.user.createMany({
        data: studentUsersData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${studentUsersData.length} student User accounts.`);

    await prisma.student.createMany({
        data: studentsData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${studentsData.length} Student scholastic profiles.`);

    // 10. Provision Parent Accounts & Student Links
    console.log('Step 10: Provisioning Parent Accounts & Custodial Linkages...');
    // Dawit Mengistu is Grade 10 Student 1 (index 180)
    // Sara Mengistu is Grade 7 Student 1 (index 120)
    const PARENT_PROFILES = [
        { email: 'parent1@apex.edu', name: 'Eleanor Vance', studentIndices: [180, 120] }, // Dawit Mengistu (G10) & Sara Mengistu (G7)
        { email: 'parent2@apex.edu', name: 'Robert Novak', studentIndices: [0, 20] }, // Grade 1-A & Grade 2-A
        { email: 'parent3@apex.edu', name: 'Dr. Kenji Chen', studentIndices: [160, 161] }, // Grade 9-A
        { email: 'parent4@apex.edu', name: 'Maria Dubois', studentIndices: [181, 182] }, // Lydia Tadesse & Kaleb Worku (Grade 10-A)
        { email: 'parent5@apex.edu', name: 'Thomas Sterling', studentIndices: [220, 221] } // Grade 12-A
    ];

    const parentAuthItems = PARENT_PROFILES.map(p => ({
        email: p.email,
        pass: PASSWORDS.PARENT,
        name: p.name,
        role: 'PARENT'
    }));
    await ensureAuthBatch(parentAuthItems, 5);

    const parentUsersData: any[] = [];
    const parentLinksData: any[] = [];

    for (const p of PARENT_PROFILES) {
        const authId = globalExistingAuthUsers.get(p.email.toLowerCase()) || deterministicUuid(p.email);
        parentUsersData.push({
            id: authId,
            email: p.email,
            name: p.name,
            role: 'PARENT',
            schoolId: school.id,
            verified: true,
            preferences: { neuralSync: true, analyticExport: false, immersiveVisuals: true }
        });

        for (const sIdx of p.studentIndices) {
            if (sIdx < studentsData.length) {
                const targetStudent = studentsData[sIdx];
                parentLinksData.push({
                    id: `link-${authId}-${targetStudent.id}`,
                    parentId: authId,
                    studentId: targetStudent.id,
                    pairingMethod: 'ADMIN',
                    verifiedAt: new Date()
                });
            }
        }
    }

    await prisma.user.createMany({
        data: parentUsersData,
        skipDuplicates: true
    });

    await prisma.parentStudentLink.createMany({
        data: parentLinksData,
        skipDuplicates: true
    });
    console.log(`Provisioned ${parentUsersData.length} parent users with custodial links.`);

    // 11. Provision Official Report Cards, Marklist Configs, Columns, and Student Marks
    console.log('Step 11: Generating 5-Subject Marklists, Ranks, and Official Report Card Dossiers...');
    
    const marklistConfigData: any[] = [];
    const marklistColumnData: any[] = [];
    const marklistEntryData: any[] = [];
    const marklistMarkData: any[] = [];

    // Core 5 distinct curriculum subjects for all classes:
    // Math (0), English (1), Physics (2), Biology (4), Computer Science (5)
    const CORE_EVALUATION_SUBJECTS = [subjects[0], subjects[1], subjects[2], subjects[4], subjects[5]];

    for (let cIdx = 0; cIdx < classes.length; cIdx++) {
        const cls = classes[cIdx];
        const classStudents = studentRosterData.filter(s => s.cls.id === cls.id);
        const homeroomLead = CLASS_HOMEROOM_MAP[cIdx];

        for (const subj of CORE_EVALUATION_SUBJECTS) {
            const configId = `mlc-${cls.id}-${subj.id}`;

            marklistConfigData.push({
                id: configId,
                classId: cls.id,
                subjectId: subj.id,
                schoolId: school.id,
                teacherId: homeroomLead.id,
                termId: termFall.id,
                status: 'PUBLISHED',
                isLocked: true
            });

            // 4 Continuous Assessment Columns (Total 100)
            const col1Id = `${configId}-col-1`;
            const col2Id = `${configId}-col-2`;
            const col3Id = `${configId}-col-3`;
            const col4Id = `${configId}-col-4`;

            marklistColumnData.push(
                { id: col1Id, configId, title: 'Continuous Assessment & Quizzes', maxMarks: 20, order: 1, isOptional: false },
                { id: col2Id, configId, title: 'Midterm Examination', maxMarks: 30, order: 2, isOptional: false },
                { id: col3Id, configId, title: 'Applied Projects & Practicum', maxMarks: 15, order: 3, isOptional: false },
                { id: col4Id, configId, title: 'Final Semester Examination', maxMarks: 35, order: 4, isOptional: false }
            );

            // Assign marks to each of the 20 students
            for (const item of classStudents) {
                const rank = item.rankInClass; // 1 to 20
                const targetPercentage = Math.round(98 - (rank - 1) * 1.85);

                const q1 = Math.round((20 * (targetPercentage + ((rank * 3) % 5) - 2)) / 100);
                const q2 = Math.round((30 * (targetPercentage + ((rank * 7) % 5) - 2)) / 100);
                const q3 = Math.round((15 * (targetPercentage + ((rank * 2) % 4) - 2)) / 100);
                const q4 = Math.round((35 * (targetPercentage - ((rank * 5) % 4) + 1)) / 100);
                const totalScore = Math.min(100, Math.max(45, q1 + q2 + q3 + q4));
                const finalPercentage = totalScore;

                let letterGrade = 'B';
                if (finalPercentage >= 93) letterGrade = 'A+';
                else if (finalPercentage >= 88) letterGrade = 'A';
                else if (finalPercentage >= 83) letterGrade = 'A-';
                else if (finalPercentage >= 78) letterGrade = 'B+';
                else if (finalPercentage >= 72) letterGrade = 'B';
                else if (finalPercentage >= 65) letterGrade = 'C+';
                else if (finalPercentage >= 60) letterGrade = 'C';
                else letterGrade = 'D';

                const remarkOptions = [
                    'Exemplary analytical rigor and consistent scholastic leadership.',
                    'Demonstrates sharp critical synthesis and thorough comprehension.',
                    'Consistent dedication and active participation in seminars.',
                    'Strong grasp of foundational principles with steady upward progress.',
                    'Capable student; encouraged to deepen conceptual clarity on complex topics.'
                ];
                const remark = remarkOptions[Math.min(remarkOptions.length - 1, Math.floor((rank - 1) / 4))];

                const studentDbId = `${SCHOOL_ID}-student-${item.seq}`;
                const entryId = `mle-${configId}-${studentDbId}`;

                marklistEntryData.push({
                    id: entryId,
                    configId,
                    studentId: studentDbId,
                    total: totalScore,
                    percentage: finalPercentage,
                    grade: letterGrade,
                    remarks: remark
                });

                marklistMarkData.push(
                    { id: `mark-${entryId}-1`, entryId, columnId: col1Id, score: q1 },
                    { id: `mark-${entryId}-2`, entryId, columnId: col2Id, score: q2 },
                    { id: `mark-${entryId}-3`, entryId, columnId: col3Id, score: q3 },
                    { id: `mark-${entryId}-4`, entryId, columnId: col4Id, score: q4 }
                );
            }
        }
    }

    await prisma.marklistConfig.createMany({
        data: marklistConfigData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${marklistConfigData.length} MarklistConfig dossiers (5 per class).`);

    await prisma.marklistColumn.createMany({
        data: marklistColumnData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${marklistColumnData.length} MarklistColumn assessment criteria.`);

    await prisma.marklistEntry.createMany({
        data: marklistEntryData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${marklistEntryData.length} MarklistEntry official records.`);

    await prisma.marklistMark.createMany({
        data: marklistMarkData,
        skipDuplicates: true
    });
    console.log(`Batch inserted ${marklistMarkData.length} individual MarklistMark item scores.`);

    // 12. Provision 25-Day Attendance Rosters
    console.log('Step 12: Generating 25-Day Student Attendance Rosters...');
    const attendanceDates: Date[] = [];
    const baseDate = new Date('2026-09-02');
    for (let dayOffset = 0; dayOffset < 35; dayOffset++) {
        const curDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Monday to Friday
            attendanceDates.push(curDate);
            if (attendanceDates.length >= 25) break;
        }
    }

    const attendanceData: any[] = [];
    for (const item of studentRosterData) {
        const studentDbId = `${SCHOOL_ID}-student-${item.seq}`;
        const rank = item.rankInClass;

        for (let d = 0; d < attendanceDates.length; d++) {
            const date = attendanceDates[d];
            let status: 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' = 'PRESENT';

            if ((d + rank) % 19 === 0) status = 'LATE';
            else if ((d + rank) % 27 === 0) status = 'EXCUSED';
            else if (rank > 17 && (d + rank) % 13 === 0) status = 'ABSENT';

            attendanceData.push({
                id: `att-${studentDbId}-${d}`,
                studentId: studentDbId,
                classId: item.cls.id,
                date,
                status,
                createdById: principalUser.id
            });
        }
    }

    for (let i = 0; i < attendanceData.length; i += 2000) {
        await prisma.attendanceRecord.createMany({
            data: attendanceData.slice(i, i + 2000),
            skipDuplicates: true
        });
    }
    console.log(`Batch inserted ${attendanceData.length} authentic attendance records.`);

    // 13. Provision Faculty Remarks and Academic Notes
    console.log('Step 13: Provisioning Faculty Student Remarks & Internal Academic Notes...');
    const studentRemarksData: any[] = [];
    const internalNotesData: any[] = [];

    for (const item of studentRosterData) {
        const studentDbId = `${SCHOOL_ID}-student-${item.seq}`;
        const homeroomLead = CLASS_HOMEROOM_MAP[item.grade.level - 1];

        studentRemarksData.push({
            id: `rem-${studentDbId}`,
            studentId: studentDbId,
            teacherId: homeroomLead.id,
            termId: termFall.id,
            content: `${item.fName} has demonstrated outstanding character, intellectual stamina, and collegial respect throughout this term.`
        });

        internalNotesData.push({
            id: `note-${studentDbId}`,
            studentId: studentDbId,
            authorId: principalUser.id,
            content: 'Academic dossier audited and certified for institutional verification and official transcript synthesis.'
        });
    }

    await prisma.studentRemark.createMany({
        data: studentRemarksData,
        skipDuplicates: true
    });

    await prisma.internalNote.createMany({
        data: internalNotesData,
        skipDuplicates: true
    });
    console.log(`Provisioned ${studentRemarksData.length} remarks and notes.`);

    // 14. Provision Exams and Grade Records for Teacher Gradebook & Student Portal
    console.log('Step 14: Provisioning Published Exams, Gradebook Records & AI Feedback...');
    const examData: any[] = [];
    const gradeRecordData: any[] = [];
    const attemptData: any[] = [];

    for (let cIdx = 0; cIdx < classes.length; cIdx++) {
        const cls = classes[cIdx];
        const classStudents = studentRosterData.filter(s => s.cls.id === cls.id);
        const mathSubject = subjects[0];
        const mathTeacher = facultyUsers[0].user;
        const examId = `exam-${cls.id}-midterm-math`;

        examData.push({
            id: examId,
            title: `${cls.name} Mid-Term Examination: Calculus & Formal Analysis`,
            description: 'Comprehensive evaluation covering theoretical foundations, analytical proofs, and applied problem sets.',
            classId: cls.id,
            subjectId: mathSubject.id,
            createdById: mathTeacher.id,
            termId: termFall.id,
            isPublished: true,
            totalMarks: 100,
            category: 'MID_TERM',
            dueAt: new Date('2026-10-15')
        });

        for (const cs of classStudents) {
            const studentDbId = `${SCHOOL_ID}-student-${cs.seq}`;
            const score = Math.max(55, Math.round(98 - (cs.rankInClass - 1) * 2));

            gradeRecordData.push({
                id: `gr-${examId}-${studentDbId}`,
                studentId: studentDbId,
                examId: examId,
                subjectId: mathSubject.id,
                score,
                createdById: mathTeacher.id,
                status: 'SUBMITTED',
                remark: 'Verified examination mark'
            });

            attemptData.push({
                id: `att-${examId}-${studentDbId}`,
                examId: examId,
                studentId: studentDbId,
                score,
                status: 'GRADED',
                startedAt: new Date('2026-10-14T09:00:00Z'),
                submittedAt: new Date('2026-10-14T10:15:00Z'),
                metadata: {
                    gradingDetails: [
                        { question: 'Evaluate the convergence of the infinite series', score: 25, feedback: 'Rigorous application of the ratio test.' },
                        { question: 'Derive the Euler-Lagrange equations of motion', score: 24, feedback: 'Precise variational derivation.' },
                        { question: 'Solve the multivariable boundary value problem', score: 23, feedback: 'Accurate boundary condition enforcement.' },
                        { question: 'Synthesize the thermodynamic entropy balance', score: 24, feedback: 'Comprehensive mechanical synthesis.' }
                    ]
                }
            });
        }
    }

    // Specific Act 07/08 Biology Exam on Grade 10-Alpha
    const bioExamId = `exam-${classes[9].id}-midterm-bio`;
    const bioSubject = subjects[4];
    const bioTeacher = facultyUsers[4].user; // Dr. Maya Patel

    examData.push({
        id: bioExamId,
        title: 'Midterm Biology Diagnostic',
        description: 'Cellular Respiration, Glycolysis, and ATP Synthase Mechanisms for Secondary School.',
        classId: classes[9].id, // Grade 10-Alpha
        subjectId: bioSubject.id,
        createdById: bioTeacher.id,
        termId: termFall.id,
        isPublished: true,
        totalMarks: 100,
        category: 'MID_TERM',
        duration: 60,
        dueAt: new Date('2026-10-20'),
        questions: [
            { id: 1, text: 'Which enzyme catalyzes the rate-limiting step of glycolysis?', options: ['Phosphofructokinase-1', 'Hexokinase', 'Pyruvate Kinase', 'Aldolase'], correctIndex: 0, points: 25 },
            { id: 2, text: 'What is the net yield of ATP molecules per glucose during anaerobic glycolysis?', options: ['2 ATP', '4 ATP', '32 ATP', '36 ATP'], correctIndex: 0, points: 25 },
            { id: 3, text: 'Where does oxidative phosphorylation take place within eukaryotic cells?', options: ['Inner mitochondrial membrane', 'Mitochondrial matrix', 'Outer membrane', 'Cytosol'], correctIndex: 0, points: 25 },
            { id: 4, text: 'What drives the rotational catalytic subunit of ATP Synthase (Complex V)?', options: ['Proton motive force across the cristae membrane', 'Direct electron tunneling', 'ATP hydrolysis', 'Substrate phosphorylation'], correctIndex: 0, points: 25 }
        ]
    });

    const dawitStudent = studentsData[180];
    const lydiaStudent = studentsData[181];

    gradeRecordData.push(
        {
            id: `gr-${bioExamId}-${dawitStudent.id}`,
            studentId: dawitStudent.id,
            examId: bioExamId,
            subjectId: bioSubject.id,
            score: 96,
            createdById: bioTeacher.id,
            status: 'SUBMITTED',
            remark: 'Distinguished biological diagnostic mark'
        },
        {
            id: `gr-${bioExamId}-${lydiaStudent.id}`,
            studentId: lydiaStudent.id,
            examId: bioExamId,
            subjectId: bioSubject.id,
            score: 88,
            createdById: bioTeacher.id,
            status: 'SUBMITTED',
            remark: 'Strong diagnostic score'
        }
    );

    attemptData.push(
        {
            id: `att-${bioExamId}-${dawitStudent.id}`,
            examId: bioExamId,
            studentId: dawitStudent.id,
            score: 96,
            status: 'COMPLETED',
            startedAt: new Date('2026-10-18T10:00:00Z'),
            submittedAt: new Date('2026-10-18T10:52:00Z'),
            answers: { '1': 0, '2': 0, '3': 0, '4': 0 },
            metadata: {
                gradingDetails: [
                    { question: 'Phosphofructokinase-1 mechanism', score: 25, feedback: 'Flawless identification of allosteric regulation.' },
                    { question: 'Net ATP yield calculation', score: 25, feedback: 'Precise stoichiometric calculation.' },
                    { question: 'Cristae membrane localization', score: 25, feedback: 'Correct identification.' },
                    { question: 'Proton motive rotational torque', score: 21, feedback: 'Thorough thermodynamic reasoning.' }
                ]
            }
        }
    );

    await prisma.exam.createMany({
        data: examData,
        skipDuplicates: true
    });

    await prisma.gradeRecord.createMany({
        data: gradeRecordData,
        skipDuplicates: true
    });

    await prisma.examAttempt.createMany({
        data: attemptData,
        skipDuplicates: true
    });
    console.log(`Provisioned ${examData.length} exams, ${gradeRecordData.length} gradebook records, and ${attemptData.length} AI attempt assessments.`);

    // 15. Provision Assignment with AI Scanner Diagnostics & Absence Authorization
    console.log('Step 15: Provisioning Assignment Submissions with AI Scanner & Absence Notes...');
    const litSubject = subjects[1];
    const litTeacher = facultyUsers[2].user; // Sarah Jenkins
    const essayAssignmentId = `${SCHOOL_ID}-assignment-lit-essay`;

    await prisma.assignment.upsert({
        where: { id: essayAssignmentId },
        update: {
            title: 'Critical Essay: The Ethics of Autonomous AI in Modern Society',
            description: 'Write a comprehensive analytical essay examining the moral, economic, and philosophical implications of pervasive AI systems in educational and institutional governance.',
            maxScore: 100,
            type: 'ESSAY',
            isPublished: true
        },
        create: {
            id: essayAssignmentId,
            schoolId: school.id,
            classId: classes[9].id, // Grade 10-Alpha
            subjectId: litSubject.id,
            teacherId: litTeacher.id,
            title: 'Critical Essay: The Ethics of Autonomous AI in Modern Society',
            description: 'Write a comprehensive analytical essay examining the moral, economic, and philosophical implications of pervasive AI systems in educational and institutional governance.',
            maxScore: 100,
            dueDate: new Date('2026-10-15'),
            type: 'ESSAY',
            isPublished: true
        }
    });

    await prisma.assignmentSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: essayAssignmentId, studentId: dawitStudent.id } },
        update: {},
        create: {
            assignmentId: essayAssignmentId,
            studentId: dawitStudent.id,
            schoolId: school.id,
            content: 'The rapid rise of autonomous artificial intelligence represents a watershed moment in human history. In educational governance, algorithmic decision-making promises unprecedented optimization of individualized learning pathways. However, unchecked delegation of pedagogical authority introduces critical risks of epistemic opacity and institutional dehumanization. Students are not merely telemetry endpoints to be calibrated; they are autonomous cognitive agents whose moral formation requires human empathy, mentorship, and ethical friction.',
            grade: 96,
            status: 'GRADED',
            aiScanResult: {
                authenticityScore: 94,
                originClassification: 'AUTHENTIC',
                authenticityReasoning: 'Vibrant, natural syntactic variation with nuanced vocabulary and authentic rhetorical pacing.',
                flaggedPassages: [],
                thesisSummary: 'AI in education must serve as an empowering epistemic tool rather than an unguided autonomous authority.',
                keyArguments: [
                    'Individualized learning optimization versus risk of dehumanization.',
                    'Students are moral agents, not mere telemetry data streams.',
                    'Human empathy and mentorship remain irreplaceable in pedagogical governance.'
                ],
                strengths: ['Exceptional vocabulary precision', 'Strong philosophical cohesion', 'Compelling thesis articulation'],
                growthAreas: ['Could incorporate quantitative case studies on existing algorithmic tutoring systems.'],
                readabilityScore: 'Grade 11-12 (Lexile 1280L)',
                suggestedScore: 96,
                suggestedFeedback: 'Brilliant philosophical synthesis! Your argument regarding epistemic opacity is particularly sharp and timely.',
                wordCount: 78,
                scannedAt: new Date().toISOString()
            }
        }
    });

    await prisma.absenceAuthorization.upsert({
        where: { id: `auth-req-dawit-medical` },
        update: {},
        create: {
            id: `auth-req-dawit-medical`,
            studentId: dawitStudent.id,
            requestorId: parentUsersData[0].id,
            startDate: new Date('2026-10-04'),
            endDate: new Date('2026-10-05'),
            reason: 'Severe respiratory fever under physician care.',
            status: 'APPROVED'
        }
    });

    // 16. Digital Library Textbooks
    console.log('Step 16: Provisioning Digital Library Textbooks...');
    const booksData = [
        {
            id: `${SCHOOL_ID}-book-calc`,
            title: 'Principles of Mathematical Analysis & Real Variables',
            author: 'Walter Rudin',
            description: 'Rigorous foundation in single and multivariable real analysis, metric spaces, and Riemann-Stieltjes integration.',
            fileUrl: 'https://example.com/books/rudin-analysis.pdf',
            schoolId: school.id,
            gradeId: grades[9].id,
            classId: classes[9].id,
            subjectId: subjects[0].id,
            academicYear: '2026',
            edition: '3rd Ed'
        },
        {
            id: `${SCHOOL_ID}-book-phys`,
            title: 'Classical Electrodynamics & Quantum Mechanics',
            author: 'John David Jackson',
            description: 'Comprehensive graduate-level survey of electromagnetic radiation, boundary value problems, and relativistic fields.',
            fileUrl: 'https://example.com/books/jackson-electrodynamics.pdf',
            schoolId: school.id,
            gradeId: grades[9].id,
            classId: classes[9].id,
            subjectId: subjects[2].id,
            academicYear: '2026',
            edition: '4th Ed'
        },
        {
            id: `${SCHOOL_ID}-book-bio`,
            title: 'Molecular Biology of the Cell & Genetic Architecture',
            author: 'Bruce Alberts et al.',
            description: 'Authoritative examination of internal cell architecture, signal transduction, and transcriptional control mechanisms.',
            fileUrl: 'https://example.com/books/alberts-molecular-bio.pdf',
            schoolId: school.id,
            gradeId: grades[9].id,
            classId: classes[9].id,
            subjectId: subjects[4].id,
            academicYear: '2026',
            edition: '6th Ed'
        },
        {
            id: `${SCHOOL_ID}-book-cs`,
            title: 'Artificial Intelligence: A Modern Pedagogical Approach',
            author: 'Stuart Russell & Peter Norvig',
            description: 'The definitive text on autonomous agents, probabilistic reasoning, machine perception, and safety engineering.',
            fileUrl: 'https://example.com/books/norvig-ai.pdf',
            schoolId: school.id,
            gradeId: grades[9].id,
            classId: classes[9].id,
            subjectId: subjects[5].id,
            academicYear: '2026',
            edition: '4th Ed'
        }
    ];

    await prisma.book.createMany({
        data: booksData,
        skipDuplicates: true
    });
    console.log(`Provisioned ${booksData.length} library textbooks.`);

    // 17. Fee Structures, Invoices, Payments, Staff Payroll & Expenses
    console.log('Step 17: Provisioning Financial Ledger, Payroll & Institutional Expenses...');
    await prisma.feeStructure.upsert({
        where: { id: `${SCHOOL_ID}-fee-tuition-senior` },
        update: { amount: 8500 },
        create: {
            id: `${SCHOOL_ID}-fee-tuition-senior`,
            name: 'Senior Laureate Academic Tuition',
            amount: 8500,
            category: 'TUITION',
            frequency: 'TERM',
            schoolId: school.id,
            description: 'Comprehensive semester tuition covering collegiate faculty instruction and laboratories.'
        }
    });

    await prisma.feeStructure.upsert({
        where: { id: `${SCHOOL_ID}-fee-tuition-primary` },
        update: { amount: 5400 },
        create: {
            id: `${SCHOOL_ID}-fee-tuition-primary`,
            name: 'Primary Foundation Tuition',
            amount: 5400,
            category: 'TUITION',
            frequency: 'TERM',
            schoolId: school.id,
            description: 'Elementary foundation program tuition including learning materials.'
        }
    });

    const invoiceData: any[] = [];
    const paymentData: any[] = [];

    for (let i = 0; i < 20; i++) {
        const st = studentRosterData[i];
        const studentDbId = `${SCHOOL_ID}-student-${st.seq}`;
        const isPaid = i < 15;
        const invId = `inv-${studentDbId}`;

        invoiceData.push({
            id: invId,
            studentId: studentDbId,
            schoolId: school.id,
            amount: 5400,
            dueDate: new Date('2026-11-01'),
            status: isPaid ? 'PAID' : 'PENDING'
        });

        if (isPaid) {
            paymentData.push({
                id: `pay-${invId}`,
                invoiceId: invId,
                amount: 5400,
                method: 'BANK_TRANSFER',
                reference: `REF-APEX-WIRE-${1000 + i}`,
                status: 'SUCCESS'
            });
        }
    }

    await prisma.invoice.createMany({
        data: invoiceData,
        skipDuplicates: true
    });

    await prisma.payment.createMany({
        data: paymentData,
        skipDuplicates: true
    });

    const payrollData = facultyUsers.map((f, i) => ({
        id: `pay-staff-${f.user.id}`,
        userId: f.user.id,
        amount: 6800 + (i * 200),
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-30'),
        status: 'COMPLETED' as any,
        method: 'BANK_TRANSFER' as any,
        reference: `REF-PAYROLL-SEP-${1000 + i}`,
        notes: 'Certified monthly faculty compensation deposit.'
    }));

    await prisma.staffPayroll.createMany({
        data: payrollData,
        skipDuplicates: true
    });

    const expensesData = [
        {
            id: `${SCHOOL_ID}-exp-1`,
            schoolId: school.id,
            title: 'Superconducting Quantum Laboratory Workstations',
            amount: 38500,
            category: 'EQUIPMENT' as any,
            description: 'Procured 16 high-throughput neural processing terminals for high-performance student research laboratory.',
            loggedById: ownerUser.id
        },
        {
            id: `${SCHOOL_ID}-exp-2`,
            schoolId: school.id,
            title: 'Campus High-Speed Fiber Optics Backbone',
            amount: 14200,
            category: 'SERVICES' as any,
            description: 'Dedicated 10Gbps optical uplink connectivity for real-time video telemetry and latency resilience.',
            loggedById: ownerUser.id
        },
        {
            id: `${SCHOOL_ID}-exp-3`,
            schoolId: school.id,
            title: 'Digital Academic Library Licensing Subscriptions',
            amount: 9800,
            category: 'BOOKS' as any,
            description: 'Institutional site license for global research journal archives and vector textbooks.',
            loggedById: principalUser.id
        }
    ];

    await prisma.institutionalExpense.createMany({
        data: expensesData,
        skipDuplicates: true
    });
    console.log(`Financial ledger complete: invoices, payments, staff payroll, and expenses recorded.`);

    // 18. Audit Log Invariant Compliance
    console.log('Step 18: Recording Multi-Tenant Audit Log Invariant...');
    await prisma.auditLog.create({
        data: {
            userId: principalUser.id,
            schoolId: school.id,
            action: 'INSTITUTION_PROVISION_COMPLETE',
            resourceType: 'School',
            resourceId: school.id,
            level: 'INFO',
            path: '/scripts/seed-full-enterprise-school.ts',
            after: {
                schoolName: SCHOOL_NAME,
                schoolCode: SCHOOL_CODE,
                totalGrades: 12,
                totalClasses: 12,
                totalStudents: studentRosterData.length,
                totalFaculty: facultyUsers.length,
                status: 'ACTIVE'
            }
        }
    });
    console.log('Multi-tenant audit log record created with non-null schoolId.');

    // Summary Credentials Report
    console.log('\n===========================================================================');
    console.log('APEX HORIZON INTERNATIONAL ACADEMY MASTER PROVISIONING FINISHED');
    console.log('===========================================================================');
    console.log(`School:             ${SCHOOL_NAME} [Code: ${SCHOOL_CODE}]`);
    console.log(`Academic Term:      ${termFall.name} (ACTIVE)`);
    console.log(`Grades:             12 Grades (Grade 1 through Grade 12)`);
    console.log(`Classes:            12 Cohort Classes (Grade 1-Alpha through Grade 12-Alpha)`);
    console.log(`Students:           240 Enrolled Scholars (20 in every class)`);
    console.log(`Faculty:            14 Specialized Teachers (12 Homeroom Leads Assigned)`);
    console.log(`Official Dossiers:  240 Comprehensive Report Cards with Exact Class Ranks (#1 to #20)`);
    console.log(`Attendance Vitals:  25 Days of Daily Records per Student (6,000 Records Total)`);
    console.log(`Assignments:        Critical Essay with Live AI Scanner Diagnostics`);
    console.log(`Exams:              13 Exams (Including Biology Diagnostic with Question Banks)`);
    console.log(`Library Books:      4 Core Scientific & AI Textbooks`);
    console.log('---------------------------------------------------------------------------');
    console.log('EXECUTIVE TEST CREDENTIALS (READY FOR VIDEO PRODUCTION):');
    console.log('---------------------------------------------------------------------------');
    console.log(`School Owner:       owner@apex.edu               / Pass: ${PASSWORDS.OWNER}`);
    console.log(`Academy Principal:  principal@apex.edu           / Pass: ${PASSWORDS.PRINCIPAL}`);
    console.log(`Teacher 1 (Math):   teacher1@apex.edu (Marcus)   / Pass: ${PASSWORDS.TEACHER} [Homeroom 9-Alpha]`);
    console.log(`Teacher 2 (Phys):   teacher2@apex.edu (Elena)    / Pass: ${PASSWORDS.TEACHER} [Homeroom 10-Alpha]`);
    console.log(`Teacher 3 (Lit):    teacher3@apex.edu (Sarah)    / Pass: ${PASSWORDS.TEACHER} [Homeroom 11-Alpha]`);
    console.log(`Teacher 4 (Chem):   teacher4@apex.edu (Kenji)    / Pass: ${PASSWORDS.TEACHER} [Homeroom 12-Alpha]`);
    console.log(`Teachers 5-14:      teacher5@apex.edu to teacher14@apex.edu / Pass: ${PASSWORDS.TEACHER}`);
    console.log(`Parent 1 (Dawit+Sara): parent1@apex.edu          / Pass: ${PASSWORDS.PARENT}`);
    console.log(`Parent 4 (Lydia):   parent4@apex.edu             / Pass: ${PASSWORDS.PARENT}`);
    console.log(`Grade 10 Scholar #1:student181@apex.edu (Dawit)  / Pass: ${PASSWORDS.STUDENT} [Code: APEX-G10-01, Rank #1]`);
    console.log(`Grade 10 Scholar #2:student182@apex.edu (Lydia)  / Pass: ${PASSWORDS.STUDENT} [Code: APEX-G10-02, Rank #2]`);
    console.log(`Grade 10 Scholar #3:student183@apex.edu (Kaleb)  / Pass: ${PASSWORDS.STUDENT} [Code: APEX-G10-03, Rank #3]`);
    console.log(`Grade 7 Scholar #1: student121@apex.edu (Sara)   / Pass: ${PASSWORDS.STUDENT} [Code: APEX-G07-01, Rank #1]`);
    console.log(`Grade 9 Scholar #1: student161@apex.edu          / Pass: ${PASSWORDS.STUDENT} [Code: APEX-G09-01, Rank #1]`);
    console.log(`Grade 12 Scholar #1:student221@apex.edu          / Pass: ${PASSWORDS.STUDENT} [Code: APEX-G12-01, Rank #1]`);
    console.log('===========================================================================\n');
}

main()
    .catch((e) => {
        console.error('Fatal Provisioning Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
