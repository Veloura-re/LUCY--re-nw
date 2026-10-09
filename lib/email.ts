import { Resend } from 'resend';
import { prisma } from './prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';

let resendInstance: Resend | null = null;
function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    if (!resendInstance) resendInstance = new Resend(apiKey);
    return resendInstance;
}

// Generic email sender using Resend (fetch-based, CF Workers compatible)
export async function sendEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }) {
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@5-cn.net';

    console.log(`[EMAIL] Attempting to send email to: ${to}, subject: "${subject}", from: ${fromEmail}`);

    if (!resend) {
        console.warn('[EMAIL] RESEND_API_KEY is missing. Email will NOT be sent.');
        console.log('='.repeat(80));
        console.log(`[EMAIL] SIMULATED EMAIL TO: ${to}`);
        if (replyTo) console.log(`Reply-To: ${replyTo}`);
        console.log(`Subject: ${subject}`);
        console.log('-'.repeat(40));
        console.log(html.replace(/<[^>]*>?/gm, ''));
        console.log('='.repeat(80));
        return { success: false, error: 'Missing Resend API key', simulated: true };
    }

    try {
        // First attempt with custom domain
        const { data, error } = await resend.emails.send({
            from: `LUCY Platform <${fromEmail}>`,
            to,
            subject,
            html,
            replyTo: replyTo || undefined,
        });

        if (error) {
            console.error(`[EMAIL] Primary send failed (from: ${fromEmail}):`, JSON.stringify(error));
            
            // Retry with Resend's default onboarding sender if domain isn't verified
            if (error.message?.includes('not verified') || error.message?.includes('not allowed') || error.name === 'validation_error') {
                console.log('[EMAIL] Retrying with Resend default sender (onboarding@resend.dev)...');
                try {
                    const { data: retryData, error: retryError } = await resend.emails.send({
                        from: 'LUCY Platform <onboarding@resend.dev>',
                        to,
                        subject,
                        html,
                        replyTo: replyTo || undefined,
                    });

                    if (retryError) {
                        console.error('[EMAIL] Retry also failed:', JSON.stringify(retryError));
                        return { success: false, error: retryError.message };
                    }

                    console.log(`[EMAIL] Sent successfully via fallback sender to: ${to}, id: ${retryData?.id}`);
                    return { success: true, fallback: true };
                } catch (retryErr: any) {
                    console.error('[EMAIL] Retry exception:', retryErr);
                    return { success: false, error: retryErr.message || 'Retry failed' };
                }
            }

            return { success: false, error: error.message };
        }

        console.log(`[EMAIL] Sent successfully to: ${to}, id: ${data?.id}`);
        return { success: true };
    } catch (error: any) {
        console.error('[EMAIL] Exception:', error);
        return { success: false, error: error.message || 'Unknown Email Error' };
    }
}

async function getSchoolConfig(schoolId: string) {
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { communicationsConfig: true, name: true }
        });
        return school;
    } catch (err) {
        console.error('[email.ts] Prisma getSchoolConfig failed:', err);
        return null;
    }
}

