/**
 * RESEED SCRIPT — 22 professional CSR projects
 * Total budget: 181,000 OMR | Distributed across 12 months for flowing charts
 * Mix: active, at-risk, completed, on_hold, planning
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const REGIONS = [
  { name: 'Muscat', lat: 23.5880, lng: 58.3829 },
  { name: 'Dhofar', lat: 17.0194, lng: 54.0924 },
  { name: 'Al Batinah North', lat: 24.1700, lng: 56.7700 },
  { name: 'Al Batinah South', lat: 23.6500, lng: 57.4800 },
  { name: 'Al Dakhiliyah', lat: 22.9333, lng: 57.5333 },
  { name: 'Al Sharqiyah North', lat: 22.5300, lng: 58.9100 },
  { name: 'Al Sharqiyah South', lat: 22.0000, lng: 59.0000 },
  { name: 'Al Dhahirah', lat: 23.3000, lng: 56.4500 },
  { name: 'Al Buraimi', lat: 24.2500, lng: 55.7900 },
  { name: 'Musandam', lat: 26.2000, lng: 56.2500 },
  { name: 'Al Wusta', lat: 20.2700, lng: 56.5600 },
];

/** Returns a Date N months ago from now */
function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1 + Math.floor(Math.random() * 20));
  return d;
}

