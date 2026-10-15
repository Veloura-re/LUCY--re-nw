import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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
const DEFAULT_PASSWORD = 'Lucy@Password2026!';

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
    'Ezra', 'Bella', 'Colton', 'Claire', 'Angel', 'Skylar', 'Roman', 'Lucy', 'Landon', 'Paisley'
];

const LAST_NAMES = [
    'Vance', 'Sterling', 'Novak', 'Thornton', 'Mercer', 'Blackwood', 'Chen', 'Dubois', 'Kowalski', 'Tanaka',
    'Rousseau', 'Sinclair', 'Castillo', 'Hawthorne', 'Montgomery', 'Lindqvist', 'Al-Mansoor', 'O\'Connor', 'Kassaye', 'Tadesse',
    'Bekele', 'Abebe', 'Mendoza', 'Fischer', 'Yamamoto', 'Gomez', 'Sato', 'Moreau', 'Haddad', 'Nakamura',
    'Okafor', 'Mensah', 'Diallo', 'Traore', 'Kamara', 'Borges', 'Silva', 'Santos', 'Costa', 'Pereira',
    'Ivanov', 'Petrov', 'Popov', 'Sokolov', 'Morozov', 'Ferrari', 'Rossi', 'Ricci', 'Marino', 'Greco'
];

async function ensureAuthUser(email: string, pass: string, name: string, role: string) {
    try {
        const { data: usersData } = await sb.auth.admin.listUsers({ perPage: 1000 });
        const existing = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        let authId = '';
        if (existing) {
            authId = existing.id;
            await sb.auth.admin.updateUserById(authId, {
                password: pass,
                user_metadata: { role, name }
            });
        } else {
            const { data: created, error } = await sb.auth.admin.createUser({
                email,
                password: pass,
                email_confirm: true,
                user_metadata: { role, name }
            });
            if (error) throw error;
            authId = created.user.id;
        }

        return authId;
    } catch (e: any) {
        console.warn(`Auth user provision warning (${email}):`, e.message);
        return null;
    }
}

