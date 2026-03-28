import nodemailer from 'nodemailer';

// ── Provider: Resend (API Key) or SMTP fallback ────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');

const FROM = process.env.EMAIL_FROM || (RESEND_API_KEY ? 'CSR Platform <onboarding@resend.dev>' : smtpUser) || 'noreply@csr-platform.com';

// SMTP transporter (only if no Resend key and SMTP is configured)
const transporter = !RESEND_API_KEY && smtpUser
  ? nodemailer.createTransport({
      host: smtpHost || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

async function send(to: string, subject: string, html: string) {
  // 1) Resend API (preferred)
  if (RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`Resend error (${res.status}):`, err);
      throw new Error(`Resend failed: ${res.status}`);
    }
    const resData = await res.json() as { id: string };
    console.log(`Email sent via Resend to ${to}: ${resData.id}`);
    return;
  }

  // 2) SMTP fallback
  if (transporter) {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`Email sent via SMTP to ${to}: ${info.messageId}`);
    return;
  }

  // 3) Dev console
  console.log(`\n--- EMAIL (no provider configured) ---\nTo: ${to}\nSubject: ${subject}\n${html}\n-------------------\n`);
}

export const emailService = {
  async sendResetCode(to: string, code: string) {
    await send(
      to,
      'CSR Platform - Password Reset Code',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#C9C036;margin-bottom:12px">Password Reset</h2>
        <p>Your verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#0E0E09;border-radius:12px;color:#F0EFE2;margin:16px 0">${code}</div>
        <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>`,
    );
  },

  async sendWelcome(to: string, name: string) {
    await send(
      to,
      'Welcome to CSR Platform',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#C9C036">Welcome, ${name}!</h2>
        <p>Your account has been created on the CSR Platform. You can now log in and start managing your projects.</p>
      </div>`,
    );
  },

  async sendNotification(to: string, title: string, message: string) {
    await send(
      to,
      `CSR Platform - ${title}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#C9C036">${title}</h2>
        <p>${message}</p>
      </div>`,
    );
  },

  async sendScenarioApproved(to: string, data: {
    recipientName: string;
    scenarioTitle: string;
    projectName: string;
    approverName: string;
    description: string;
    before: { metric: string; value: number; unit: string; risk: string };
    after: { metric: string; value: number; unit: string; risk: string };
    executionNote?: string;
  }) {
    const riskColor: Record<string, string> = { low: '#34d399', medium: '#fbbf24', high: '#fb923c', critical: '#f87171' };
    await send(
      to,
      `CSR Platform — Scenario Approved: ${data.scenarioTitle}`,
      `<div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#0E0E09;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1a3a1a,#0E0E09);padding:28px 32px;border-bottom:1px solid #222">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;background:rgba(52,211,153,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:20px">✅</span>
            </div>
            <div>
              <h2 style="margin:0;color:#34d399;font-size:18px">Scenario Approved</h2>
              <p style="margin:4px 0 0;color:#6B6849;font-size:12px">Action authorized for execution</p>
            </div>
          </div>
        </div>
        <div style="padding:24px 32px">
          <p style="color:#F0EFE2;font-size:14px;margin:0 0 16px">Hello ${data.recipientName},</p>
          <p style="color:#A3A07A;font-size:13px;margin:0 0 20px">Your proposed scenario has been approved by <strong style="color:#C9C036">${data.approverName}</strong> and is ready for execution.</p>
          <div style="background:#161610;border:1px solid #2a2a22;border-radius:12px;padding:20px;margin-bottom:20px">
            <h3 style="margin:0 0 8px;color:#F0EFE2;font-size:15px">${data.scenarioTitle}</h3>
            <p style="margin:0 0 4px;color:#C9C036;font-size:12px;font-weight:600">Project: ${data.projectName}</p>
            <p style="margin:0;color:#A3A07A;font-size:12px;line-height:1.6">${data.description}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
            <tr>
              <td width="48%" style="background:#161610;border:1px solid #2a2a22;border-radius:10px;padding:14px;text-align:center">
                <p style="margin:0;color:#f87171;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Before</p>
                <p style="margin:6px 0 2px;color:${riskColor[data.before.risk] || '#fbbf24'};font-size:22px;font-weight:800">${data.before.value}${data.before.unit}</p>
                <p style="margin:0;color:#6B6849;font-size:10px">${data.before.metric}</p>
              </td>
              <td width="4%" style="text-align:center;color:#6B6849;font-size:20px">→</td>
              <td width="48%" style="background:#161610;border:1px solid #2a2a22;border-radius:10px;padding:14px;text-align:center">
                <p style="margin:0;color:#34d399;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px">After</p>
                <p style="margin:6px 0 2px;color:${riskColor[data.after.risk] || '#34d399'};font-size:22px;font-weight:800">${data.after.value}${data.after.unit}</p>
                <p style="margin:0;color:#6B6849;font-size:10px">${data.after.metric}</p>
              </td>
            </tr>
          </table>
          ${data.executionNote ? `<div style="background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:12px 16px;margin-bottom:16px">
            <p style="margin:0;color:#34d399;font-size:11px;font-weight:600">Execution Note:</p>
            <p style="margin:4px 0 0;color:#A3A07A;font-size:12px">${data.executionNote}</p>
          </div>` : ''}
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/early-warning" style="display:inline-block;background:#C9C036;color:#0E0E09;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View in Dashboard</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1a1a14;text-align:center">
          <p style="margin:0;color:#4a4832;font-size:10px">CSR Platform © 2026 — Ministry of Commerce & Industry, Oman</p>
        </div>
      </div>`,
    );
  },

  async sendScenarioRejected(to: string, data: {
    recipientName: string;
    scenarioTitle: string;
    projectName: string;
    rejectorName: string;
    description: string;
    rejectionReason?: string;
  }) {
    await send(
      to,
      `CSR Platform — Scenario Rejected: ${data.scenarioTitle}`,
      `<div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#0E0E09;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#3a1a1a,#0E0E09);padding:28px 32px;border-bottom:1px solid #222">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;background:rgba(248,113,113,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:20px">❌</span>
            </div>
            <div>
              <h2 style="margin:0;color:#f87171;font-size:18px">Scenario Rejected</h2>
              <p style="margin:4px 0 0;color:#6B6849;font-size:12px">Action was not approved</p>
            </div>
          </div>
        </div>
        <div style="padding:24px 32px">
          <p style="color:#F0EFE2;font-size:14px;margin:0 0 16px">Hello ${data.recipientName},</p>
          <p style="color:#A3A07A;font-size:13px;margin:0 0 20px">Your proposed scenario was reviewed and rejected by <strong style="color:#C9C036">${data.rejectorName}</strong>.</p>
          <div style="background:#161610;border:1px solid #2a2a22;border-radius:12px;padding:20px;margin-bottom:20px">
            <h3 style="margin:0 0 8px;color:#F0EFE2;font-size:15px">${data.scenarioTitle}</h3>
            <p style="margin:0 0 4px;color:#C9C036;font-size:12px;font-weight:600">Project: ${data.projectName}</p>
            <p style="margin:0;color:#A3A07A;font-size:12px;line-height:1.6">${data.description}</p>
          </div>
          ${data.rejectionReason ? `<div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:12px 16px;margin-bottom:16px">
            <p style="margin:0;color:#f87171;font-size:11px;font-weight:600">Rejection Reason:</p>
            <p style="margin:4px 0 0;color:#A3A07A;font-size:12px">${data.rejectionReason}</p>
          </div>` : ''}
          <p style="color:#A3A07A;font-size:12px;margin:0 0 16px">You can generate new scenarios or modify your approach and re-submit.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/early-warning" style="display:inline-block;background:#C9C036;color:#0E0E09;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View in Dashboard</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1a1a14;text-align:center">
          <p style="margin:0;color:#4a4832;font-size:10px">CSR Platform © 2026 — Ministry of Commerce & Industry, Oman</p>
        </div>
      </div>`,
    );
  },

  async sendContactInquiry(to: string, data: { email: string; name?: string; message?: string }) {
    await send(
      to,
      `CSR Platform — New Contact Inquiry from ${data.email}`,
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#0E0E09;border-radius:14px">
        <h2 style="color:#C9C036;margin:0 0 16px">New Platform Inquiry</h2>
        <p style="color:#A3A07A;font-size:13px;margin:0 0 20px">Someone from the landing page is interested in joining the CSR Platform.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#6B6849;font-size:12px;padding:8px 0;border-bottom:1px solid #1e1e16;width:100px">Email</td>
              <td style="color:#F0EFE2;font-size:13px;padding:8px 0;border-bottom:1px solid #1e1e16">${data.email}</td></tr>
          ${data.name ? `<tr><td style="color:#6B6849;font-size:12px;padding:8px 0;border-bottom:1px solid #1e1e16">Name</td>
              <td style="color:#F0EFE2;font-size:13px;padding:8px 0;border-bottom:1px solid #1e1e16">${data.name}</td></tr>` : ''}
          ${data.message ? `<tr><td style="color:#6B6849;font-size:12px;padding:8px 0;vertical-align:top">Message</td>
              <td style="color:#F0EFE2;font-size:13px;padding:8px 0;line-height:1.6">${data.message}</td></tr>` : ''}
        </table>
        <div style="margin-top:24px;padding:12px 16px;background:#161610;border-left:3px solid #C9C036;border-radius:4px">
          <p style="margin:0;color:#A3A07A;font-size:11px">Sent from the CSR Platform landing page — ${new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>`,
    );
  },

  async sendMorningBrief(to: string, name: string, briefHtml: string) {
    await send(
      to,
      `CSR Platform — Morning Brief (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      `<div style="font-family:sans-serif;max-width:640px;margin:0 auto">
        <p style="font-size:14px;color:#333;margin-bottom:16px">Good morning, ${name}.</p>
        <p style="font-size:13px;color:#666;margin-bottom:24px">Below is your automated risk report generated by the Midnight Auditor at 00:00.</p>
        ${briefHtml}
      </div>`,
    );
  },
};
