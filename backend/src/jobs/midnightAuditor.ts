/**
 * Midnight Auditor — Automated Nightly Risk Scan
 *
 * Runs every night at 00:00 (midnight). Performs a full portfolio risk scan
 * and sends a "Morning Brief" email to all admin/manager users summarising
 * risks detected and AI-generated recommendations for the next day.
 */

import cron from 'node-cron';
import { scanProjectRisks, generateAIInsights } from '../services/smartNotificationService.js';
import { prisma } from '../config/database.js';
import { emailService } from '../services/emailService.js';

async function runMidnightAudit() {
  const startTime = Date.now();
  console.log(`[Midnight Auditor] Starting automated risk scan at ${new Date().toISOString()}`);

  try {
    // 1. Run full risk scan
    const riskScan = await scanProjectRisks();

    // 2. Generate AI insights
    const aiInsights = await generateAIInsights();

    // 3. Build morning brief
    const briefDate = new Date();
    briefDate.setDate(briefDate.getDate()); // today's date for the brief

    const criticalFindings = riskScan.findings.filter(f => f.level === 'critical');
    const highFindings = riskScan.findings.filter(f => f.level === 'high');

    const morningBriefHtml = buildMorningBriefHtml({
      date: briefDate,
      scanned: riskScan.scanned,
      criticalCount: criticalFindings.length,
      highCount: highFindings.length,
      alertsCreated: riskScan.alertsCreated,
      findings: riskScan.findings.slice(0, 10),
      insights: aiInsights.insights.slice(0, 5),
      duration: Date.now() - startTime,
    });

    // 4. Send to all admin + manager users with email notifications enabled
    const recipients = await prisma.user.findMany({
      where: {
        status: 'active',
        role: { in: ['admin', 'manager'] },
        notifyEmail: true,
      },
      select: { email: true, name: true },
    });

    for (const user of recipients) {
      await emailService.sendMorningBrief(user.email, user.name, morningBriefHtml);
    }

    console.log(`[Midnight Auditor] Completed in ${Date.now() - startTime}ms — ${riskScan.scanned} projects scanned, ${riskScan.alertsCreated} new alerts, ${recipients.length} emails sent`);

  } catch (error) {
    console.error('[Midnight Auditor] Error during automated audit:', error);
  }
}

interface BriefData {
  date: Date;
  scanned: number;
  criticalCount: number;
  highCount: number;
  alertsCreated: number;
  findings: { projectName: string; type: string; level: string; message: string; value: number }[];
  insights: { title: string; message: string }[];
  duration: number;
}