async function main() {
    console.log('\n======================================================');
    console.log('   LUCY OS ACADEMY PROVISIONING ENGINE');
    console.log(`  School: ${SCHOOL_NAME} (${SCHOOL_CODE})`);
    console.log('======================================================\n');

    // 1. Create or Update School
    console.log('1. Provisioning School Record...');
    const school = await prisma.school.upsert({
        where: { schoolCode: SCHOOL_CODE },
        update: {
            name: SCHOOL_NAME,
            domain: 'apexhorizon.lucy.edu',
            status: 'ACTIVE',
            subscriptionStatus: 'active',
            address: '742 Evergreen Quantum Boulevard, Silicon Valley, CA',
            logoUrl: '/apple-icon.png',
            attendanceConfig: {
                type: 'PERIOD',
                lockAfterMinutes: 30,
                enableLateMarking: true
            }
        },
        create: {
            id: SCHOOL_ID,
            name: SCHOOL_NAME,
            schoolCode: SCHOOL_CODE,
            domain: 'apexhorizon.lucy.edu',
            status: 'ACTIVE',
            subscriptionStatus: 'active',
            address: '742 Evergreen Quantum Boulevard, Silicon Valley, CA',
            logoUrl: '/apple-icon.png',
            attendanceConfig: {
                type: 'PERIOD',
                lockAfterMinutes: 30,
                enableLateMarking: true
            }
        }
    });

    console.log(`  School ID: ${school.id}`);

    // 2. Provision Academic Terms
    console.log('\n2. Provisioning Academic Terms...');
    const term1 = await prisma.academicTerm.upsert({
        where: { id: `${SCHOOL_ID}-term-1` },
        update: { name: 'Fall Semester 2026', isActive: true, schoolId: school.id },
        create: {
            id: `${SCHOOL_ID}-term-1`,
            schoolId: school.id,
            name: 'Fall Semester 2026',
            startDate: new Date('2026-09-01'),
            endDate: new Date('2026-12-20'),
            isActive: true
        }
    });

    // 3. Provision Core Subjects
    console.log('\n3. Provisioning Core Curriculum Subjects...');
    const SUBJECT_NAMES = [
        'Advanced Mathematics',
        'Physics & Quantum Mechanics',
        'English Literature & Rhetoric',
        'Inorganic & Organic Chemistry',
        'Molecular Biology',
        'Computer Science & AI Systems',
        'World History & Civilization',
        'Geopolitical Geography',
        'Visual Arts & Media',
        'Physical Health & Athletics'
    ];

    const subjects: any[] = [];
    for (const name of SUBJECT_NAMES) {
        const subId = `${SCHOOL_ID}-subj-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const s = await prisma.subject.upsert({
            where: { id: subId },
            update: { name, schoolId: school.id },
            create: { id: subId, name, schoolId: school.id }
        });
        subjects.push(s);
    }
    console.log(`  Created ${subjects.length} subjects.`);

    // 4. Provision Principal
    console.log('\n4. Provisioning Academy Principal...');
    const principalEmail = 'principal@apex.edu';
    const principalName = 'Dr. Evelyn Vance';
    const principalAuthId = await ensureAuthUser(principalEmail, 'Lucy@Principal2026!', principalName, 'PRINCIPAL');

    const principalUser = await prisma.user.upsert({
        where: { email: principalEmail },
        update: {
            name: principalName,
            role: 'PRINCIPAL',
            schoolId: school.id,
            verified: true
        },
        create: {
            id: principalAuthId || undefined,
            email: principalEmail,
            name: principalName,
            role: 'PRINCIPAL',
            schoolId: school.id,
            verified: true
        }
    });
    console.log(`  Principal: ${principalUser.name} (${principalUser.email})`);

    // 5. Provision 10 Teachers
    console.log('\n5. Provisioning 10 Faculty Teachers...');
    const TEACHER_PROFILES = [
        { name: 'Prof. Marcus Aurelius', email: 'teacher1@apex.edu', subjectIdx: 0, title: 'Head of Mathematics' },
        { name: 'Dr. Elena Rostova', email: 'teacher2@apex.edu', subjectIdx: 1, title: 'Chair of Physics' },
        { name: 'Sarah Jenkins, M.A.', email: 'teacher3@apex.edu', subjectIdx: 2, title: 'Lead Literature Faculty' },
        { name: 'Dr. Kenji Tanaka', email: 'teacher4@apex.edu', subjectIdx: 3, title: 'Senior Chemistry Professor' },
        { name: 'Dr. Maya Patel', email: 'teacher5@apex.edu', subjectIdx: 4, title: 'Biology Research Director' },
        { name: 'Alan Turing Jr.', email: 'teacher6@apex.edu', subjectIdx: 5, title: 'AI & Systems Lead' },
        { name: 'Prof. David O\'Connor', email: 'teacher7@apex.edu', subjectIdx: 6, title: 'History & Ethics Chair' },
        { name: 'Amara Diallo, M.Sc.', email: 'teacher8@apex.edu', subjectIdx: 7, title: 'Geopolitical Studies' },
        { name: 'Isabella Chen', email: 'teacher9@apex.edu', subjectIdx: 8, title: 'Fine Arts Studio Director' },
        { name: 'Coach Viktor Vance', email: 'teacher10@apex.edu', subjectIdx: 9, title: 'Athletics & Human Dynamics' }
    ];

    const teacherUsers: any[] = [];
    for (let i = 0; i < TEACHER_PROFILES.length; i++) {
        const tp = TEACHER_PROFILES[i];
        const authId = await ensureAuthUser(tp.email, 'Lucy@Teacher2026!', tp.name, 'TEACHER');
        const user = await prisma.user.upsert({
            where: { email: tp.email },
            update: {
                name: tp.name,
                role: 'TEACHER',
                schoolId: school.id,
                verified: true,
                teacherCode: `TCH-${100 + i + 1}`,
                qualification: tp.title
            },
            create: {
                id: authId || undefined,
                email: tp.email,
                name: tp.name,
                role: 'TEACHER',
                schoolId: school.id,
                verified: true,
                teacherCode: `TCH-${100 + i + 1}`,
                qualification: tp.title
            }
        });
        teacherUsers.push({ user, profile: tp });
    }
    console.log(`  Provisioned ${teacherUsers.length} teachers.`);

    // 6. Provision Grades & 4 Classes (with assigned Homeroom Teachers)
    console.log('\n6. Provisioning Grades & 4 Cohort Classes...');
    
    // Grade 9
    const grade9 = await prisma.grade.upsert({
        where: { id: `${SCHOOL_ID}-grade-9` },
        update: { level: 9, name: 'Grade 9 (Freshman)', schoolId: school.id },
        create: { id: `${SCHOOL_ID}-grade-9`, level: 9, name: 'Grade 9 (Freshman)', schoolId: school.id }
    });

    // Grade 10
    const grade10 = await prisma.grade.upsert({
        where: { id: `${SCHOOL_ID}-grade-10` },
        update: { level: 10, name: 'Grade 10 (Sophomore)', schoolId: school.id },
        create: { id: `${SCHOOL_ID}-grade-10`, level: 10, name: 'Grade 10 (Sophomore)', schoolId: school.id }
    });

    const CLASSES_CONFIG = [
        { id: `${SCHOOL_ID}-class-9a`, name: 'Grade 9-Alpha (Nova)', grade: grade9, homeroomTeacher: teacherUsers[0].user },
        { id: `${SCHOOL_ID}-class-9b`, name: 'Grade 9-Beta (Solar)', grade: grade9, homeroomTeacher: teacherUsers[1].user },
        { id: `${SCHOOL_ID}-class-10a`, name: 'Grade 10-Alpha (Cosmos)', grade: grade10, homeroomTeacher: teacherUsers[2].user },
        { id: `${SCHOOL_ID}-class-10b`, name: 'Grade 10-Beta (Pulsar)', grade: grade10, homeroomTeacher: teacherUsers[3].user },
    ];

    const classes: any[] = [];
    for (const cc of CLASSES_CONFIG) {
        const cls = await prisma.class.upsert({
            where: { id: cc.id },
            update: {
                name: cc.name,
                gradeId: cc.grade.id,
                schoolId: school.id,
                homeroomTeacherId: cc.homeroomTeacher.id
            },
            create: {
                id: cc.id,
                name: cc.name,
                gradeId: cc.grade.id,
                schoolId: school.id,
                homeroomTeacherId: cc.homeroomTeacher.id
            }
        });
        classes.push(cls);
        console.log(`  Class: ${cls.name} -> Homeroom: ${cc.homeroomTeacher.name}`);
    }

    // 7. Assign Faculty to Classes (TeacherAssignment)
    console.log('\n7. Mapping Faculty to Class Subject Rosters...');
    for (const cls of classes) {
        for (const t of teacherUsers) {
            const subject = subjects[t.profile.subjectIdx];
            const assignId = `ta-${cls.id}-${t.user.id}-${subject.id}`;
            await prisma.teacherAssignment.upsert({
                where: { id: assignId },
                update: { periodsPerWeek: 5 },
                create: {
                    id: assignId,
                    teacherId: t.user.id,
                    classId: cls.id,
                    subjectId: subject.id,
                    periodsPerWeek: 5
                }
            });
        }
    }
    console.log('  Faculty roster mapped across all 4 classes.');

    // 8. Provision 100 Students (25 students per class)
    console.log('\n8. Provisioning 100 Students across 4 Cohort Classes (25/class)...');
    
    let studentCount = 0;
    const allCreatedStudents: any[] = [];

    for (let cIdx = 0; cIdx < classes.length; cIdx++) {
        const targetClass = classes[cIdx];
        console.log(`  → Provisioning 25 students for ${targetClass.name}...`);

        for (let s = 1; s <= 25; s++) {
            studentCount++;
            const fName = FIRST_NAMES[(studentCount - 1) % FIRST_NAMES.length];
            const lName = LAST_NAMES[(studentCount + cIdx * 7) % LAST_NAMES.length];
            const email = `student${studentCount}@apex.edu`;
            const code = `APEX-${cIdx < 2 ? '9' : '10'}${cIdx % 2 === 0 ? 'A' : 'B'}-${s.toString().padStart(2, '0')}`;

            const authId = await ensureAuthUser(email, 'Lucy@Student2026!', `${fName} ${lName}`, 'STUDENT');

            const userRecord = await prisma.user.upsert({
                where: { email },
                update: {
                    name: `${fName} ${lName}`,
                    role: 'STUDENT',
                    schoolId: school.id,
                    verified: true
                },
                create: {
                    id: authId || undefined,
                    email,
                    name: `${fName} ${lName}`,
                    role: 'STUDENT',
                    schoolId: school.id,
                    verified: true
                }
            });

            const studentRecord = await prisma.student.upsert({
                where: { studentCode: code },
                update: {
                    userId: userRecord.id,
                    schoolId: school.id,
                    classId: targetClass.id,
                    gradeId: targetClass.gradeId,
                    firstName: fName,
                    lastName: lName,
                    email,
                    enrollmentStatus: 'ACTIVE'
                },
                create: {
                    id: `${SCHOOL_ID}-student-${studentCount}`,
                    userId: userRecord.id,
                    schoolId: school.id,
                    classId: targetClass.id,
                    gradeId: targetClass.gradeId,
                    firstName: fName,
                    lastName: lName,
                    email,
                    studentCode: code,
                    enrollmentStatus: 'ACTIVE',
                    enrolledAt: new Date('2026-08-01')
                }
            });

            allCreatedStudents.push({ user: userRecord, student: studentRecord, class: targetClass });
        }
    }
    console.log(`  Successfully provisioned ${allCreatedStudents.length} students!`);

    // 9. Provision Demo Assignments with Student Submissions & AI Scan Diagnostics
    console.log('\n9. Provisioning Demo Assignments & Submissions with AI Scanner reports...');
    
    const leadTeacher = teacherUsers[2].user; // Sarah Jenkins (Literature)
    const litSubject = subjects[2];

    const assignment = await prisma.assignment.upsert({
        where: { id: `${SCHOOL_ID}-assignment-lit-essay` },
        update: {
            title: 'Critical Essay: The Ethics of Autonomous AI in Modern Society',
            description: 'Write a comprehensive analytical essay examining the moral, economic, and philosophical implications of pervasive AI systems in educational and institutional governance.',
            maxScore: 100,
            type: 'ESSAY' as any,
            isPublished: true
        },
        create: {
            id: `${SCHOOL_ID}-assignment-lit-essay`,
            schoolId: school.id,
            classId: classes[2].id, // Grade 10-Alpha
            subjectId: litSubject.id,
            teacherId: leadTeacher.id,
            title: 'Critical Essay: The Ethics of Autonomous AI in Modern Society',
            description: 'Write a comprehensive analytical essay examining the moral, economic, and philosophical implications of pervasive AI systems in educational and institutional governance.',
            maxScore: 100,
            dueDate: new Date('2026-09-15'),
            type: 'ESSAY' as any,
            isPublished: true
        }
    });

    // Seed 3 sample submissions for testing the AI Scanner HUD
    const sampleSubmissions = [
        {
            student: allCreatedStudents[50].student, // 10-Alpha student 1
            content: `The rapid rise of autonomous artificial intelligence represents a watershed moment in human history. In educational governance, algorithmic decision-making promises unprecedented optimization of individualized learning pathways. However, unchecked delegation of pedagogical authority introduces critical risks of epistemic opacity and institutional dehumanization. Students are not merely telemetry endpoints to be calibrated; they are autonomous cognitive agents whose moral formation requires human empathy, mentorship, and ethical friction. We must ensure AI remains an epistemic prosthetic rather than an unguided sovereign.`,
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
                grammarAndStyleNotes: ['Sophisticated compound-complex sentence cadence.'],
                suggestedScore: 95,
                suggestedFeedback: 'Brilliant philosophical synthesis! Your argument regarding epistemic opacity is particularly sharp and timely.',
                contentHash: 'a7b9c1d3',
                wordCount: 78,
                scannedAt: new Date().toISOString()
            }
        },
        {
            student: allCreatedStudents[51].student, // 10-Alpha student 2
            content: `Artificial intelligence is important in modern society. There are many benefits and also many drawbacks. Firstly, AI can automate repetitive tasks like grading and schedule planning. Secondly, AI algorithms can analyze student performance and identify areas of weakness. In conclusion, artificial intelligence has both positive aspects and negative challenges that must be carefully managed by school leaders.`,
            grade: null,
            status: 'SUBMITTED',
            aiScanResult: {
                authenticityScore: 68,
                originClassification: 'MIXED',
                authenticityReasoning: 'Standard formulaic five-paragraph essay structure with repetitive transitional signposts.',
                flaggedPassages: [
                    {
                        passage: 'In conclusion, artificial intelligence has both positive aspects and negative challenges...',
                        reason: 'Highly standardized generic conclusion phrasing common in template models.',
                        riskLevel: 'LOW'
                    }
                ],
                thesisSummary: 'AI offers utility in automating administrative tasks but presents management challenges.',
                keyArguments: ['Task automation in grading', 'Diagnostic analysis of student weaknesses'],
                strengths: ['Clear organizational structure', 'Grammatically sound'],
                growthAreas: ['Develop deeper personal voice and specific supporting evidence.'],
                readabilityScore: 'Grade 8-9 (Lexile 950L)',
                grammarAndStyleNotes: ['Repetitive sentence starters (Firstly, Secondly, In conclusion).'],
                suggestedScore: 78,
                suggestedFeedback: 'Good basic structure. Focus on pushing past formulaic transitions to develop your own unique critical voice.',
                contentHash: 'b8c2d4e6',
                wordCount: 52,
                scannedAt: new Date().toISOString()
            }
        }
    ];

    for (const sub of sampleSubmissions) {
        await prisma.assignmentSubmission.upsert({
            where: {
                assignmentId_studentId: {
                    assignmentId: assignment.id,
                    studentId: sub.student.id
                }
            },
            update: {
                content: sub.content,
                grade: sub.grade as any,
                status: sub.status as any,
                aiScanResult: sub.aiScanResult as any,
                schoolId: school.id
            } as any,
            create: {
                assignmentId: assignment.id,
                studentId: sub.student.id,
                schoolId: school.id,
                content: sub.content,
                grade: sub.grade as any,
                status: sub.status as any,
                aiScanResult: sub.aiScanResult as any
            } as any
        });
    }
    console.log('  Seeded sample submissions with live AI Scanner data.');

    // ── Summary Credentials Report ──
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('   APEX HORIZON INTERNATIONAL ACADEMY PROVISIONED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    console.log(`  School:   ${SCHOOL_NAME} [Code: ${SCHOOL_CODE}]`);
    console.log(`  Cohorts:  4 Classes (9-A, 9-B, 10-A, 10-B) with 25 students each`);
    console.log(`  Faculty:  10 Teachers (4 Homeroom Leads)`);
    console.log(`  Scholars: 100 Enrolled Active Students`);
    console.log('───────────────────────────────────────────────────────────────────────────');
    console.log('  CORE TEST CREDENTIALS:');
    console.log('───────────────────────────────────────────────────────────────────────────');
    console.log(`  Principal: principal@apex.edu       / Pass: Lucy@Principal2026!`);
    console.log(`  Teacher 1: teacher1@apex.edu (Math) / Pass: Lucy@Teacher2026! [Homeroom 9-A]`);
    console.log(`  Teacher 2: teacher2@apex.edu (Phys) / Pass: Lucy@Teacher2026! [Homeroom 9-B]`);
    console.log(`  Teacher 3: teacher3@apex.edu (Lit)  / Pass: Lucy@Teacher2026! [Homeroom 10-A]`);
    console.log(`  Teacher 4: teacher4@apex.edu (Chem) / Pass: Lucy@Teacher2026! [Homeroom 10-B]`);
    console.log(`  Teachers 5-10: teacher5@apex.edu to teacher10@apex.edu / Pass: Lucy@Teacher2026!`);
    console.log(`  Student 1:  student1@apex.edu (9-A)  / Pass: Lucy@Student2026! [Code: APEX-9A-01]`);
    console.log(`  Student 26: student26@apex.edu (9-B) / Pass: Lucy@Student2026! [Code: APEX-9B-01]`);
    console.log(`  Student 51: student51@apex.edu (10-A)/ Pass: Lucy@Student2026! [Code: APEX-10A-01]`);
    console.log(`  Student 76: student76@apex.edu (10-B)/ Pass: Lucy@Student2026! [Code: APEX-10B-01]`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

main()
    .catch((e) => {
        console.error('Fatal Provisioning Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