export async function sendInviteEmail(toEmail: string, inviteUrl: string, schoolName: string, token: string, role: string = 'TEACHER', schoolId?: string) {
    console.log(`[INVITE] sendInviteEmail called: to=${toEmail}, role=${role}, school=${schoolName}, schoolId=${schoolId}`);
    let replyTo = "";

    if (schoolId) {
        const school = await getSchoolConfig(schoolId);
        const config = school?.communicationsConfig as any;
        console.log(`[INVITE] School communicationsConfig:`, JSON.stringify(config));
        if (config && config.sendInvites === false) {
            console.log(`[INVITE] SKIPPING invite email for ${toEmail} - sendInvites is FALSE in school config for ${schoolName}`);
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

    const result = await sendEmail({ to: toEmail, subject: `Invitation: Join ${schoolName} as a ${roleLabel}`, html, replyTo });
    console.log(`📨 [INVITE] sendEmail result for ${toEmail}:`, JSON.stringify(result));
    return result;
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

export async function sendRecoveryEmail(toEmail: string, resetUrl: string) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #101314; background-color: #ffffff; border-radius: 24px; border: 1px solid #f0f0f0;">
            <div style="margin-bottom: 32px; text-align: center;">
                <span style="font-size: 40px;">🔑</span>
                <h1 style="color: #147A52; margin-top: 16px; font-weight: 900; letter-spacing: -0.05em;">LUCY</h1>
            </div>
            
            <h2 style="font-size: 24px; font-weight: 800; color: #101314; margin-bottom: 16px;">Password Reset Request</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4A4E52;">We received a request to reset your password for your LUCY account. Click the button below to choose a new password.</p>

            <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" style="background-color: #147A52; color: #ffffff; padding: 18px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #6E7377;">If the button above does not work, copy and paste this URL into your browser:</p>
            <p style="font-size: 12px; color: #147A52; word-break: break-all;">${resetUrl}</p>
            
            <p style="font-size: 12px; line-height: 1.6; color: #6E7377; margin-top: 32px;">If you did not make this request, you can safely ignore this email.</p>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />
            <p style="font-size: 11px; text-align: center; color: #9EA3A7; text-transform: uppercase; letter-spacing: 0.1em;">LUCY Advanced Academic Infrastructure &copy; 2026</p>
        </div>
    `;

    return sendEmail({ to: toEmail, subject: "LUCY: Reset your password", html });
}

export async function sendWelcomeEmail({
    toEmail,
    name,
    role = 'USER',
    schoolName,
    schoolId
}: {
    toEmail: string;
    name?: string;
    role?: string;
    schoolName?: string;
    schoolId?: string;
}) {
    console.log(`[WELCOME] sendWelcomeEmail called: to=${toEmail}, name=${name}, role=${role}, school=${schoolName}`);

    let replyTo = "";
    if (schoolId) {
        try {
            const school = await getSchoolConfig(schoolId);
            const config = school?.communicationsConfig as any;
            replyTo = config?.replyTo || "";
        } catch { /* non-blocking */ }
    }

    const formattedRole = role === 'PRINCIPAL' 
        ? 'School Director' 
        : role === 'OWNER' 
            ? 'School Owner'
            : role === 'SUPERADMIN'
                ? 'System Administrator'
                : role.charAt(0) + role.slice(1).toLowerCase();

    const recipientName = name?.trim() || formattedRole;

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; color: #101314; background-color: #ffffff; border-radius: 24px; border: 1px solid #eef2f0; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
            <div style="margin-bottom: 32px; text-align: center;">
                <div style="display: inline-block; padding: 12px; border-radius: 16px; background-color: #f0fdf4; border: 1px solid #dcfce7; margin-bottom: 12px;">
                    <span style="font-size: 36px; line-height: 1;">🎓</span>
                </div>
                <h1 style="color: #147A52; margin: 8px 0 0 0; font-size: 28px; font-weight: 900; letter-spacing: -0.04em;">LUCY OS</h1>
                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #6E7377; text-transform: uppercase; letter-spacing: 0.15em;">Next-Generation Academic Infrastructure</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%); padding: 32px; border-radius: 20px; border: 1px solid #dcfce7; margin-bottom: 32px; text-align: center;">
                <h2 style="font-size: 24px; font-weight: 800; color: #101314; margin: 0 0 8px 0;">Welcome to the Platform!</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #4A4E52; margin: 0;">
                    Hello <strong>${recipientName}</strong>, your account has been successfully initialized on <strong>LUCY OS</strong>.
                </p>
            </div>

            <div style="background-color: #f8faf9; padding: 24px; border-radius: 16px; margin-bottom: 32px; border: 1px solid #eef2f0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 12px; font-weight: 700; color: #6E7377; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Role</span>
                    <span style="font-size: 12px; font-weight: 800; color: #147A52; background: #dcfce7; padding: 2px 8px; border-radius: 9999px;">${formattedRole}</span>
                </div>
                ${schoolName ? `
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 12px; font-weight: 700; color: #6E7377; text-transform: uppercase; letter-spacing: 0.05em;">Institutional Node</span>
                    <span style="font-size: 12px; font-weight: 800; color: #101314;">${schoolName}</span>
                </div>
                ` : ''}
            </div>

            <div style="text-align: center; margin: 36px 0;">
                <a href="${APP_URL}/dashboard" style="background-color: #147A52; color: #ffffff; padding: 18px 36px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 4px 14px rgba(20, 122, 82, 0.35);">
                    Enter LUCY OS
                </a>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #6E7377; text-align: center;">
                You can access your personalized dashboard, track academic workflows, and communicate with your institution anytime.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 32px 0;" />
            <p style="font-size: 11px; text-align: center; color: #9EA3A7; text-transform: uppercase; letter-spacing: 0.1em;">
                LUCY School Management Ecosystem &copy; 2026
            </p>
        </div>
    `;

    return sendEmail({
        to: toEmail,
        subject: `Welcome to LUCY OS - Your Institutional Academic Interface`,
        html,
        replyTo
    });
}