function buildMorningBriefHtml(data: BriefData): string {
  const dateStr = data.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const findingsHtml = data.findings.length > 0
    ? data.findings.map(f => {
        const emoji = f.type === 'budget' ? '💰' : f.type === 'timeline' ? '⏱️' : f.type === 'impact' ? '👥' : '⭐';
        const levelColor = f.level === 'critical' ? '#f87171' : '#fb923c';
        return `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #1a1a16;font-size:13px;color:#F0EFE2">${emoji} ${f.projectName}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #1a1a16;font-size:12px;color:${levelColor};font-weight:600;text-transform:uppercase">${f.level}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #1a1a16;font-size:12px;color:#8B8769">${f.message.slice(0, 100)}${f.message.length > 100 ? '...' : ''}</td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="3" style="padding:16px;text-align:center;color:#6B6849;font-size:13px">No new risks detected — all projects within safe thresholds</td></tr>';

  const insightsHtml = data.insights.length > 0
    ? data.insights.map(i => `
        <div style="padding:12px 16px;background:#12120e;border-radius:10px;margin-bottom:8px;border:1px solid #1a1a16">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#C9C036">${i.title}</p>
          <p style="margin:0;font-size:12px;color:#8B8769;line-height:1.5">${i.message}</p>
        </div>`).join('')
    : '<p style="color:#6B6849;font-size:13px">No additional insights generated.</p>';

  return `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:640px;margin:0 auto;background:#0E0E09;color:#F0EFE2;border-radius:16px;overflow:hidden">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a1a12 0%,#0E0E09 100%);padding:32px 28px;border-bottom:1px solid #C9C03620">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:44px;height:44px;border-radius:12px;background:#C9C03618;display:flex;align-items:center;justify-content:center;font-size:20px">🌙</div>
          <div>
            <h1 style="margin:0;font-size:20px;font-weight:800;color:#F0EFE2;font-family:'Playfair Display',serif">Morning Brief</h1>
            <p style="margin:2px 0 0;font-size:12px;color:#6B6849">Midnight Auditor — Automated Risk Report</p>
          </div>
        </div>
        <p style="margin:0;font-size:13px;color:#8B8769">${dateStr}</p>
      </div>

      <!-- KPIs -->
      <div style="padding:24px 28px;display:flex;gap:12px">
        <div style="flex:1;background:#12120e;border-radius:12px;padding:16px;text-align:center;border:1px solid #1a1a16">
          <p style="margin:0;font-size:24px;font-weight:800;color:#C9C036">${data.scanned}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#6B6849;text-transform:uppercase;letter-spacing:0.05em">Projects Scanned</p>
        </div>
        <div style="flex:1;background:#12120e;border-radius:12px;padding:16px;text-align:center;border:1px solid ${data.criticalCount > 0 ? '#f8717130' : '#1a1a16'}">
          <p style="margin:0;font-size:24px;font-weight:800;color:#f87171">${data.criticalCount}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#6B6849;text-transform:uppercase;letter-spacing:0.05em">Critical Risks</p>
        </div>
        <div style="flex:1;background:#12120e;border-radius:12px;padding:16px;text-align:center;border:1px solid ${data.highCount > 0 ? '#fb923c30' : '#1a1a16'}">
          <p style="margin:0;font-size:24px;font-weight:800;color:#fb923c">${data.highCount}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#6B6849;text-transform:uppercase;letter-spacing:0.05em">High Risks</p>
        </div>
        <div style="flex:1;background:#12120e;border-radius:12px;padding:16px;text-align:center;border:1px solid #1a1a16">
          <p style="margin:0;font-size:24px;font-weight:800;color:#34d399">${data.alertsCreated}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#6B6849;text-transform:uppercase;letter-spacing:0.05em">New Alerts</p>
        </div>
      </div>

      <!-- Findings Table -->
      <div style="padding:0 28px 24px">
        <h2 style="font-size:14px;font-weight:700;color:#F0EFE2;margin:0 0 12px;display:flex;align-items:center;gap:8px">
          <span style="color:#f87171">⚠</span> Risk Findings
        </h2>
        <table style="width:100%;border-collapse:collapse;background:#12120e;border-radius:10px;overflow:hidden;border:1px solid #1a1a16">
          <thead>
            <tr style="background:#16160f">
              <th style="padding:10px 12px;text-align:left;font-size:10px;color:#6B6849;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Project</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;color:#6B6849;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Level</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;color:#6B6849;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Details</th>
            </tr>
          </thead>
          <tbody>${findingsHtml}</tbody>
        </table>
      </div>

      <!-- AI Insights -->
      <div style="padding:0 28px 24px">
        <h2 style="font-size:14px;font-weight:700;color:#F0EFE2;margin:0 0 12px;display:flex;align-items:center;gap:8px">
          <span style="color:#C9C036">🧠</span> AI Recommendations
        </h2>
        ${insightsHtml}
      </div>

      <!-- Footer -->
      <div style="padding:20px 28px;border-top:1px solid #1a1a16;text-align:center">
        <p style="margin:0;font-size:11px;color:#4a4832">
          Automated by CSR Platform Midnight Auditor · Scan completed in ${data.duration}ms
        </p>
        <p style="margin:6px 0 0;font-size:11px;color:#4a4832">
          Ministry of Commerce & Industry, Sultanate of Oman © 2026
        </p>
      </div>
    </div>`;
}

/**
 * Register the midnight auditor cron job.
 * Schedule: every day at 00:00 (midnight).
 */
export function startMidnightAuditor() {
  // Run at 00:00 every day
  cron.schedule('0 0 * * *', () => {
    runMidnightAudit();
  }, {
    timezone: 'Asia/Muscat', // Oman timezone (GMT+4)
  });

  console.log('[Midnight Auditor] Registered — will run daily at 00:00 (Asia/Muscat)');
}

// Export for manual trigger via API
export { runMidnightAudit };
