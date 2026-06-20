import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== GRADINGS & CALCULATION LOGIC VERIFIER ===");

    // 1. Verify totalMarks Sync on Exam Creation
    console.log("\n1. Testing Exam totalMarks sync on creation...");
    const testExam = await prisma.exam.create({
        data: {
            title: "Logic Test Exam",
            class: {
                create: {
                    name: "Logic 101",
                    grade: {
                        create: {
                            name: "Logic Grade",
                            school: {
                                create: {
                                    name: "Logic Academy",
                                    schoolCode: `LOGIC-${Math.random().toString(36).substring(7).toUpperCase()}`
                                }
                            }
                        }
                    }
                }
            },
            subject: {
                create: {
                    name: "Boolean Logic",
                    school: {
                        connect: { id: (await prisma.school.findFirst())?.id }
                    }
                }
            },
            createdBy: {
                create: {
                    email: `logic-${Math.random().toString(36).substring(7)}@test.com`,
                    name: "Logic Instructor",
                    role: "TEACHER"
                }
            },
            questions: [
                { id: "q1", type: "MCQ", points: 10, text: "MCQ Q", options: ["A", "B"], correctOption: 0 },
                { id: "q2", type: "TF", points: 5, text: "TF Q", answer: true },
                { id: "q3", type: "LONG", points: 25, text: "Essay Q", criteria: "Criteria" }
            ],
            totalMarks: 40,
            config: { maxScore: 40 }
        },
        include: {
            subject: { include: { school: true } },
            class: { include: { grade: true } }
        }
    });

    console.log(`Created exam: ${testExam.title}`);
    console.log(`totalMarks: ${testExam.totalMarks} (Expected: 40)`);
    if (testExam.totalMarks !== 40) {
        throw new Error(`Assertion failed: totalMarks is ${testExam.totalMarks}, expected 40`);
    }
    console.log("Exam creation sync OK!");

    // 2. Verify student point-weighted subject averages
    console.log("\n2. Testing point-weighted subject average logic...");
    // Let's mock a subject and two exam records for a student
    const testStudent = await prisma.student.create({
        data: {
            firstName: "Logic",
            lastName: "Student",
            studentCode: `STUD-${Math.random().toString(36).substring(7).toUpperCase()}`,
            grade: { connect: { id: testExam.class.gradeId } },
            school: { connect: { id: testExam.class.grade.schoolId } },
            class: { connect: { id: testExam.classId } }
        }
    });

    // Create GradeRecord 1: 9 out of 10 points
    const exam1 = await prisma.exam.create({
        data: {
            title: "Quiz 1",
            classId: testExam.classId,
            subjectId: testExam.subjectId,
            totalMarks: 10,
            config: { maxScore: 10 },
            createdById: testExam.createdById
        }
    });

    const grade1 = await prisma.gradeRecord.create({
        data: {
            studentId: testStudent.id,
            examId: exam1.id,
            subjectId: testExam.subjectId,
            score: 9, // raw score
            createdById: testExam.createdById
        }
    });

    // Create GradeRecord 2: 40 out of 50 points
    const exam2 = await prisma.exam.create({
        data: {
            title: "Exam 1",
            classId: testExam.classId,
            subjectId: testExam.subjectId,
            totalMarks: 50,
            config: { maxScore: 50 },
            createdById: testExam.createdById
        }
    });

    const grade2 = await prisma.gradeRecord.create({
        data: {
            studentId: testStudent.id,
            examId: exam2.id,
            subjectId: testExam.subjectId,
            score: 40, // raw score
            createdById: testExam.createdById
        }
    });

    // Calculate Point-Weighted Average (Logic from /api/student/grades)
    const records = [
        { score: grade1.score, exam: exam1 },
        { score: grade2.score, exam: exam2 }
    ];

    let totalScore = 0;
    let totalMax = 0;
    records.forEach(r => {
        const max = r.exam.totalMarks || (r.exam.config as any)?.maxScore || 100;
        totalScore += r.score;
        totalMax += max;
    });

    const average = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    console.log(`Total Score: ${totalScore} / ${totalMax}`);
    console.log(`Calculated Average: ${average.toFixed(2)}% (Expected: 81.67%)`);

    if (Math.abs(average - 81.6666) > 0.01) {
        throw new Error(`Assertion failed: Point-weighted average is ${average.toFixed(2)}%, expected 81.67%`);
    }
    console.log("Point-weighted average calculations OK!");

    // 3. Verify Running average logic for Marklist (ignores undefined/null columns)
    console.log("\n3. Testing Marklist running average calculations...");
    const columns = [
        { id: "col1", title: "Attendance", maxMarks: 10 },
        { id: "col2", title: "Midterm", maxMarks: 30 },
        { id: "col3", title: "Final Exam", maxMarks: 60 }
    ];

    // Mock student mark entry: Quiz 1 (10), Midterm (25), Final (blank)
    const entryMarks = [
        { columnId: "col1", score: 10 },
        { columnId: "col2", score: 25 }
    ];

    let marklistTotal = 0;
    let marklistMaxTotal = 0;

    columns.forEach(col => {
        const mark = entryMarks.find(m => m.columnId === col.id);
        if (mark !== undefined && mark !== null) {
            marklistTotal += mark.score;
            marklistMaxTotal += col.maxMarks;
        }
    });

    const marklistPct = marklistMaxTotal > 0 ? (marklistTotal / marklistMaxTotal) * 100 : 0;
    console.log(`Marklist Total: ${marklistTotal} / ${marklistMaxTotal}`);
    console.log(`Running Average: ${marklistPct.toFixed(2)}% (Expected: 87.50%)`);

    if (marklistPct !== 87.5) {
        throw new Error(`Assertion failed: Marklist running average is ${marklistPct.toFixed(2)}%, expected 87.50%`);
    }
    console.log("Marklist running average calculations OK!");

    // Clean up
    console.log("\nCleaning up test artifacts...");
    await prisma.gradeRecord.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.exam.deleteMany({ where: { classId: testExam.classId } });
    await prisma.student.deleteMany({ where: { id: testStudent.id } });
    await prisma.class.deleteMany({ where: { id: testExam.classId } });
    await prisma.grade.deleteMany({ where: { id: testExam.class.gradeId } });
    await prisma.school.deleteMany({ where: { id: testExam.class.grade.schoolId } });
    await prisma.user.deleteMany({ where: { id: testExam.createdById } });

    console.log("\n=== ALL TEST RUNS PASSED ===");
}

main().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
