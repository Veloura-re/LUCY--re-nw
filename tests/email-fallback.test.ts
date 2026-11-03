const mockResendSend = jest.fn();
const mockSendMail = jest.fn();

jest.mock('resend', () => ({ Resend: class { emails = { send: (...a: any[]) => mockResendSend(...a) }; } }));
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: () => ({ sendMail: (...a: any[]) => mockSendMail(...a) }) } }));
jest.mock('@/lib/prisma', () => ({ prisma: {} }));

import { sendEmail } from '@/lib/email';

const mail = { to: 'a@b.edu', subject: 'LUCY: Your sign-in code', html: '<p>123456</p>' };

beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test';
    process.env.GMAIL_USER = 'sender@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-pass';
    mockSendMail.mockResolvedValue({});
});

test('Resend is used first and SMTP is left alone', async () => {
    mockResendSend.mockResolvedValue({ data: { id: '1' }, error: null });
    expect(await sendEmail(mail)).toEqual({ success: true });
    expect(mockSendMail).not.toHaveBeenCalled();
});

test('a Resend failure falls back to SMTP so the code still arrives', async () => {
    mockResendSend.mockResolvedValue({ data: null, error: { name: 'application_error', message: 'service unavailable' } });
    expect(await sendEmail(mail)).toMatchObject({ success: true, fallback: true });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.edu' }));
});

test('a thrown Resend error also falls back', async () => {
    mockResendSend.mockRejectedValue(new Error('network down'));
    expect(await sendEmail(mail)).toMatchObject({ success: true, fallback: true });
});

test('with no SMTP configured the Resend failure is reported as it is', async () => {
    delete process.env.GMAIL_USER;
    mockResendSend.mockResolvedValue({ data: null, error: { name: 'application_error', message: 'service unavailable' } });
    expect(await sendEmail(mail)).toEqual({ success: false, error: 'service unavailable' });
});

test('if both paths fail the caller sees a failure', async () => {
    mockResendSend.mockRejectedValue(new Error('network down'));
    mockSendMail.mockRejectedValue(new Error('smtp refused'));
    expect(await sendEmail(mail)).toMatchObject({ success: false, error: 'smtp refused' });
});
