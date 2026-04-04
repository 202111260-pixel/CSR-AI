/**
 * Demo seed — 6 projects for graduation presentation
 * Budget total: 22,000 OMR  |  Range: Feb–May 2026
 * Designed to trigger early-warning alerts (budget & timeline)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const uid = () => crypto.randomUUID();

async function main() {
  // ── pick real IDs ──────────────────────────────────────────────────────────
  const adminUser = await prisma.user.findFirst({
    where: { email: { contains: 'gcet.edu.om' } },
    select: { id: true },
  });
  const ADMIN = adminUser!.id;

  const cats = await prisma.category.findMany({ select: { id: true, name: true } });
  const catId = (name: string) =>
    (cats.find(c => c.name.toLowerCase().includes(name.toLowerCase())) ?? cats[0]).id;

  const ENV  = catId('Environmental');
  const SOC  = catId('Social');
  const VOC  = catId('Vocational');
  const FAM  = catId('Family');
  const DIS  = catId('Disability');

  console.log('✅ IDs resolved. Inserting 6 projects…');

  // ── PROJECT 1 — Healthy / on track ────────────────────────────────────────
  const p1 = await prisma.project.create({ data: {
    name: 'حملة التوعية البيئية - Environmental Awareness Campaign',
    description: 'توعية المجتمع بأهمية الحفاظ على البيئة وتنظيم ورش عمل ميدانية في 4 ولايات.',
    categoryId: ENV,
    managerId: ADMIN,
    budget: 4000,
    region: 'Muscat',
    location: 'Muscat, Oman',
    status: 'active',
    progress: 55,
    startDate: d(2026, 2, 1),
    endDate:   d(2026, 5, 31),
    objectives: JSON.stringify(['Raise awareness in 4 governorates', 'Conduct 8 workshops', 'Reach 500 participants']),
    sdgGoals:   JSON.stringify([13, 15]),
    tags:       JSON.stringify(['environment', 'awareness', 'community']),
  }});

  await prisma.expense.createMany({ data: [
    { projectId: p1.id, amount: 600,  category: 'Materials',  status: 'approved', date: d(2026,2,5),  description: 'Workshop materials', invoiceUrl: '' },
    { projectId: p1.id, amount: 450,  category: 'Transport',  status: 'approved', date: d(2026,2,20), description: 'Field trips', invoiceUrl: '' },
    { projectId: p1.id, amount: 500,  category: 'Printing',   status: 'approved', date: d(2026,3,10), description: 'Awareness brochures', invoiceUrl: '' },
    { projectId: p1.id, amount: 300,  category: 'Catering',   status: 'pending',  date: d(2026,4,5),  description: 'Event refreshments', invoiceUrl: '' },
  ]});
  await prisma.milestone.createMany({ data: [
    { projectId: p1.id, title: 'Kick-off meeting',         status: 'completed', date: d(2026,2,3)  },
    { projectId: p1.id, title: 'Phase 1 workshops (Muscat)',status: 'completed', date: d(2026,2,28) },
    { projectId: p1.id, title: 'Phase 2 workshops (Dhofar)',status: 'pending',   date: d(2026,4,15) },
    { projectId: p1.id, title: 'Final report submission',   status: 'pending',   date: d(2026,5,25) },
  ]});
  await prisma.beneficiary.create({ data: {
    projectId: p1.id, count: 220, male: 120, female: 100, children: 40, elderly: 15, disabled: 8,
    ageGroup: '18-45', gender: 'mixed', description: 'Community residents across Muscat', impact: 'Increased environmental awareness',
  }});

  // ── PROJECT 2 — TIMELINE RISK  (deadline passed, only 48% done) ────────────
  const p2 = await prisma.project.create({ data: {
    name: 'دعم المدارس الأهلية - Private Schools Support Initiative',
    description: 'توفير المستلزمات التعليمية والدعم المادي للطلاب ذوي الدخل المحدود في المدارس الأهلية.',
    categoryId: SOC,
    managerId: ADMIN,
    budget: 5000,
    region: 'Al Batinah North',
    location: 'Sohar, Al Batinah North',
    status: 'active',
    progress: 48,
    startDate: d(2026, 2, 1),
    endDate:   d(2026, 4, 30), // ← deadline PASSED
    objectives: JSON.stringify(['Support 150 students', 'Provide school supplies', 'Cover exam fees']),
    sdgGoals:   JSON.stringify([4, 10]),
    tags:       JSON.stringify(['education', 'youth', 'support']),
  }});

  await prisma.expense.createMany({ data: [
    { projectId: p2.id, amount: 800,  category: 'Supplies',   status: 'approved', date: d(2026,2,10), description: 'School bags & stationery', invoiceUrl: '' },
    { projectId: p2.id, amount: 600,  category: 'Fees',       status: 'approved', date: d(2026,2,25), description: 'Registration fees', invoiceUrl: '' },
    { projectId: p2.id, amount: 700,  category: 'Supplies',   status: 'approved', date: d(2026,3,15), description: 'Textbooks batch 2', invoiceUrl: '' },
    { projectId: p2.id, amount: 500,  category: 'Transport',  status: 'approved', date: d(2026,3,28), description: 'Distribution logistics', invoiceUrl: '' },
  ]});
  await prisma.milestone.createMany({ data: [
    { projectId: p2.id, title: 'Needs assessment survey',    status: 'completed', date: d(2026,2,10) },
    { projectId: p2.id, title: 'First batch distribution',   status: 'completed', date: d(2026,2,28) },
    { projectId: p2.id, title: 'Second batch distribution',  status: 'pending',   date: d(2026,3,31) }, // overdue
    { projectId: p2.id, title: 'Impact evaluation',          status: 'pending',   date: d(2026,4,25) }, // overdue
  ]});
  await prisma.beneficiary.create({ data: {
    projectId: p2.id, count: 150, male: 80, female: 70, children: 130, elderly: 0, disabled: 5,
    ageGroup: '6-18', gender: 'mixed', description: 'Low-income school students', impact: 'Improved educational access',
  }});
  // ← timeline alert
  await prisma.alert.create({ data: {
    projectId: p2.id,
    type: 'timeline', level: 'critical',
    message: 'المشروع تجاوز تاريخ الانتهاء المحدد (30 أبريل 2026) ولم يكتمل سوى 48% من العمل. التأخر الحالي: 4 أيام.',
  }});

  // ── PROJECT 3 — BUDGET RISK  (93% spent, still 35% progress left) ─────────
  const p3 = await prisma.project.create({ data: {
    name: 'برنامج التدريب المهني للشباب - Youth Vocational Training Program',
    description: 'تدريب الشباب العاطل على مهارات الحرف اليدوية والتقنية لتعزيز فرص التوظيف.',
    categoryId: VOC,
    managerId: ADMIN,
    budget: 4500,
    region: 'Dhofar',
    location: 'Salalah, Dhofar',
    status: 'active',
    progress: 65,
    startDate: d(2026, 2, 15),
    endDate:   d(2026, 5, 15),
    objectives: JSON.stringify(['Train 60 youth', 'Cover 5 skill tracks', 'Achieve 80% employment rate']),
    sdgGoals:   JSON.stringify([8, 4]),
    tags:       JSON.stringify(['vocational', 'youth', 'employment']),
  }});

  await prisma.expense.createMany({ data: [
    { projectId: p3.id, amount: 1200, category: 'Equipment',  status: 'approved', date: d(2026,2,18), description: 'Training tools & equipment', invoiceUrl: '' },
    { projectId: p3.id, amount: 900,  category: 'Trainers',   status: 'approved', date: d(2026,3,1),  description: 'Expert trainer fees', invoiceUrl: '' },
    { projectId: p3.id, amount: 800,  category: 'Materials',  status: 'approved', date: d(2026,3,20), description: 'Course materials', invoiceUrl: '' },
    { projectId: p3.id, amount: 700,  category: 'Venue',      status: 'approved', date: d(2026,4,5),  description: 'Venue rental', invoiceUrl: '' },
    { projectId: p3.id, amount: 600,  category: 'Trainers',   status: 'pending',  date: d(2026,4,20), description: 'Phase 2 trainer fees', invoiceUrl: '' },
  ]});
  await prisma.milestone.createMany({ data: [
    { projectId: p3.id, title: 'Participant recruitment',    status: 'completed', date: d(2026,2,20) },
    { projectId: p3.id, title: 'Track 1 & 2 completion',    status: 'completed', date: d(2026,3,25) },
    { projectId: p3.id, title: 'Track 3 & 4 completion',    status: 'pending',   date: d(2026,4,30) },
    { projectId: p3.id, title: 'Graduation ceremony',       status: 'pending',   date: d(2026,5,10) },
  ]});
  await prisma.beneficiary.create({ data: {
    projectId: p3.id, count: 60, male: 38, female: 22, children: 0, elderly: 0, disabled: 4,
    ageGroup: '18-30', gender: 'mixed', description: 'Unemployed youth in Dhofar', impact: 'Improved employability',
  }});
  // ← budget alert
  await prisma.alert.create({ data: {
    projectId: p3.id,
    type: 'budget', level: 'warning',
    message: 'استُنفق 93% من الميزانية (4,200 OMR من أصل 4,500 OMR) بينما لا يزال 35% من العمل متبقياً. خطر تجاوز الميزانية مرتفع.',
  }});

  // ── PROJECT 4 — ON HOLD / متعثر ────────────────────────────────────────────
  const p4 = await prisma.project.create({ data: {
    name: 'مبادرة رعاية المسنين - Elderly Care Initiative',
    description: 'تقديم الدعم الصحي والاجتماعي لكبار السن في المناطق الريفية عبر زيارات منزلية منتظمة.',
    categoryId: FAM,
    managerId: ADMIN,
    budget: 3500,
    region: 'Al Dakhiliyah',
    location: 'Nizwa, Al Dakhiliyah',
    status: 'on_hold',
    progress: 30,
    startDate: d(2026, 2, 20),
    endDate:   d(2026, 5, 20),
    objectives: JSON.stringify(['Serve 200 elderly', 'Monthly health checkups', 'Emergency support fund']),
    sdgGoals:   JSON.stringify([3, 10]),
    tags:       JSON.stringify(['elderly', 'healthcare', 'social']),
  }});

  await prisma.expense.createMany({ data: [
    { projectId: p4.id, amount: 500,  category: 'Medical',    status: 'approved', date: d(2026,2,22), description: 'Medical supplies', invoiceUrl: '' },
    { projectId: p4.id, amount: 400,  category: 'Transport',  status: 'approved', date: d(2026,3,5),  description: 'Home visit transport', invoiceUrl: '' },
    { projectId: p4.id, amount: 300,  category: 'Materials',  status: 'pending',  date: d(2026,3,25), description: 'Care packages', invoiceUrl: '' },
  ]});
  await prisma.milestone.createMany({ data: [
    { projectId: p4.id, title: 'Beneficiary registration',  status: 'completed', date: d(2026,2,28) },
    { projectId: p4.id, title: 'First round home visits',   status: 'completed', date: d(2026,3,20) },
    { projectId: p4.id, title: 'Second round home visits',  status: 'pending',   date: d(2026,4,20) },
    { projectId: p4.id, title: 'Health assessment report',  status: 'pending',   date: d(2026,5,15) },
  ]});
  await prisma.beneficiary.create({ data: {
    projectId: p4.id, count: 85, male: 40, female: 45, children: 0, elderly: 85, disabled: 12,
    ageGroup: '60+', gender: 'mixed', description: 'Elderly residents in Nizwa', impact: 'Improved quality of life',
  }});
  await prisma.alert.create({ data: {
    projectId: p4.id,
    type: 'quality', level: 'warning',
    message: 'المشروع في وضع التعليق منذ 14 يوماً. التقدم توقف عند 30% ولم يتم تحديث أي مرحلة منذ 20 مارس 2026.',
  }});

  // ── PROJECT 5 — Healthy ─────────────────────────────────────────────────────
  const p5 = await prisma.project.create({ data: {
    name: 'برنامج الصحة المجتمعية - Community Health Drive',
    description: 'حملات توعية صحية وتطعيم ومتابعة مرضى الأمراض المزمنة في أحياء محددة.',
    categoryId: SOC,
    managerId: ADMIN,
    budget: 2500,
    region: 'Muscat',
    location: 'Muscat, Oman',
    status: 'active',
    progress: 40,
    startDate: d(2026, 3, 1),
    endDate:   d(2026, 5, 31),
    objectives: JSON.stringify(['Screen 300 residents', 'Conduct 6 health camps', 'Partner with 2 clinics']),
    sdgGoals:   JSON.stringify([3]),
    tags:       JSON.stringify(['health', 'community', 'prevention']),
  }});

  await prisma.expense.createMany({ data: [
    { projectId: p5.id, amount: 350,  category: 'Medical',    status: 'approved', date: d(2026,3,5),  description: 'Screening kits', invoiceUrl: '' },
    { projectId: p5.id, amount: 280,  category: 'Printing',   status: 'approved', date: d(2026,3,18), description: 'Health awareness flyers', invoiceUrl: '' },
    { projectId: p5.id, amount: 270,  category: 'Catering',   status: 'approved', date: d(2026,4,2),  description: 'Health camp refreshments', invoiceUrl: '' },
  ]});
  await prisma.milestone.createMany({ data: [
    { projectId: p5.id, title: 'Community mapping',         status: 'completed', date: d(2026,3,8)  },
    { projectId: p5.id, title: 'First health camp',         status: 'completed', date: d(2026,3,30) },
    { projectId: p5.id, title: 'Chronic disease follow-up', status: 'pending',   date: d(2026,4,28) },
    { projectId: p5.id, title: 'Final health report',       status: 'pending',   date: d(2026,5,28) },
  ]});
  await prisma.beneficiary.create({ data: {
    projectId: p5.id, count: 175, male: 90, female: 85, children: 30, elderly: 40, disabled: 10,
    ageGroup: 'all', gender: 'mixed', description: 'Community residents — all ages', impact: 'Early disease detection',
  }});

  // ── PROJECT 6 — CRITICAL  (budget 94% gone + past deadline + low progress) ──
  const p6 = await prisma.project.create({ data: {
    name: 'برنامج دعم ذوي الإعاقة - Disability Support & Inclusion Program',
    description: 'توفير الأجهزة المساعدة والتدريب للأشخاص ذوي الإعاقة ودمجهم في سوق العمل.',
    categoryId: DIS,
    managerId: ADMIN,
    budget: 2500,
    region: 'Al Sharqiyah North',
    location: 'Sur, Al Sharqiyah North',
    status: 'active',
    progress: 28,
    startDate: d(2026, 2, 10),
    endDate:   d(2026, 4, 30), // ← PAST deadline
    objectives: JSON.stringify(['Assist 80 persons with disabilities', 'Provide 40 mobility aids', 'Place 20 in employment']),
    sdgGoals:   JSON.stringify([10, 8, 17]),
    tags:       JSON.stringify(['disability', 'inclusion', 'employment']),
  }});

  await prisma.expense.createMany({ data: [
    { projectId: p6.id, amount: 700,  category: 'Equipment',  status: 'approved', date: d(2026,2,15), description: 'Mobility aids — batch 1', invoiceUrl: '' },
    { projectId: p6.id, amount: 600,  category: 'Training',   status: 'approved', date: d(2026,3,1),  description: 'Skills trainer fees', invoiceUrl: '' },
    { projectId: p6.id, amount: 550,  category: 'Equipment',  status: 'approved', date: d(2026,3,20), description: 'Assistive devices', invoiceUrl: '' },
    { projectId: p6.id, amount: 500,  category: 'Admin',      status: 'approved', date: d(2026,4,5),  description: 'Coordination & admin', invoiceUrl: '' },
  ]});
  await prisma.milestone.createMany({ data: [
    { projectId: p6.id, title: 'Beneficiary assessment',    status: 'completed', date: d(2026,2,20) },
    { projectId: p6.id, title: 'Equipment procurement',     status: 'completed', date: d(2026,3,15) },
    { projectId: p6.id, title: 'Skills training sessions',  status: 'pending',   date: d(2026,4,15) }, // overdue
    { projectId: p6.id, title: 'Employment placement',      status: 'pending',   date: d(2026,4,28) }, // overdue
  ]});
  await prisma.beneficiary.create({ data: {
    projectId: p6.id, count: 42, male: 25, female: 17, children: 5, elderly: 8, disabled: 42,
    ageGroup: 'all', gender: 'mixed', description: 'Persons with disabilities in Sur', impact: 'Improved mobility and independence',
  }});
  // ← two critical alerts
  await prisma.alert.create({ data: {
    projectId: p6.id,
    type: 'budget', level: 'critical',
    message: 'تجاوز الإنفاق 94% من الميزانية (2,350 OMR من أصل 2,500 OMR) مع استكمال 28% فقط من المشروع. من المرجح تجاوز الميزانية بالكامل.',
  }});
  await prisma.alert.create({ data: {
    projectId: p6.id,
    type: 'timeline', level: 'critical',
    message: 'المشروع تجاوز الموعد النهائي (30 أبريل 2026) بينما لم يكتمل سوى 28% منه. التأخر الحالي: 4 أيام، والمراحل الرئيسية معلقة.',
  }});

  // ── Summary ──────────────────────────────────────────────────────────────────
  const total = await prisma.project.count({ where: { managerId: ADMIN } });
  const alerts = await prisma.alert.count();
  console.log(`\n✅ Done!\n   Projects inserted : 6`);
  console.log(`   Total projects (admin): ${total}`);
  console.log(`   Total alerts in DB   : ${alerts}`);
  console.log(`\n   Budget breakdown:`);
  console.log(`   P1 Environmental     4,000 OMR  ✅ On track`);
  console.log(`   P2 Schools Support   5,000 OMR  ⚠️  Timeline critical`);
  console.log(`   P3 Vocational Train  4,500 OMR  ⚠️  Budget warning`);
  console.log(`   P4 Elderly Care      3,500 OMR  🔴 On hold`);
  console.log(`   P5 Community Health  2,500 OMR  ✅ On track`);
  console.log(`   P6 Disability Sup.   2,500 OMR  🔴 Budget+Timeline critical`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   TOTAL               22,000 OMR`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
