import { Resend } from 'resend';
import { prisma } from './prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    return new Resend(apiKey);
}

// Generic email sender using Resend (fetch-based, CF Workers compatible)
export async function sendEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }) {
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@5-cn.net';

    if (!resend) {
        console.warn('⚠️ RESEND_API_KEY is missing. Falling back to console log.');
        console.log('='.repeat(80));
        console.log(`📧 SIMULATED EMAIL TO: ${to}`);
        if (replyTo) console.log(`Reply-To: ${replyTo}`);
        console.log(`Subject: ${subject}`);
        console.log('-'.repeat(40));
        console.log(html.replace(/<[^>]*>?/gm, ''));
        console.log('='.repeat(80));
        return { success: false, error: 'Missing Resend API key', simulated: true };
    }

    try {
        const { error } = await resend.emails.send({
            from: `LUCY Platform <${fromEmail}>`,
            to,
            subject,
            html,
            replyTo: replyTo || undefined,
        });

        if (error) {
            console.error('Resend Error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Resend send error:', error);
        return { success: false, error: error.message || 'Unknown Email Error' };
    }
}

async function getSchoolConfig(schoolId: string) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { communicationsConfig: true, name: true }
    });
    return school;
}

export async function sendInviteEmail(toEmail: string, inviteUrl: string, schoolName: string, token: string, role: string = 'TEACHER', schoolId?: string) {
    let replyTo = "";

    if (schoolId) {
        const school = await getSchoolConfig(schoolId);
        const config = school?.communicationsConfig as any;
        if (config && config.sendInvites === false) {
            console.log(`✉️ Skipping invite email for ${toEmail} as per institutional config for ${schoolName}`);
            return { success: true, skipped: true };
        }
        replyTo = config?.replyTo || "";
    }

    const roleLabel = role === 'PRINCIPAL' ? 'Director' : role.charAt(0) + role.slice(1).toLowerCase();

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #101314; background-color: #ffffff; border-radius: 24px; border: 1px solid #f0f0f0;">
            <div style="margin-bottom: 32px; text-align: center;">
                <span style="font-size: 40px;">🎓</span>
                <h1 style="color: #147A52; margin-top: 16px; font-weight: 900; letter-spacing: -0.05em;">LUCY</h1>
            </div>
            
            <h2 style="font-size: 24px; font-weight: 800; color: #101314; margin-bottom: 16px;">Institutional Invitation</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4A4E52;">You have been invited to join <strong>${schoolName}</strong> on the LUCY School Management Platform as a <strong>${roleLabel}</strong>.</p>
            
            <div style="background-color: #f8faf9; padding: 24px; border-radius: 16px; margin: 32px 0; border: 1px solid #eef2f0;">
                <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Access Key</p>
                <p style="margin: 12px 0 0 0; font-family: ui-monospace, monospace; font-size: 28px; font-weight: 800; color: #147A52; letter-spacing: 0.1em;">${token}</p>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" style="background-color: #147A52; color: #ffffff; padding: 18px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Initialize Account</a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #6E7377;">If the button above does not work, copy and paste this URL into your browser:</p>
            <p style="font-size: 12px; color: #147A52; word-break: break-all;">${inviteUrl}</p>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />
            <p style="font-size: 11px; text-align: center; color: #9EA3A7; text-transform: uppercase; letter-spacing: 0.1em;">LUCY Advanced Academic Infrastructure &copy; 2025</p>
        </div>
    `;

    return sendEmail({ to: toEmail, subject: `Invitation: Join ${schoolName} as a ${roleLabel}`, html, replyTo });
}

export async function sendAssessmentReportEmail(
    toEmail: string,
    studentName: string,
    examTitle: string,
    subjectName: string,
    score: number,
    totalScore: number,
    attendanceStatus: string,
    schoolId: string,
    remark?: string
) {
    const school = await getSchoolConfig(schoolId);
    const config = school?.communicationsConfig as any;
    if (config && config.sendReports === false) {
        console.log(`✉️ Skipping report email for ${studentName} as per institutional config for ${school?.name}`);
        return { success: true, skipped: true };
    }

    const replyTo = config?.replyTo || "";
    const percentage = ((score / totalScore) * 100).toFixed(1);

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #101314; background-color: #ffffff; border-radius: 24px; border: 1px solid #f0f0f0;">
            <div style="margin-bottom: 32px; text-align: center;">
                <span style="font-size: 40px;">📋</span>
                <h1 style="color: #147A52; margin-top: 16px; font-weight: 900; letter-spacing: -0.05em;">LUCY ACADEMIC</h1>
            </div>
            
            <h2 style="font-size: 24px; font-weight: 800; color: #101314; margin-bottom: 8px;">Assessment Finalized</h2>
            <p style="font-size: 14px; font-weight: 600; color: #6E7377; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 0.1em;">Official Performance Statement</p>
            
            <div style="background-color: #f8faf9; padding: 32px; border-radius: 20px; border: 1px solid #eef2f0; margin-bottom: 32px;">
                <div style="margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Student</p>
                    <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #101314;">${studentName}</p>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Subject &amp; Context</p>
                    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #101314;">${subjectName} • ${examTitle}</p>
                </div>

                <div style="display: flex; gap: 40px; margin-top: 32px; border-top: 1px solid #eef2f0; padding-top: 32px;">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Score</p>
                        <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 900; color: #147A52;">${score}<span style="font-size: 16px; color: #9EA3A7; font-weight: 600;">/${totalScore}</span></p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 800; color: #147A52;">${percentage}%</p>
                    </div>
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Attendance</p>
                        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: ${attendanceStatus === 'PRESENT' ? '#147A52' : '#D14343'};">${attendanceStatus}</p>
                    </div>
                </div>
            </div>

            ${remark ? `
            <div style="margin-bottom: 32px;">
                <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Instructor Remarks</p>
                <p style="margin: 0; font-size: 14px; font-style: italic; color: #4A4E52; line-height: 1.6;">"${remark}"</p>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 40px 0;">
                <p style="font-size: 12px; color: #9EA3A7; margin-bottom: 16px;">Log in to the LUCY Family Portal for full history and analysis.</p>
                <a href="${APP_URL}/dashboard" style="background-color: #101314; color: #ffffff; padding: 16px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Access Portal</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />
            <p style="font-size: 11px; text-align: center; color: #9EA3A7; text-transform: uppercase; letter-spacing: 0.1em;">LUCY Advanced Academic Infrastructure &copy; 2025</p>
        </div>
    `;

    return sendEmail({ to: toEmail, subject: `Academic Report: ${studentName} - ${examTitle}`, html, replyTo });
}

export async function sendAssessmentAssignedEmail(
    toEmail: string,
    studentName: string,
    examTitle: string,
    subjectName: string,
    dueDate: string,
    schoolId: string
) {
    const school = await getSchoolConfig(schoolId);
    if (!school) return { success: false, error: 'School not found' };

    const config = Object.assign({}, school.communicationsConfig) as any;
    if (config?.sendReports === false) {
        console.log(`✉️ Skipping assignment email for ${studentName} as per institutional config for ${school.name}`);
        return { success: true, skipped: true };
    }

    const replyTo = config?.replyTo || "";

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #101314; background-color: #ffffff; border-radius: 24px; border: 1px solid #f0f0f0;">
            <div style="margin-bottom: 32px; text-align: center;">
                <span style="font-size: 40px;">📅</span>
                <h1 style="color: #147A52; margin-top: 16px; font-weight: 900; letter-spacing: -0.05em;">LUCY ACADEMIC</h1>
            </div>
            
            <h2 style="font-size: 24px; font-weight: 800; color: #101314; margin-bottom: 8px;">New Academic Assignment</h2>
            <p style="font-size: 14px; font-weight: 600; color: #6E7377; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 0.1em;">Preparation Notice</p>
            
            <div style="background-color: #f8faf9; padding: 32px; border-radius: 20px; border: 1px solid #eef2f0; margin-bottom: 32px;">
                <div style="margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Student</p>
                    <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #101314;">${studentName}</p>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Subject &amp; Context</p>
                    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #101314;">${subjectName} • ${examTitle}</p>
                </div>

                <div style="display: flex; gap: 40px; margin-top: 32px; border-top: 1px solid #eef2f0; padding-top: 32px;">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Due Date</p>
                        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #D14343;">${dueDate}</p>
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <p style="font-size: 12px; color: #9EA3A7; margin-bottom: 16px;">Log in to the LUCY Family Portal to review assignment details and help your student prepare.</p>
                <a href="${APP_URL}/dashboard" style="background-color: #101314; color: #ffffff; padding: 16px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Access Portal</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />
            <p style="font-size: 11px; text-align: center; color: #9EA3A7; text-transform: uppercase; letter-spacing: 0.1em;">LUCY Advanced Academic Infrastructure &copy; 2025</p>
        </div>
    `;

    return sendEmail({ to: toEmail, subject: `New Assignment Created: ${studentName} - ${examTitle}`, html, replyTo });
}

