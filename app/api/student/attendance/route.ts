import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['STUDENT']);

        let studentId = '';
        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin.from('Student').select('id').eq('userId', dbUser.id).single();
            if (!data) return NextResponse.json({ error: 'No student profile' }, { status: 400 });
            studentId = data.id;
        } else {
            const student = await prisma.student.findUnique({
                where: { userId: dbUser.id }
            });
            if (!student) return NextResponse.json({ error: 'No student profile' }, { status: 400 });
            studentId = student.id;
        }

        let records = [];
        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin.from('AttendanceRecord').select('*').eq('studentId', studentId).order('date', { ascending: false });
            records = data || [];
        } else {
            records = await prisma.attendanceRecord.findMany({
                where: { studentId },
                orderBy: { date: 'desc' }
            });
        }

        // Calculate stats
        const total = records.length;
        const present = records.filter(r => r.status === 'PRESENT').length;
        const late = records.filter(r => r.status === 'LATE').length;
        const absent = records.filter(r => r.status === 'ABSENT').length;
        const excused = records.filter(r => r.status === 'EXCUSED').length;

        const percentage = total > 0 ? ((present + late) / total) * 100 : 100;

        return NextResponse.json({
            records,
            stats: { total, present, late, absent, excused, percentage }
        });
    } catch (e) {
        return handleApiError(e);
    }
}
