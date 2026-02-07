import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getCredentials() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable not found');
  }

  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable not found');
  }

  return { apiKey, fromEmail };
}

export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendDemoRequestEmail(data: {
  name: string;
  phone: string;
  schoolName: string;
  studentCount?: string;
  message?: string;
}) {
  console.log("Attempting to send demo request email...");

  const { client, fromEmail } = await getUncachableResendClient();
  console.log("Using from email:", fromEmail);

  const safeName = escapeHtml(data.name);
  const safePhone = escapeHtml(data.phone);
  const safeSchoolName = escapeHtml(data.schoolName);
  const safeStudentCount = data.studentCount ? escapeHtml(data.studentCount) : 'Not specified';
  const safeMessage = data.message ? escapeHtml(data.message) : '';

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7B1113 0%, #1E3A5F 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Demo Request</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1E3A5F; margin-top: 0;">Contact Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Name:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Phone:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${safePhone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">School:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${safeSchoolName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Students:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${safeStudentCount}</td>
          </tr>
        </table>
        ${safeMessage ? `
          <h3 style="color: #1E3A5F; margin-top: 20px;">Message</h3>
          <p style="background: white; padding: 15px; border-radius: 8px; color: #374151; border-left: 4px solid #7B1113;">
            ${safeMessage}
          </p>
        ` : ''}
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This demo request was submitted via the EduSuite Systems website.
        </p>
      </div>
    </div>
  `;

  const result = await client.emails.send({
    from: fromEmail || 'EduSuite Systems <onboarding@resend.dev>',
    to: 'luqmanluqs2@gmail.com',
    subject: `New Demo Request: ${data.schoolName}`,
    html: emailHtml,
  });

  return result;
}
