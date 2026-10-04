import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) throw err;
      console.log(`Pooler retry (attempt ${attempt}/${retries})...`);
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
  throw new Error('Database retry failed');
}

async function testReportCard() {
  const student = await withRetry(() => prisma.student.findFirst({
    where: { studentCode: 'APEX-G10-01' },
    include: {
      school: true,
      class: { include: { grade: true } },
      parentLinks: { include: { parent: true } }
    }
  }));

  if (!student || !student.classId) {
    throw new Error('Student or class not found');
  }

  const [activeTerm, principal, configs, allClassEntries, attendanceRecords, remarks] = await Promise.all([
    withRetry(() => prisma.academicTerm.findFirst({
      where: { schoolId: student.schoolId, isActive: true }
    })),
    withRetry(() => prisma.user.findFirst({
      where: { schoolId: student.schoolId, role: 'PRINCIPAL' }
    })),
    withRetry(() => prisma.marklistConfig.findMany({
      where: { classId: student.classId! },
      include: { subject: true, columns: true }
    })),
    withRetry(() => prisma.marklistEntry.findMany({
      where: {
        config: { classId: student.classId! },
        marks: { some: {} }
      },
      include: {
        marks: { include: { column: true } },
        config: { include: { subject: true } }
      }
    })),
    withRetry(() => prisma.attendanceRecord.findMany({
      where: { studentId: student.id }
    })),
    withRetry(() => prisma.studentRemark.findMany({
      where: { studentId: student.id },
      include: { teacher: true }
    }))
  ]);

  // Aggregate by student to compute ranking
  const studentTotals: Record<string, { total: number; count: number; name: string }> = {};
  for (const entry of allClassEntries) {
    const sId = entry.studentId;
    if (!studentTotals[sId]) {
      studentTotals[sId] = { total: 0, count: 0, name: sId };
    }
    const entryScore = entry.marks.reduce((acc, m) => acc + m.score, 0);
    studentTotals[sId].total += entryScore;
    studentTotals[sId].count += 1;
  }

  const rankingList = Object.entries(studentTotals)
    .map(([sId, stats]) => ({
      studentId: sId,
      average: stats.count > 0 ? stats.total / stats.count : 0
    }))
    .sort((a, b) => b.average - a.average);

  const studentRankIndex = rankingList.findIndex(r => r.studentId === student.id);
  const rank = studentRankIndex !== -1 ? studentRankIndex + 1 : 1;
  const totalStudents = rankingList.length;

  console.log('======================================================');
  console.log('OFFICIAL REPORT CARD DOSSIER TEST AUDIT');
  console.log('======================================================');
  console.log(`Institution: ${student.school.name} (${student.school.schoolCode})`);
  console.log(`Scholar:     ${student.firstName} ${student.lastName} [${student.studentCode}]`);
  console.log(`Class:       ${student.class?.name} (${student.class?.grade.name})`);
  console.log(`Term:        ${activeTerm?.name || 'N/A'}`);
  console.log(`Principal:   ${principal?.name || 'N/A'}`);
  console.log(`Class Rank:  #${rank} of ${totalStudents} scholars`);
  console.log(`Attendance:  ${attendanceRecords.filter(a => a.status === 'PRESENT').length} / ${attendanceRecords.length} Days Present (${((attendanceRecords.filter(a => a.status === 'PRESENT').length / (attendanceRecords.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`Homeroom Remark: "${remarks[0]?.content || 'N/A'}" (By ${remarks[0]?.teacher.name})`);
  console.log('------------------------------------------------------');
  console.log('Subject Performance Breakdown:');

  const dawitEntries = allClassEntries.filter(e => e.studentId === student.id);
  let totalDawitScore = 0;
  for (const entry of dawitEntries) {
    const score = entry.marks.reduce((acc, m) => acc + m.score, 0);
    totalDawitScore += score;
    console.log(`  - ${entry.config.subject.name.padEnd(35)} : ${score.toFixed(1)}/100 (Grade: ${score >= 90 ? 'A+' : score >= 80 ? 'A' : 'B'})`);
  }
  const dawitAvg = totalDawitScore / (dawitEntries.length || 1);
  console.log('------------------------------------------------------');
  console.log(`Cumulative Average: ${dawitAvg.toFixed(2)}%`);
  console.log(`Academic Standing:  ${dawitAvg >= 90 ? 'Distinction / Highest Honors' : 'Good Standing'}`);
  console.log(`Grade Point (GPA):  ${(dawitAvg / 25).toFixed(2)} / 4.0`);
  console.log('======================================================');
}

testReportCard()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
