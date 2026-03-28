# Dashboard Components Map

## KPI Cards (6 cards — Row 1)
1. **Total Projects** — عدد كل المشاريع + trend% + sparkline
2. **Active** — المشاريع النشطة حالياً
3. **Total Budget** — إجمالي الميزانية بـ OMR (AnimatedCounter)
4. **Total Spent** — إجمالي المصروف
5. **Beneficiaries** — عدد المستفيدين الكلي
6. **Utilization** — نسبة استهلاك الميزانية (يتلون أحمر/أصفر/أخضر)

## Charts & Visualizations (Main Area)
- **Portfolio Pulse** (Row 2) — شريط ملون يوضح توزيع حالات المشاريع (active/completed/planning/on_hold)
- **Trend Delta Cards** (Row 2) — 4 بطاقات مقارنة الشهر الحالي vs السابق (Budget, Spending, Projects, Beneficiaries)
- **Health Gauges** (Row 3) — OrbitGauge نصف دائري لصحة المحفظة + BurnRateGauge سرعة الصرف
- **Efficiency Ratios** (Row 3) — RadialBarChart حلقات متعددة (Completion/Active/Utilization/OnHold/Impact)
- **Beneficiary Demographics** (Row 3) — AreaChart مكدس (Male/Female/Children) حسب الفئة
- **Budget & Expenditure Flow** (Row 4) — ComposedChart خط+مساحة يقارن Budget vs Spent لـ12 شهر
- **Monthly Spending Line** (Row 4) — LineChart بسيط للمصروف الشهري مع peak label
- **Project Timeline / Gantt** (Row 5) — GanttStrip شريط زمني أفقي لكل مشروع مع progress%
- **Sankey Diagram** (Row 6) — تدفق الموارد: Partners → Categories → Beneficiaries (SVG مخصص)
- **Performance Radar** (Row 7) — RadarChart سداسي (Budget/Timeline/Quality/Impact/Partners/Innovation)
- **Budget Allocation** (Row 7) — PieChart دائري مجوف لتوزيع الميزانية حسب الفئة
- **By Category** (Row 7) — BarChart أفقي لعدد المشاريع لكل فئة
- **Recent Projects Table** (Row 8) — جدول تفاعلي (اسم/فئة/حالة/ميزانية/تقدم/منطقة)
- **Project Health Matrix** (Row 14) — جدول بدرجة الصحة ومستوى الخطر لكل مشروع

## Right Sidebar
- **Budget Efficiency Ring** — حلقة SVG لنسبة الاستهلاك مع أرقام (Total/Spent/Remaining)
- **Radial Shape** — قوس نصفي لاستخدام الميزانية
- **3× Radial Text** — حلقات صغيرة (Projects / Active / People) مع trend
- **Impact Goal** — عداد المستفيدين مع أزرار +/- وأعمدة بار
- **By Region** — LineChart مصغر لتوزيع المشاريع على المناطق
- **SDG Alignment** — AreaChart مصغر لأهداف التنمية المستدامة
- **AI Chat (BentoChatCell)** — محادثة ذكية مع MetaBalls animation + charts داخل الردود

## Bento Platform Snapshot (dark section)
- 4 أعمدة: Total Budget + sparkline | Active Projects + bars + AI Chat | Calendar شهري | Impact Goal + Beneficiary Reach
