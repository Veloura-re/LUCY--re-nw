const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncUser(email, supabaseId) {
    console.log(`\n--- Starting Sync for ${email} ---`);
    console.log(`Target ID (Supabase): ${supabaseId}`);

    try {
        const dbUser = await prisma.user.findUnique({
            where: { email },
        });

        if (!dbUser) {
            console.error(`User with email ${email} not found in Prisma.`);
            return;
        }

        if (dbUser.id === supabaseId) {
            console.log(`SUCCESS: IDs already match for ${email}. No action needed.`);
            return;
        }

        const oldId = dbUser.id;
        console.log(`Mismatch detected. Prisma ID: ${oldId}`);

        await prisma.$transaction(async (tx) => {
            console.log("1. Renaming old user unique fields to avoid constraints...");
            const tempSuffix = `_old_${Date.now()}`;
            const tempEmail = `${email}${tempSuffix}`;
            const tempTeacherCode = dbUser.teacherCode ? `${dbUser.teacherCode}${tempSuffix}` : null;

            await tx.user.update({
                where: { id: oldId },
                data: {
                    email: tempEmail,
                    teacherCode: tempTeacherCode
                }
            });

            console.log("2. Creating new user record with Supabase ID...");
            const userData = { ...dbUser };
            delete userData.id;
            // Ensure we use original email and teacherCode for the new record
            await tx.user.create({
                data: {
                    ...userData,
                    id: supabaseId,
                    email: email,
                    teacherCode: dbUser.teacherCode
                }
            });

            console.log("3. Migrating relations to new ID...");
            const models = [
                { name: 'attendanceRecord', data: { createdById: supabaseId }, where: { createdById: oldId } },
                { name: 'attendanceRecord', data: { lockedById: supabaseId }, where: { lockedById: oldId } },
                { name: 'auditLog', data: { userId: supabaseId }, where: { userId: oldId } },
                { name: 'certificate', data: { issuedById: supabaseId }, where: { issuedById: oldId } },
                { name: 'chatRoomMember', data: { userId: supabaseId }, where: { userId: oldId } },
                { name: 'class', data: { homeroomTeacherId: supabaseId }, where: { homeroomTeacherId: oldId } },
                { name: 'event', data: { createdById: supabaseId }, where: { createdById: oldId } },
                { name: 'exam', data: { createdById: supabaseId }, where: { createdById: oldId } },
                { name: 'exam', data: { lockedById: supabaseId }, where: { lockedById: oldId } },
                { name: 'gradeRecord', data: { createdById: supabaseId }, where: { createdById: oldId } },
                { name: 'internalNote', data: { authorId: supabaseId }, where: { authorId: oldId } },
                { name: 'message', data: { fromUserId: supabaseId }, where: { fromUserId: oldId } },
                { name: 'message', data: { toUserId: supabaseId }, where: { toUserId: oldId } },
                { name: 'parentStudentLink', data: { parentId: supabaseId }, where: { parentId: oldId } },
                { name: 'teacherAssignment', data: { teacherId: supabaseId }, where: { teacherId: oldId } },
                { name: 'timetable', data: { teacherId: supabaseId }, where: { teacherId: oldId } },
                { name: 'lesson', data: { teacherId: supabaseId }, where: { teacherId: oldId } },
                { name: 'bookRequest', data: { userId: supabaseId }, where: { userId: oldId } },
                { name: 'resourceProgress', data: { userId: supabaseId }, where: { userId: oldId } },
                { name: 'marklistConfig', data: { teacherId: supabaseId }, where: { teacherId: oldId } },
            ];

            for (const model of models) {
                console.log(`   > Updating ${model.name}...`);
                await tx[model.name].updateMany({ where: model.where, data: model.data });
            }

            console.log("4. Handling Student link...");
            const student = await tx.student.findUnique({ where: { userId: oldId } });
            if (student) {
                console.log("   Found linked student. Moving relation...");
                await tx.student.update({ where: { id: student.id }, data: { userId: supabaseId } });
            }

            console.log("5. Cleanup: Deleting old user record...");
            await tx.user.delete({ where: { id: oldId } });

        }, {
            timeout: 60000 // 60 seconds
        });

        console.log(`\nSUCCESS! User ${email} synchronized.`);

    } catch (error) {
        console.error(`\nTRANSACTION FAILED:`, error.message);
    }
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node sync-user.js <email> <supabaseId>");
    process.exit(1);
}

syncUser(args[0], args[1]).then(() => prisma.$disconnect());