export async function sendInvoiceNotificationEmail(
    toEmail: string,
    studentName: string,
    amount: string,
    dueDate: string,
    term: string,
    schoolId: string
) {
    const school = await getSchoolConfig(schoolId);
    if (!school) return { success: false, error: 'School not found' };

    const config = Object.assign({}, school.communicationsConfig) as any;
    if (config?.sendInvoices === false) {
        console.log(`✉️ Skipping invoice email for ${studentName} as per institutional config for ${school.name}`);
        return { success: true, skipped: true };
    }

    const replyTo = config?.replyTo || "";

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #101314; background-color: #ffffff; border-radius: 24px; border: 1px solid #f0f0f0;">
            <div style="margin-bottom: 32px; text-align: center;">
                <span style="font-size: 40px;">💳</span>
                <h1 style="color: #147A52; margin-top: 16px; font-weight: 900; letter-spacing: -0.05em;">LUCY FINANCE</h1>
            </div>
            
            <h2 style="font-size: 24px; font-weight: 800; color: #101314; margin-bottom: 8px;">Institutional Invoice Generated</h2>
            <p style="font-size: 14px; font-weight: 600; color: #6E7377; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 0.1em;">Official Billing Statement</p>
            
            <div style="background-color: #f8faf9; padding: 32px; border-radius: 20px; border: 1px solid #eef2f0; margin-bottom: 32px;">
                <div style="margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Student</p>
                    <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #101314;">${studentName}</p>
                </div>
                
                <div style="display: flex; gap: 40px; border-top: 1px solid #eef2f0; padding-top: 32px;">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Amount Due</p>
                        <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 900; color: #101314;">${amount}</p>
                    </div>
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Due Date</p>
                        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #D14343;">${dueDate}</p>
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <p style="font-size: 12px; color: #9EA3A7; margin-bottom: 16px;">Access the Family Portal to view itemized fees and initiate payment.</p>
                <a href="${APP_URL}/dashboard/finance" style="background-color: #147A52; color: #ffffff; padding: 18px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">View Invoice</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />
            <p style="font-size: 11px; text-align: center; color: #9EA3A7; text-transform: uppercase; letter-spacing: 0.1em;">LUCY Advanced Academic Infrastructure &copy; 2025</p>
        </div>
    `;

    return sendEmail({ to: toEmail, subject: `Institutional Statement: ${studentName} - ${term}`, html, replyTo });
}

export async function sendLatenessNotificationEmail(
    toEmail: string,
    studentName: string,
    date: string,
    totalLates: number,
    schoolId: string
) {
    const school = await getSchoolConfig(schoolId);
    if (!school) return { success: false, error: 'School not found' };

    const config = Object.assign({}, school.communicationsConfig) as any;
    if (config?.sendReports === false) {
        console.log(`✉️ Skipping lateness alert for ${studentName} as per institutional config for ${school.name}`);
        return { success: true, skipped: true };
    }

    const replyTo = config?.replyTo || "";
    const isThresholdAlert = totalLates >= 3;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #101314; background-color: #ffffff; border-radius: 24px; border: 1px solid #f0f0f0;">
            <div style="margin-bottom: 32px; text-align: center;">
                <span style="font-size: 40px;">⏰</span>
                <h1 style="color: #D14343; margin-top: 16px; font-weight: 900; letter-spacing: -0.05em;">LUCY ATTENDANCE</h1>
            </div>
            
            <h2 style="font-size: 24px; font-weight: 800; color: #101314; margin-bottom: 8px;">Attendance Alert: Lateness</h2>
            <p style="font-size: 14px; font-weight: 600; color: #6E7377; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 0.1em;">Institutional Punctuality Protocol</p>
            
            <div style="background-color: ${isThresholdAlert ? '#FFF5F5' : '#f8faf9'}; padding: 32px; border-radius: 20px; border: 1px solid ${isThresholdAlert ? '#FED7D7' : '#eef2f0'}; margin-bottom: 32px;">
                <div style="margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Student</p>
                    <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #101314;">${studentName}</p>
                </div>
                
                <div style="display: flex; gap: 40px; border-top: 1px solid ${isThresholdAlert ? '#FED7D7' : '#eef2f0'}; padding-top: 32px;">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Status</p>
                        <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 900; color: #D14343;">LATE</p>
                    </div>
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6E7377;">Date Recorded</p>
                        <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #101314;">${date}</p>
                    </div>
                </div>
            </div>

            <div style="background-color: #101314; padding: 24px; border-radius: 16px; margin-bottom: 32px; color: #ffffff;">
                <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #9EA3A7;">Neural Incident Summary</p>
                <p style="margin: 12px 0 0 0; font-size: 16px; font-weight: 700; line-height: 1.5;">
                    ${isThresholdAlert
        ? `<span style="color: #FC8181;">CRITICAL:</span> ${studentName} has reached <strong>${totalLates}</strong> historical lateness records. A meeting with the administration may be required.`
        : `This notice confirms that ${studentName} was marked late today. This is the ${totalLates}${totalLates === 1 ? 'st' : totalLates === 2 ? 'nd' : 'th'} recorded instance.`
    }
                </p>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <p style="font-size: 12px; color: #9EA3A7; margin-bottom: 16px;">Access the LUCY Portal to view detailed attendance history.</p>
                <a href="${APP_URL}/dashboard" style="background-color: #D14343; color: #ffffff; padding: 16px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Review History</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />
            <p style="font-size: 11px; text-align: center; color: #9EA3A7; text-transform: uppercase; letter-spacing: 0.1em;">LUCY Advanced Academic Infrastructure &copy; 2025</p>
        </div>
    `;

    return sendEmail({
        to: toEmail,
        subject: `Attendance Notice: ${studentName} - Lateness Recorded${isThresholdAlert ? ' (THRESHOLD REACHED)' : ''}`,
        html,
        replyTo
    });
}