async function main() {
  console.log('\n🗑️  Clearing all project-related data...');

  await prisma.scenarioAction.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ideaVote.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.challengeReward.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.successStory.deleteMany();
  await prisma.document.deleteMany();
  await prisma.media.deleteMany();
  await prisma.review.deleteMany();
  await prisma.projectTeam.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.project.deleteMany();

  console.log('✅ Cleared');

  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const partners = await prisma.partner.findMany({ select: { id: true } });

  const admins = users.filter(u => u.role === 'admin');
  const managers = users.filter(u => u.role === 'manager');
  const employees = users.filter(u => u.role === 'employee');
  const allManagers = [...admins, ...managers];

  const catMap: Record<string, string> = {};
  for (const c of categories) catMap[c.name] = c.id;

  // ═══════════════════════════════════════════════════════════════
  // 22 PROJECTS — createdAt distributed across last 12 months
  // so budgetTrend shows natural flow
  // ═══════════════════════════════════════════════════════════════
  const projects = [
    // ── COMPLETED (6) — created 8-12 months ago ──
    {
      name: 'Mangrove Restoration Phase 1', catName: 'Environmental Protection',
      budget: 7500, progress: 100, status: 'completed' as const,
      region: 'Al Batinah North', description: 'Planted 15,000 mangrove seedlings across 3 coastal sites, establishing carbon sinks and protecting shorelines.',
      createdAt: monthsAgo(11), startDate: new Date('2025-04-01'), endDate: new Date('2025-12-31'),
      sdg: ['13', '14', '15'], riskBudget: 95, riskTimeline: 90, riskQuality: 98,
    },
    {
      name: 'Bedouin Craft Revival Workshop', catName: 'Heritage Conservation',
      budget: 4200, progress: 100, status: 'completed' as const,
      region: 'Al Sharqiyah North', description: 'Trained 60 women in traditional weaving and silver craft. Products now sold at 8 hotel gift shops.',
      createdAt: monthsAgo(10), startDate: new Date('2025-05-01'), endDate: new Date('2025-11-30'),
      sdg: ['5', '8', '11'], riskBudget: 88, riskTimeline: 92, riskQuality: 94,
    },
    {
      name: 'Omani Sign Language App', catName: 'Disability Support',
      budget: 3800, progress: 100, status: 'completed' as const,
      region: 'Muscat', description: 'Free mobile app with 500+ Omani Sign Language video lessons. 2,000 downloads in first month.',
      createdAt: monthsAgo(9), startDate: new Date('2025-05-15'), endDate: new Date('2025-12-15'),
      sdg: ['4', '10'], riskBudget: 92, riskTimeline: 88, riskQuality: 96,
    },
    {
      name: 'Mobile Health Clinic Fleet', catName: 'Family Empowerment',
      budget: 9200, progress: 100, status: 'completed' as const,
      region: 'Al Sharqiyah South', description: 'Deployed 3 mobile health clinics serving 4,500 patients. Maternal and child health focus.',
      createdAt: monthsAgo(8), startDate: new Date('2025-06-01'), endDate: new Date('2026-01-31'),
      sdg: ['3', '5', '10'], riskBudget: 90, riskTimeline: 85, riskQuality: 95,
    },
    {
      name: 'Turtle Conservation Monitoring', catName: 'Environmental Protection',
      budget: 5800, progress: 100, status: 'completed' as const,
      region: 'Al Sharqiyah South', description: 'GPS tracking on 40 green turtles and trained 25 local rangers. Nesting success rate improved 35%.',
      createdAt: monthsAgo(7), startDate: new Date('2025-07-01'), endDate: new Date('2026-02-28'),
      sdg: ['14', '15'], riskBudget: 85, riskTimeline: 90, riskQuality: 92,
    },
    {
      name: 'STEM Lab for Girls', catName: 'Education Support',
      budget: 6200, progress: 100, status: 'completed' as const,
      region: 'Al Dakhiliyah', description: 'Built 2 STEM labs in girls schools. 400 students now have robotics and science equipment.',
      createdAt: monthsAgo(6), startDate: new Date('2025-08-01'), endDate: new Date('2026-01-20'),
      sdg: ['4', '5', '9'], riskBudget: 90, riskTimeline: 85, riskQuality: 93,
    },

    // ── ACTIVE (8) — created 1-7 months ago (spread!) ──
    {
      name: 'Clean Shores Initiative', catName: 'Environmental Protection',
      budget: 12500, progress: 72, status: 'active' as const,
      region: 'Muscat', description: 'Coastal cleanup and marine ecosystem restoration across 14 beaches. 500+ monthly volunteers.',
      createdAt: monthsAgo(7), startDate: new Date('2025-09-01'), endDate: new Date('2026-08-31'),
      sdg: ['14', '15'], riskBudget: 75, riskTimeline: 60, riskQuality: 85,
    },
    {
      name: 'Aflaj Water Heritage Revival', catName: 'Aflaj Preservation',
      budget: 9800, progress: 88, status: 'active' as const,
      region: 'Al Sharqiyah North', description: 'Restoring 3 ancient aflaj channels while documenting traditional water management for UNESCO.',
      createdAt: monthsAgo(6), startDate: new Date('2025-09-15'), endDate: new Date('2026-05-15'),
      sdg: ['6', '11', '15'], riskBudget: 85, riskTimeline: 80, riskQuality: 95,
    },
    {
      name: 'Solar Village Pilot', catName: 'Renewable Energy',
      budget: 14200, progress: 58, status: 'active' as const,
      region: 'Al Dhahirah', description: 'Solar panels and battery storage in 25 off-grid homes, reducing diesel by 80%.',
      createdAt: monthsAgo(5), startDate: new Date('2025-10-01'), endDate: new Date('2026-09-30'),
      sdg: ['7', '11', '13'], riskBudget: 70, riskTimeline: 55, riskQuality: 80,
    },
    {
      name: 'Youth Sports Academy', catName: 'Community Sports',
      budget: 6800, progress: 62, status: 'active' as const,
      region: 'Dhofar', description: 'After-school sports for 300 youth in Salalah — football, swimming, and athletics coaching.',
      createdAt: monthsAgo(4), startDate: new Date('2025-11-01'), endDate: new Date('2026-07-31'),
      sdg: ['3', '4', '10'], riskBudget: 80, riskTimeline: 70, riskQuality: 88,
    },
    {
      name: 'Rural School Connectivity', catName: 'Education Support',
      budget: 15000, progress: 45, status: 'active' as const,
      region: 'Al Dakhiliyah', description: 'High-speed internet, tablets, and digital platforms to 12 remote schools in Al Dakhiliyah.',
      createdAt: monthsAgo(3), startDate: new Date('2025-12-01'), endDate: new Date('2026-08-30'),
      sdg: ['4', '9', '10'], riskBudget: 60, riskTimeline: 50, riskQuality: 90,
    },
    {
      name: 'Women Entrepreneurship Accelerator', catName: 'Family Empowerment',
      budget: 8500, progress: 35, status: 'active' as const,
      region: 'Al Batinah North', description: 'Business incubation for 40 women-led startups with microfinance and mentorship.',
      createdAt: monthsAgo(2), startDate: new Date('2026-01-10'), endDate: new Date('2026-12-31'),
      sdg: ['5', '8', '10'], riskBudget: 45, riskTimeline: 40, riskQuality: 75,
    },
    {
      name: 'Disability Employment Bridge', catName: 'Disability Support',
      budget: 7200, progress: 28, status: 'active' as const,
      region: 'Muscat', description: 'Job placement for 50 persons with disabilities in partnership with 15 companies.',
      createdAt: monthsAgo(2), startDate: new Date('2026-01-15'), endDate: new Date('2026-11-30'),
      sdg: ['8', '10'], riskBudget: 35, riskTimeline: 30, riskQuality: 70,
    },
    {
      name: 'Frankincense Trail Eco-Tourism', catName: 'Sustainable Tourism',
      budget: 11000, progress: 50, status: 'active' as const,
      region: 'Dhofar', description: 'Eco-tourism trails and guide training along the Frankincense route, supporting 8 villages.',
      createdAt: monthsAgo(3), startDate: new Date('2025-12-01'), endDate: new Date('2026-11-15'),
      sdg: ['8', '11', '15'], riskBudget: 55, riskTimeline: 50, riskQuality: 82,
    },

    // ── AT-RISK / ON HOLD (4) — created 1-5 months ago ──
    {
      name: 'Emergency Food Distribution Network', catName: 'Food Security',
      budget: 6500, progress: 15, status: 'active' as const,
      region: 'Al Wusta', description: 'Food banks and mobile distribution for 200 vulnerable families in remote Al Wusta.',
      createdAt: monthsAgo(5), startDate: new Date('2025-10-01'), endDate: new Date('2026-04-30'),
      sdg: ['1', '2', '3'], riskBudget: 25, riskTimeline: 15, riskQuality: 40,
    },
    {
      name: 'Coding Bootcamp for Graduates', catName: 'Vocational Training',
      budget: 5500, progress: 20, status: 'on_hold' as const,
      region: 'Muscat', description: '6-month coding program paused — instructor shortage. 30 students waiting to resume.',
      createdAt: monthsAgo(4), startDate: new Date('2025-11-01'), endDate: new Date('2026-06-30'),
      sdg: ['4', '8', '9'], riskBudget: 50, riskTimeline: 20, riskQuality: 55,
    },
    {
      name: 'Heritage Museum Digitization', catName: 'Heritage Conservation',
      budget: 4800, progress: 12, status: 'on_hold' as const,
      region: 'Musandam', description: 'Digitizing 5,000 artifacts from Musandam collection. On hold pending equipment.',
      createdAt: monthsAgo(3), startDate: new Date('2025-12-01'), endDate: new Date('2026-09-30'),
      sdg: ['4', '11'], riskBudget: 30, riskTimeline: 10, riskQuality: 45,
    },
    {
      name: 'Smart Farm Innovation Lab', catName: 'Innovation Hub',
      budget: 8000, progress: 22, status: 'active' as const,
      region: 'Al Batinah South', description: 'IoT precision agriculture lab — equipment costs exceeding original estimates.',
      createdAt: monthsAgo(4), startDate: new Date('2025-11-01'), endDate: new Date('2026-05-31'),
      sdg: ['2', '9', '12'], riskBudget: 20, riskTimeline: 35, riskQuality: 50,
    },

    // ── PLANNING (4) — created recently (last 1-2 months) ──
    {
      name: 'Desert Reforestation Initiative', catName: 'Environmental Protection',
      budget: 15600, progress: 0, status: 'planning' as const,
      region: 'Al Dhahirah', description: '50,000 drought-resistant native trees using treated wastewater in Al Dhahirah.',
      createdAt: monthsAgo(1), startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'),
      sdg: ['13', '15'], riskBudget: 50, riskTimeline: 50, riskQuality: 70,
    },
    {
      name: 'AI for Social Good Lab', catName: 'Innovation Hub',
      budget: 10500, progress: 0, status: 'planning' as const,
      region: 'Muscat', description: 'AI research lab for local social challenges — healthcare, education, urban planning.',
      createdAt: monthsAgo(1), startDate: new Date('2026-07-01'), endDate: new Date('2027-06-30'),
      sdg: ['9', '11', '17'], riskBudget: 50, riskTimeline: 50, riskQuality: 65,
    },
    {
      name: 'Community Fishing Cooperative', catName: 'Food Security',
      budget: 5200, progress: 0, status: 'planning' as const,
      region: 'Al Buraimi', description: 'Fishing cooperative for 80 families — shared cold storage, boats, and market access.',
      createdAt: monthsAgo(0), startDate: new Date('2026-08-01'), endDate: new Date('2027-04-30'),
      sdg: ['1', '2', '14'], riskBudget: 50, riskTimeline: 50, riskQuality: 60,
    },
    {
      name: 'Elderly Digital Literacy Program', catName: 'Vocational Training',
      budget: 3200, progress: 0, status: 'planning' as const,
      region: 'Al Batinah South', description: 'Teaching 200 seniors to use smartphones, e-government, and video calling.',
      createdAt: monthsAgo(0), startDate: new Date('2026-05-15'), endDate: new Date('2026-11-30'),
      sdg: ['4', '10'], riskBudget: 50, riskTimeline: 50, riskQuality: 75,
    },
  ];

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  console.log(`\n📊 Creating ${projects.length} projects | Total: ${totalBudget.toLocaleString()} OMR\n`);

  // ── Expense distribution: spread expenses across each month from project start to now ──
  const expenseCategories = ['Personnel', 'Equipment', 'Materials', 'Transportation', 'Training', 'Administration', 'Consulting'];

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const regionInfo = REGIONS.find(r => r.name === p.region) || REGIONS[0];
    const categoryId = catMap[p.catName];
    if (!categoryId) { console.log(`⚠️  Skip "${p.catName}"`); continue; }
    const managerId = allManagers[i % allManagers.length].id;

    const project = await prisma.project.create({
      data: {
        name: p.name, categoryId, managerId,
        budget: p.budget, progress: p.progress, status: p.status,
        location: `${p.region}, Oman`, region: p.region,
        latitude: regionInfo.lat + (Math.random() - 0.5) * 0.3,
        longitude: regionInfo.lng + (Math.random() - 0.5) * 0.3,
        startDate: p.startDate, endDate: p.endDate,
        description: p.description, sdgGoals: p.sdg,
        tags: p.name.toLowerCase().split(' ').slice(0, 3),
        objectives: [`Deliver ${p.name} outcomes`, 'Engage community stakeholders', 'Achieve measurable impact'],
        expectedOutputs: ['Quarterly reports', 'Final impact assessment', 'Sustainability plan'],
        riskThresholds: { budgetWarning: 70, budgetCritical: 85, timelineWarning: 70, timelineCritical: 85, qualityWarning: 60, qualityCritical: 40 },
        createdAt: p.createdAt,
      },
    });

    // ── Milestones ──
    const msCount = 3 + Math.floor(Math.random() * 3);
    for (let m = 0; m < msCount; m++) {
      const mDate = new Date(p.startDate);
      mDate.setMonth(mDate.getMonth() + Math.floor((m + 1) * ((p.endDate.getTime() - p.startDate.getTime()) / (msCount * 30 * 86400000))));
      await prisma.milestone.create({
        data: {
          projectId: project.id,
          title: ['Kickoff & Planning', 'Phase Implementation', 'Stakeholder Review', 'Mid-term Evaluation', 'Final Delivery'][m % 5],
          status: p.progress >= ((m + 1) / msCount) * 100 ? 'completed' : 'pending',
          date: mDate,
        },
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // EXPENSES — KEY: distribute across every month from startDate to now
    // This is what makes the Budget & Expenditure Flow chart show flow!
    // ══════════════════════════════════════════════════════════════════
    if (p.status !== 'planning') {
      const spentPct = p.status === 'completed' ? 0.88 + Math.random() * 0.1 : (p.progress / 100) * (0.7 + Math.random() * 0.3);
      const totalSpent = p.budget * spentPct;

      // Calculate months from project start to now (or endDate if completed)
      const now = new Date();
      const effectiveEnd = p.status === 'completed' ? p.endDate : now;
      const monthsBetween = Math.max(1, Math.round((effectiveEnd.getTime() - p.startDate.getTime()) / (30 * 86400000)));

      // Create a spending curve — starts slow, peaks mid-project, tapers off
      const monthWeights: number[] = [];
      for (let m = 0; m < monthsBetween; m++) {
        const t = m / Math.max(1, monthsBetween - 1); // 0 to 1
        // Bell curve: peaks around 40-60% of project life
        const weight = Math.exp(-Math.pow((t - 0.45) * 2.5, 2)) * (0.7 + Math.random() * 0.6);
        monthWeights.push(weight);
      }
      const weightSum = monthWeights.reduce((a, b) => a + b, 0);

      for (let m = 0; m < monthsBetween; m++) {
        const monthSpend = totalSpent * (monthWeights[m] / weightSum);
        const expDate = new Date(p.startDate);
        expDate.setMonth(expDate.getMonth() + m);

        // 2-4 expenses per month for granularity
        const numExp = 2 + Math.floor(Math.random() * 3);
        for (let ne = 0; ne < numExp; ne++) {
          const expDay = new Date(expDate);
          expDay.setDate(1 + Math.floor(Math.random() * 27));
          const amount = (monthSpend / numExp) * (0.5 + Math.random());

          let expStatus: 'approved' | 'pending' | 'rejected' = 'approved';
          if (p.riskBudget < 30 && Math.random() < 0.25) expStatus = 'pending';
          if (p.riskBudget < 20 && Math.random() < 0.15) expStatus = 'rejected';

          await prisma.expense.create({
            data: {
              projectId: project.id,
              amount: Math.round(amount * 100) / 100,
              category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
              status: expStatus,
              date: expDay,
              description: `${expenseCategories[Math.floor(Math.random() * expenseCategories.length)]} expense`,
            },
          });
        }
      }
    }

    // ── Beneficiaries ──
    if (p.status !== 'planning') {
      const count = Math.floor(80 + Math.random() * 400);
      const male = Math.floor(count * (0.35 + Math.random() * 0.15));
      const female = Math.floor(count * (0.3 + Math.random() * 0.15));
      const children = Math.floor(count * (0.08 + Math.random() * 0.12));
      await prisma.beneficiary.create({
        data: {
          projectId: project.id, count, male, female, children,
          elderly: Math.floor(count * 0.05), disabled: Math.floor(count * 0.03),
          ageGroup: ['adults', 'mixed', 'youth', 'elderly'][Math.floor(Math.random() * 4)],
          impact: p.progress >= 80 ? 'High' : p.progress >= 40 ? 'Medium' : 'Low',
        },
      });
    }

    // ── Reviews ──
    if (p.progress > 30) {
      const rc = p.status === 'completed' ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
      for (let r = 0; r < rc; r++) {
        const reviewer = employees[Math.floor(Math.random() * employees.length)] || users[0];
        await prisma.review.create({
          data: {
            projectId: project.id, userId: reviewer.id,
            rating: p.riskQuality >= 85 ? 4.5 + Math.random() * 0.5 : p.riskQuality >= 60 ? 3.5 + Math.random() : 2 + Math.random() * 2,
            comment: ['Excellent progress and community impact.', 'Good execution, needs better documentation.', 'Strong team but timeline needs attention.', 'Impressive results, exceeding expectations.', 'Needs more resource allocation.', 'Community feedback very positive.'][Math.floor(Math.random() * 6)],
          },
        });
      }
    }

    // ── Alerts ──
    if (p.riskBudget < 40) {
      await prisma.alert.create({
        data: { projectId: project.id, type: 'budget', level: p.riskBudget < 25 ? 'critical' : 'warning',
          message: `Budget risk at ${100 - p.riskBudget}% — ${p.name}. ${p.riskBudget < 25 ? 'Immediate action required.' : 'Review recommended.'}` },
      });
    }
    if (p.riskTimeline < 40) {
      await prisma.alert.create({
        data: { projectId: project.id, type: 'timeline', level: p.riskTimeline < 20 ? 'critical' : 'warning',
          message: `Timeline risk: ${p.progress}% done — ${p.name}. May miss deadline.` },
      });
    }
    if (p.riskQuality < 50) {
      await prisma.alert.create({
        data: { projectId: project.id, type: 'quality', level: p.riskQuality < 40 ? 'critical' : 'warning',
          message: `Quality score below threshold — ${p.name}. Stakeholder satisfaction needs work.` },
      });
    }

    // ── Team ──
    const shuffled = [...employees].sort(() => Math.random() - 0.5);
    for (let t = 0; t < Math.min(2 + Math.floor(Math.random() * 3), shuffled.length); t++) {
      try {
        await prisma.projectTeam.create({
          data: { projectId: project.id, userId: shuffled[t].id, role: ['Lead', 'Coordinator', 'Field Officer', 'Analyst'][t % 4] },
        });
      } catch { /* unique skip */ }
    }

    // ── Donations ──
    if (p.status !== 'planning' && partners.length > 0) {
      for (let d = 0; d < 1 + Math.floor(Math.random() * 3); d++) {
        const partner = partners[Math.floor(Math.random() * partners.length)];
        const donDate = new Date(p.startDate);
        donDate.setMonth(donDate.getMonth() + Math.floor(Math.random() * 4));
        await prisma.donation.create({
          data: { partnerId: partner.id, projectId: project.id, amount: Math.round((1000 + Math.random() * 5000) * 100) / 100, type: ['corporate', 'individual', 'grant', 'in-kind'][Math.floor(Math.random() * 4)], createdAt: donDate },
        });
      }
    }

    // ── Activity Logs — SPREAD across months! ──
    const logActions = ['created', 'updated', 'reviewed', 'milestone_completed', 'expense_added', 'team_updated', 'status_changed'];
    const logCount = p.status === 'completed' ? 8 + Math.floor(Math.random() * 6) : p.status === 'active' ? 4 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 2);
    for (let l = 0; l < logCount; l++) {
      const logDate = new Date(p.createdAt);
      const daysRange = Math.max(1, Math.floor((Date.now() - p.createdAt.getTime()) / 86400000));
      logDate.setDate(logDate.getDate() + Math.floor(Math.random() * daysRange));
      await prisma.activityLog.create({
        data: {
          userId: users[Math.floor(Math.random() * users.length)].id,
          projectId: project.id,
          action: logActions[Math.floor(Math.random() * logActions.length)],
          entity: 'project', entityId: project.id,
          details: `${logActions[Math.floor(Math.random() * logActions.length)]} on ${p.name}`,
          type: 'project', createdAt: logDate,
        },
      });
    }

    const icon = { completed: '✅', active: '🟢', on_hold: '🟡', planning: '📋', archived: '📦' }[p.status];
    const risk = (p.riskBudget < 30 || p.riskTimeline < 30) ? ' ⚠️' : '';
    console.log(`  ${icon} ${p.name.padEnd(42)} ${p.status.padEnd(10)} ${String(p.progress).padStart(3)}%  ${String(p.budget).padStart(6)} OMR  ${p.region}${risk}`);
  }

  // ── Ideas ──
  const ideaList = [
    { title: 'Carbon Offset Marketplace for Oman', desc: 'Local carbon credit trading platform.', status: 'approved' as const },
    { title: 'AI-Powered Beneficiary Matching', desc: 'ML matching beneficiaries to CSR programs.', status: 'under_review' as const },
    { title: 'VR Heritage Tours', desc: 'VR experiences of Omani heritage sites.', status: 'approved' as const },
    { title: 'Mobile Blood Donation Tracker', desc: 'Real-time donor-hospital connection app.', status: 'pending' as const },
    { title: 'Green Roof Initiative for Schools', desc: 'Rooftop gardens for education and food.', status: 'under_review' as const },
    { title: 'Elderly Companion Robot Program', desc: 'Social robots in elderly care facilities.', status: 'pending' as const },
    { title: 'Microplastic Ocean Cleanup Drone', desc: 'Autonomous coastal microplastic collection.', status: 'approved' as const },
    { title: 'Community Solar Charging Stations', desc: 'Free solar charging in rural areas.', status: 'rejected' as const },
  ];
  for (const idea of ideaList) {
    await prisma.idea.create({
      data: { userId: employees[Math.floor(Math.random() * employees.length)]?.id || users[0].id, title: idea.title, description: idea.desc, status: idea.status, votes: Math.floor(Math.random() * 30) },
    });
  }

  // ── Challenge ──
  await prisma.challenge.create({
    data: { title: 'Ramadan Giving Challenge 2026', description: 'Donate to any CSR project during Ramadan.', goal: 25000, collected: 18750, startDate: new Date('2026-02-28'), endDate: new Date('2026-03-30'), status: 'active', participants: 145 },
  });

  // ── Summary ──
  const fc = {
    projects: await prisma.project.count(),
    expenses: await prisma.expense.count(),
    beneficiaries: await prisma.beneficiary.count(),
    alerts: await prisma.alert.count(),
    milestones: await prisma.milestone.count(),
    reviews: await prisma.review.count(),
    donations: await prisma.donation.count(),
    activities: await prisma.activityLog.count(),
    ideas: await prisma.idea.count(),
  };

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RESEED COMPLETE');
  console.log('═══════════════════════════════════════════');
  Object.entries(fc).forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${v}`));
  console.log(`  ${'Total Budget'.padEnd(16)} ${totalBudget.toLocaleString()} OMR`);
  console.log('═══════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
