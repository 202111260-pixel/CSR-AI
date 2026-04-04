# توثيق مشروع التخرج — منصة المسؤولية الاجتماعية للشركات
## CSR Platform — Corporate Social Responsibility Management System

---

> **للجنة التحكيم:** هذا الملف يشرح كل صفحة في المنصة بالتفصيل — هدفها، محتواها، مصادر بياناتها، والملفات المرتبطة بها.

---

## نظرة عامة على المشروع

منصة ويب متكاملة لإدارة مشاريع المسؤولية الاجتماعية للشركات العُمانية. تُغطي المنصة دورة حياة المشروع الكاملة من التخطيط حتى الأرشفة، وتشمل إدارة الميزانيات، المستفيدين، الشركاء، التبرعات، الأفكار، التنبيهات المبكرة، والتحليلات المدعومة بالذكاء الاصطناعي.

### المعمارية التقنية
| الطبقة | التقنية | المنفذ |
|--------|---------|--------|
| الواجهة الأمامية | React 18 + TypeScript + Vite | المنفذ 5173 |
| الواجهة الخلفية | Node.js + Express + TypeScript | المنفذ 5000 |
| قاعدة البيانات | PostgreSQL 17 + Prisma ORM | المنفذ 5432 |
| المصادقة | JWT في HttpOnly Cookies + CSRF | — |
| الذكاء الاصطناعي | GitHub Models API (14 نموذج) | — |

### الحسابات والصلاحيات
| الدور | الصلاحيات |
|-------|-----------|
| `admin` | كامل الصلاحيات — إدارة المستخدمين، الحذف، الإعدادات |
| `manager` | إنشاء وتحرير المشاريع والفئات والشركاء |
| `employee` | إضافة مصروفات، مستفيدين، وثائق، تصويت على الأفكار |
| `viewer` | قراءة فقط — لا يمكنه إجراء أي تعديلات |

---

## الصفحات — فهرس سريع

| # | الصفحة | المسار | الوصف المختصر |
|---|--------|--------|---------------|
| 1 | الصفحة الرئيسية التسويقية | `/landing` | واجهة الترحيب والتعريف بالمنصة |
| 2 | تسجيل الدخول | `/login` | مصادقة المستخدم |
| 3 | إنشاء حساب | `/register` | تسجيل مستخدم جديد |
| 4 | استعادة كلمة المرور | `/forgot-password` | 3 خطوات لإعادة تعيين كلمة المرور |
| 5 | لوحة التحكم | `/dashboard` | نظرة شاملة على كامل المنظومة |
| 6 | قائمة المشاريع | `/projects` | عرض وتصفية جميع المشاريع |
| 7 | إضافة مشروع | `/projects/add` | معالج من 6 خطوات لإنشاء مشروع |
| 8 | تفاصيل المشروع | `/projects/:id` | صفحة متكاملة لمشروع واحد بجميع جوانبه |
| 9 | تعديل مشروع | `/projects/edit/:id` | نموذج التحرير المسبق التعبئة |
| 10 | المشاريع المؤرشفة | `/projects/archived` | المشاريع المحذوفة مع إمكانية الاستعادة |
| 11 | التقارير العامة | `/reports/general` | توزيع المشاريع والاتجاهات العامة |
| 12 | تقارير الأثر | `/reports/impact` | المستفيدون وأهداف التنمية المستدامة |
| 13 | التقارير المالية | `/reports/financial` | الميزانيات والمصروفات والتحليل المالي |
| 14 | إدارة المستخدمين | `/admin/users` | إدارة أعضاء الفريق والأدوار |
| 15 | إدارة الفئات | `/admin/categories` | تصنيفات المشاريع وتحليلاتها |
| 16 | الشركاء والتبرعات | `/partners` | الشراكات، التبرعات، والتحديات |
| 17 | صندوق الأفكار | `/ideas` | اقتراح الأفكار والتصويت عليها |
| 18 | تحليلات التواصل الاجتماعي | `/social-media` | مقاييس التفاعل الداخلي |
| 19 | بوابة المستقبل | `/future` | التنبؤات والذكاء الاصطناعي |
| 20 | الإنذار المبكر | `/early-warning` | تنبيهات المخاطر والانحرافات |
| 21 | عرض الخريطة | `/map` | خريطة تفاعلية لمشاريع عُمان |
| 22 | الإعدادات | `/settings` | الحساب الشخصي والإعدادات العامة |
| 23 | OAuth Callback | `/auth/callback` | معالجة تسجيل الدخول بـ Google/GitHub |
| 24 | صفحة 404 | `*` | الصفحة غير الموجودة |

---

---

## 1 — الصفحة الرئيسية التسويقية (Landing Page)

**المسار:** `/landing`
**الملف:** `frontend/src/pages/landing/LandingPage.tsx`

### الهدف
أول ما يراه الزائر عند فتح الموقع — صفحة تسويقية احترافية تعرّف بالمنصة وتشجع على التسجيل، مبنية من 11 قسم منفصل و22 مكون متحرك.

### الأقسام المرئية
| القسم | الوصف |
|-------|-------|
| `PrimaryHeroSection` | شاشة ترحيب بنصوص متحركة وزر "ابدأ الآن" |
| `HeroSection` | عرض الميزات الرئيسية مع صور المنصة |
| `StatsSection` | إحصاءات مباشرة: عدد المشاريع، المستفيدين، الشركاء |
| `BentoShowcase` | شبكة بطاقات تعرض ميزات المنصة بتصميم Bento |
| `ShowcaseSection` | عرض تفصيلي للوحة التحكم والتقارير |
| `ShowcaseScroll` | عرض بالتمرير مع تأثيرات Parallax |
| `TechShowcase` | قائمة التقنيات المستخدمة في المنصة |
| `VisionSection` | رؤية المنصة وأهدافها المستقبلية |
| `FAQSection` | أسئلة وأجوبة شائعة بتصميم Accordion |
| `CTASection` | دعوة للعمل مع أزرار تسجيل |
| `FooterSection` | تذييل الصفحة مع الروابط |

### مكونات حركية خاصة
- **BounceCards** — بطاقات تتطير بزاوية عند التحويم
- **Threads** — خطوط متحركة بتأثير الخيوط ثلاثية الأبعاد
- **Stepper** — مراحل مرقّمة متحركة
- **RetroGrid** — شبكة خلفية بتأثير شبكي كلاسيكي
- **SparklesCore** — جسيمات لامعة في الخلفية
- **ScrollVelocity** — نص يتحرك بسرعة عند التمرير

### الملفات المرتبطة
```
pages/landing/LandingPage.tsx           ← الملف الرئيسي
pages/landing/sections/ (11 ملف)       ← كل قسم في ملف منفصل
pages/landing/components/ (22 ملف)     ← المكونات الحركية
public/card-*.jpeg                      ← صور البطاقات
```

### ملاحظة تقنية
الصفحة لا تتصل بأي API — جميع بياناتها ثابتة (static). المسار الافتراضي `/` يُعيد توجيهاً تلقائياً إلى `/landing`.

---

## 2 — تسجيل الدخول (Login)

**المسار:** `/login`
**الملف:** `frontend/src/pages/auth/Login.tsx`

### الهدف
بوابة دخول المستخدم إلى المنصة بأمان كامل. يدعم تسجيل الدخول بالبريد وكلمة المرور، أو عبر Google/GitHub.

### المحتوى المرئي
- حقل البريد الإلكتروني + حقل كلمة المرور (مع زر إظهار/إخفاء)
- زر "تسجيل الدخول" مع حالة تحميل
- رابط "نسيت كلمة المرور؟"
- أزرار تسجيل الدخول بـ Google وGitHub
- رابط "إنشاء حساب جديد"
- رسالة خطأ عند فشل تسجيل الدخول

### تدفق البيانات
```
نقر المستخدم على "تسجيل الدخول"
    → POST /api/auth/login
    → الخادم يُرجع httpOnly Cookie (access_token + refresh_token)
    → authStore.setUser(user)
    → التوجيه إلى /dashboard
```

### ميزات الأمان
- الحساب يُقفل بعد **5 محاولات فاشلة** لمدة 15 دقيقة
- الرمز المميز يُخزَّن في **HttpOnly Cookie** (لا يمكن لـ JavaScript قراءته)
- حماية CSRF بنمط Double-Submit Cookie
- معدل طلبات محدود: 20 طلب / 15 دقيقة

### الملفات المرتبطة
```
pages/auth/Login.tsx
services/authService.ts        ← دالة login()
store/authStore.ts             ← تخزين بيانات المستخدم
utils/api.ts                   ← Axios instance مع CSRF interceptor
```

---

## 3 — إنشاء حساب (Register)

**المسار:** `/register`
**الملف:** `frontend/src/pages/auth/Register.tsx`

### الهدف
تسجيل مستخدم جديد في المنصة. يدعم التسجيل العادي أو عبر حسابات جامعية (gcet.edu.om).

### المحتوى المرئي
- الاسم الكامل + البريد الإلكتروني
- كلمة المرور + تأكيدها (مع مؤشر قوة كلمة المرور)
- اختيار القسم / الدور
- زر التسجيل مع التحقق في الوقت الحقيقي

### ميزة خاصة — الجامعة
البريد من نطاق `@gcet.edu.om` يحصل تلقائياً على دور **admin** دون الحاجة للتعيين اليدوي.

### متطلبات كلمة المرور
- 8 أحرف على الأقل
- حرف كبير + حرف صغير + رقم + رمز خاص

### الملفات المرتبطة
```
pages/auth/Register.tsx
services/authService.ts    ← دالة register()
store/authStore.ts
```

---

## 4 — استعادة كلمة المرور (Forgot Password)

**المسار:** `/forgot-password`
**الملف:** `frontend/src/pages/auth/ForgotPassword.tsx`

### الهدف
إعادة تعيين كلمة مرور المستخدم بأمان عبر 3 خطوات واضحة.

### الخطوات الثلاث

**الخطوة 1 — إدخال البريد الإلكتروني**
- المستخدم يكتب بريده الإلكتروني
- النظام يرسل رمز مكون من 6 أرقام للبريد

**الخطوة 2 — التحقق من الرمز**
- 6 حقول إدخال فردية للرمز
- مؤقت للرمز (صالح لمدة محدودة)
- زر "إعادة الإرسال" بعد انتهاء المؤقت

**الخطوة 3 — كلمة المرور الجديدة**
- حقل كلمة المرور + التأكيد
- نفس متطلبات قوة كلمة المرور

### ميزة أمنية
المقارنة بالرموز تستخدم `crypto.timingSafeEqual` لمنع هجمات التوقيت.

### الملفات المرتبطة
```
pages/auth/ForgotPassword.tsx
services/authService.ts    ← forgotPassword(), verifyResetCode(), resetPassword()
```

---

## 5 — لوحة التحكم (Dashboard)

**المسار:** `/dashboard`
**الملف:** `frontend/src/pages/Dashboard.tsx` (~1850 سطر)

### الهدف
مركز التحكم الرئيسي للمنصة — نظرة شاملة وفورية على جميع مؤشرات الأداء الرئيسية في مكان واحد.

### الأقسام المرئية

#### بطاقات KPI (6 بطاقات)
| المؤشر | المصدر |
|--------|--------|
| إجمالي المشاريع | `dashboard.kpis.totalProjects` |
| المشاريع النشطة | `dashboard.kpis.activeProjects` |
| إجمالي الميزانية | `dashboard.kpis.totalBudget` |
| إجمالي المصروف | `dashboard.kpis.totalSpent` |
| إجمالي المستفيدين | `dashboard.kpis.totalBeneficiaries` |
| نسبة الاستخدام | محسوبة: spent/budget × 100 |

#### الرسوم البيانية
- **اتجاه الميزانية** — AreaChart يعرض الميزانية مقابل المصروف على مدى الأشهر (يمكن تبديل الفترة: 7/30/90 يوم)
- **توزيع الحالات** — PieChart يعرض نسبة المشاريع في كل حالة
- **توزيع الفئات** — BarChart لعدد المشاريع لكل فئة
- **توزيع الأقاليم** — BarChart أفقي للمناطق الجغرافية
- **مؤشرات الأداء الرادارية** — RadarChart لـ 6 أبعاد (الميزانية، الجدول، الجودة، الأثر، الشركاء، الابتكار)
- **ديموغرافيا المستفيدين** — DonutChart مقسّم حسب الجنس والعمر
- **توزيع الميزانية** — BarChart مع نسبة الاستخدام

#### القوائم الحية
- آخر المشاريع المُضافة (مع حالة ونسبة تقدم)
- آخر التنبيهات النشطة (مع درجة الخطر)
- آخر الأنشطة (ActivityLog)
- أبرز الشركاء (بإجمالي مساهماتهم)

#### مؤشر صحة المحفظة
درجة من 0 إلى 100 تُحسب من معدل الإنجاز، الاستخدام الميزاني، ومعدل الرضا.

### تدفق البيانات
```
GET /api/dashboard
    → dashboardService.getDashboard()
    → useQuery({ queryKey: ['dashboard'] })
    → عرض جميع الأقسام
```

### الملفات المرتبطة
```
pages/Dashboard.tsx
services/dashboardService.ts
services/futureService.ts          ← للتنبؤات
hooks/useDashboardData.ts
components/charts/BarChart.tsx
components/charts/AreaChart.tsx
components/charts/DonutChart.tsx
components/charts/RadarChart.tsx
components/common/KpiCard.tsx
utils/exportUtils.ts               ← تصدير Excel + طباعة
theme/colors.ts
```

---

## 6 — قائمة المشاريع (Projects List)

**المسار:** `/projects`
**الملف:** `frontend/src/pages/ProjectsList.tsx` (~997 سطر)

### الهدف
عرض جميع المشاريع مع تصفية متقدمة وبحث وتبديل طريقة العرض.

### الأقسام المرئية

#### شريط البحث والتصفية
- **البحث** بالاسم في الوقت الحقيقي (debounce 300ms)
- **زر الفلتر** يفتح لوحة جانبية تحتوي:
  - الحالة (Planning, Active, On Hold, Completed)
  - الفئة (متعدد الاختيار)
  - المنطقة (متعدد الاختيار)
  - نطاق الميزانية (شريط تمرير)
  - نطاق التقدم (شريط تمرير)
  - نطاق التواريخ

#### طرق العرض
- **جدول (Table):** اسم، فئة، حالة، منطقة، ميزانية، تقدم، تاريخ الانتهاء — قابل للترتيب
- **شبكة (Grid):** بطاقات مرئية لكل مشروع مع صور وشارات الحالة
- **خريطة:** عرض المشاريع على خريطة Leaflet مع تجميع بالمنطقة

#### بطاقة المشروع تحتوي على
- اسم المشروع + الفئة + الأيقونة
- شارة الحالة بلون مخصص
- شريط تقدم بصري
- مستوى الخطر (Low/Medium/High/Critical) بكود لوني
- الميزانية + المصروف
- زر "عرض التفاصيل"

### التصفح
ترقيم الصفحات مع اختيار عدد العناصر في الصفحة (10/25/50).

### تدفق البيانات
```
GET /api/projects?page=1&limit=25&status=active&category=...
    → projectService.getProjects(filters)
    → useQuery({ queryKey: ['projects', filters] })
```

### الملفات المرتبطة
```
pages/ProjectsList.tsx
services/projectService.ts
services/categoryService.ts
components/common/SearchBar.tsx
components/common/Pagination.tsx
components/common/RiskBadge.tsx
components/common/ActionBar.tsx
utils/exportUtils.ts
utils/pdfReportGenerator.ts
types/project.types.ts
```

---

## 7 — إضافة مشروع (Add Project)

**المسار:** `/projects/add`
**الملف:** `frontend/src/pages/AddProject.tsx` (~1587 سطر)

### الهدف
معالج تدريجي من 6 خطوات لإنشاء مشروع جديد بالكامل، مع التحقق من البيانات في كل خطوة.

### الخطوات الست
| # | الخطوة | الحقول |
|---|--------|--------|
| 1 | المعلومات الأساسية | الاسم، الوصف، الفئة، المدير، الحالة، الأهداف، الوسوم |
| 2 | الميزانية والجدول | إجمالي الميزانية، تاريخ البدء والانتهاء، حدود الخطر |
| 3 | المستفيدون | الإجمالي، ذكور/إناث، أطفال، كبار السن، ذوو الإعاقة، مجموعة العمر |
| 4 | الموقع | المنطقة، المدينة، خطوط الطول والعرض (بالاختيار من الخريطة) |
| 5 | الوسائط | رفع الصور والفيديوهات بالسحب والإسقاط |
| 6 | المراجعة | ملخص كامل لجميع البيانات قبل الحفظ |

### ميزات تقنية
- حالة المشروع الافتراضية عند الإنشاء: `planning`
- رفع الملفات عبر `POST /api/upload/media`
- حفظ الإحداثيات الجغرافية اختيارياً
- المراجعة النهائية تعرض ملخصاً كاملاً قبل الإرسال

### الملفات المرتبطة
```
pages/AddProject.tsx
services/projectService.ts      ← createProject()
services/categoryService.ts     ← قائمة الفئات
services/uploadService.ts       ← رفع الوسائط
types/project.types.ts
```

---

## 8 — تفاصيل المشروع (Project Details)

**المسار:** `/projects/:id`
**الملف:** `frontend/src/pages/ProjectDetails.tsx` (~1421 سطر)

### الهدف
صفحة شاملة لمشروع واحد تعرض كل جوانبه من 8 تبويبات.

### التبويبات الثمانية
| التبويب | المحتوى |
|---------|---------|
| **نظرة عامة** | الوصف، التقدم، الأهداف، الفريق، مستوى الخطر |
| **الجدول الزمني** | المراحل (Milestones) بتصميم Timeline عمودي |
| **الميزانية** | المصروفات المعتمدة، المعلقة، المرفوضة مع BarChart |
| **الفريق** | أعضاء الفريق مع الأدوار والصور |
| **الوثائق** | الملفات المرفوعة مع إمكانية التنزيل والحذف |
| **الوسائط** | صور وفيديوهات المشروع في معرض |
| **التقييمات** | تقييمات المستخدمين مع النجوم والتعليقات |
| **قصص النجاح** | قصص الأثر الإيجابي مع صور قبل وبعد |

### حماية الوصول
يستخدم الخادم Object-Level Authorization — فقط مدير المشروع وأعضاء الفريق يمكنهم الوصول. المسؤول (admin) يمكنه الوصول لأي مشروع.

### تدفق البيانات
```
GET /api/projects/:id
    → projectService.getProject(id)
    → يُرجع المشروع مع جميع العلاقات دفعة واحدة
```

### الملفات المرتبطة
```
pages/ProjectDetails.tsx
services/projectService.ts
services/expenseService.ts
services/beneficiaryService.ts
services/reviewService.ts
middleware/projectAccess.middleware.ts   ← حماية الوصول
types/project.types.ts
types/expense.types.ts
```

---

## 9 — تعديل مشروع (Edit Project)

**المسار:** `/projects/edit/:id`
**الملف:** `frontend/src/pages/EditProject.tsx` (~1241 سطر)

### الهدف
تعديل بيانات مشروع موجود. النموذج يُملأ تلقائياً ببيانات المشروع الحالية.

### ميزة انتقال الحالة
الخادم يُطبّق قواعد انتقال محددة — لا يمكن الانتقال من `completed` مباشرةً إلى `active` مثلاً:
```
planning → active | archived
active   → on_hold | completed | archived
on_hold  → active | archived
completed → archived
```
أي انتقال غير مسموح يُرجع خطأ `400 INVALID_TRANSITION`.

### الملفات المرتبطة
```
pages/EditProject.tsx
services/projectService.ts    ← updateProject()
services/categoryService.ts
services/uploadService.ts
```

---

## 10 — المشاريع المؤرشفة (Archived Projects)

**المسار:** `/projects/archived`
**الملف:** `frontend/src/pages/ArchivedProjects.tsx` (~853 سطر)

### الهدف
عرض المشاريع المحذوفة (حذف ناعم) مع إمكانية الاستعادة.

### المحتوى المرئي
- قائمة المشاريع المؤرشفة مع تاريخ الأرشفة
- زر "استعادة" لكل مشروع
- بحث وتصفية ضمن المؤرشفة
- تصدير Excel + PDF + طباعة

### ملاحظة مهمة
الاستعادة **دائماً** ترجع المشروع إلى حالة `planning` — لا تُستعاد الحالة الأصلية. هذا قيد معروف (D4 في قائمة الديون التقنية).

### الحذف في المنصة
`DELETE /api/projects/:id` لا يحذف السجل من قاعدة البيانات — بل يغير حالته إلى `archived` (الحذف الناعم).

### الملفات المرتبطة
```
pages/ArchivedProjects.tsx
services/projectService.ts    ← getArchivedProjects(), restoreProject()
utils/exportUtils.ts
utils/pdfReportGenerator.ts
```

---

## 11 — التقارير العامة (General Reports)

**المسار:** `/reports/general`
**الملف:** `frontend/src/pages/reports/GeneralReports.tsx` (~844 سطر)

### الهدف
تقرير شامل يعرض توزيع المشاريع، الاتجاهات الزمنية، وتحليلات الأداء العام.

### الأقسام المرئية

#### 4 بطاقات KPI
إجمالي المشاريع، نسبة الإنجاز، إجمالي الميزانية، إجمالي المستفيدين.

#### الرسوم البيانية
| الرسم | النوع | الوصف |
|-------|-------|-------|
| اتجاه المشاريع الشهري | AreaChart | المشاريع والميزانية والمستفيدين شهرياً |
| توزيع الحالات | PieChart | نسب Planning/Active/Completed/On-Hold |
| الأداء الرادار | RadarChart | 6 أبعاد تقييم دائري |
| نظرة على الفئات | BarChart | ميزانية ومشاريع لكل فئة |

#### جداول البيانات
| الجدول | الوصف |
|--------|-------|
| المشاريع المعرضة للخطر | الاسم، الفئة، مستوى الخطر، الميزانية، التقدم، الأيام المتبقية |
| أفضل المشاريع أداءً | مرتبة بالتقييم والتقدم والمستفيدين |
| المشاريع المتأخرة | مع عدد أيام التأخر |
| المشاريع المتجاوزة للميزانية | مع المبلغ الزائد |
| مقارنة الفترات | التغيرات نسبةً للفترة السابقة |

### تصدير احترافي
- **Excel:** مصنف من 10 أوراق (ورقة لكل قسم)
- **PDF:** تقرير A4 من 11 قسم
- **طباعة:** جدول HTML منسّق

### تدفق البيانات
```
GET /api/reports/general?dateFrom=...&dateTo=...
    → reportService.getGeneralReport(params)
    → useQuery({ queryKey: ['reports', 'general', params] })
```

### الملفات المرتبطة
```
pages/reports/GeneralReports.tsx
services/reportService.ts
utils/exportUtils.ts              ← generateGeneralReportExcel()
utils/pdfReportGenerator.ts       ← generateGeneralReportPDF()
components/common/ActionBar.tsx
```

---

## 12 — تقارير الأثر (Impact Reports)

**المسار:** `/reports/impact`
**الملف:** `frontend/src/pages/reports/ImpactReports.tsx` (~827 سطر)

### الهدف
قياس الأثر الاجتماعي للمشاريع — المستفيدون، أهداف التنمية المستدامة، وتقييم ESG.

### الأقسام المرئية

#### 5 بطاقات KPI
إجمالي المستفيدين، المجتمعات المستهدفة، المشاريع، أهداف SDG، معدل الرضا.

#### ديموغرافيا المستفيدين
أشرطة أفقية تعرض: الإجمالي، ذكور، إناث، أطفال، كبار السن، ذوو الإعاقة.

#### أهداف التنمية المستدامة (SDGs)
جدول يعرض نسبة مساهمة المنصة في كل هدف من أهداف الأمم المتحدة السبعة عشر.

#### تبويبات الفئات (6 فئات)
لكل فئة: تعليم، صحة، بيئة، اقتصاد، بنية تحتية، تقنية — تعرض مؤشراتها الخاصة:
- مثال التعليم: عدد الطلاب، المدارس المُنشأة، المنح الدراسية، نسبة تحسن القراءة

#### بطاقة ESG
تقييم بيئي/اجتماعي/حوكمة مع درجة إجمالية (A+, A, B+...) ومخطط رادار.

#### التاريخ والتنبؤات
- الجدول الزمني من 2021 إلى 2026 مع أبرز الإنجازات
- توقعات المستفيدين حتى 2030 (مقارنة الفعلي بالمتوقع)

### تدفق البيانات
```
GET /api/reports/impact        → بيانات المستفيدين وSDGs
GET /api/social-media          → بيانات ESG
```

### الملفات المرتبطة
```
pages/reports/ImpactReports.tsx
services/reportService.ts
services/socialMediaService.ts     ← بيانات ESG
utils/exportUtils.ts               ← generateImpactReportExcel() (8 أوراق)
utils/pdfReportGenerator.ts        ← generateImpactReportPDF() (9 أقسام)
```

---

## 13 — التقارير المالية (Financial Reports)

**المسار:** `/reports/financial`
**الملف:** `frontend/src/pages/reports/FinancialReports.tsx` (~1109 سطر)

### الهدف
التحليل المالي الشامل — الميزانيات، المصروفات، التدفق النقدي، والتوقعات المالية.

### الأقسام المرئية

#### 4 بطاقات KPI
إجمالي الميزانية، إجمالي المصروف، المتبقي، نسبة الاستخدام.

#### الرسوم البيانية المالية
| الرسم | النوع | الوصف |
|-------|-------|-------|
| التدفق النقدي | ComposedChart | الوارد/الصادر/الصافي شهرياً |
| توزيع المصروفات | PieChart | نسبة كل فئة من إجمالي المصروف |
| المقارنة السنوية | BarChart | الميزانية vs المصروف لكل سنة |
| التحليل الإقليمي | BarChart | الإنفاق حسب المنطقة الجغرافية |

#### جداول البيانات
| الجدول | الوصف |
|--------|-------|
| الماليات لكل مشروع | الميزانية والمصروف والمتبقي لكل مشروع |
| تحليل الفئات | الميزانية والإنفاق لكل فئة |
| تنبيهات الميزانية | مشاريع تجاوزت 90%، 75%، إلخ |
| سجل الفواتير | الفاتورة، المورد، المبلغ، الحالة |
| أعلى 5 مشاريع إنفاقاً | مرتبة تنازلياً |
| أقل 5 مشاريع استخداماً | أدنى نسبة استخدام للميزانية |

#### التوقعات الربعية
أرقام Forecast للأرباع القادمة مع مستوى الثقة (%).

### الملفات المرتبطة
```
pages/reports/FinancialReports.tsx
services/reportService.ts
utils/exportUtils.ts               ← generateFinancialReportExcel() (13 ورقة)
utils/pdfReportGenerator.ts        ← generateFinancialReportPDF()
```

---

## 14 — إدارة المستخدمين (User Management)

**المسار:** `/admin/users`
**الملف:** `frontend/src/pages/admin/UserManagement.tsx` (~1665 سطر)
**الصلاحية:** `admin` فقط

### الهدف
إدارة أعضاء الفريق كاملة — إنشاء، تعديل، حذف المستخدمين وإسناد الأدوار.

### الأقسام المرئية

#### 4 تبويبات
| التبويب | المحتوى |
|---------|---------|
| **قائمة المستخدمين** | جدول بجميع الأعضاء مع بحث وتصفية |
| **إحصاءات الأدوار** | DonutChart لتوزيع الأدوار (admin/manager/employee/viewer) |
| **إحصاءات الأقسام** | BarChart لتوزيع المستخدمين بين الأقسام |
| **اتجاهات النشاط** | AreaChart لعدد تسجيلات الدخول شهرياً |

#### النموذج المنبثق (Modal)
عند إنشاء أو تعديل مستخدم يظهر:
- الاسم، البريد الإلكتروني، كلمة المرور
- اختيار الدور (admin/manager/employee/viewer)
- القسم، المسمى الوظيفي، رقم الموظف

#### ميزة الحذف الآمن
لا يمكن حذف مستخدم يدير مشاريع نشطة — يُرجع الخادم خطأ محدداً.

### تدفق البيانات
```
GET /api/users          → قائمة المستخدمين
GET /api/users/stats    → إحصاءات الأدوار والأقسام
POST /api/users         → إنشاء مستخدم جديد
PATCH /api/users/:id    → تحديث بيانات مستخدم
DELETE /api/users/:id   → حذف مستخدم
```

### الملفات المرتبطة
```
pages/admin/UserManagement.tsx
services/userService.ts
utils/exportUtils.ts
utils/pdfReportGenerator.ts
types/user.types.ts
```

---

## 15 — إدارة الفئات (Category Management)

**المسار:** `/admin/categories`
**الملف:** `frontend/src/pages/admin/CategoryManagement.tsx` (~1319 سطر)
**الصلاحية:** `admin` أو `manager`

### الهدف
إدارة تصنيفات المشاريع — الإنشاء، التحرير، والاطلاع على التحليلات الخاصة بكل فئة.

### الأقسام المرئية

#### 3 تبويبات
| التبويب | المحتوى |
|---------|---------|
| **نظرة عامة** | بطاقات الفئات مع عدد المشاريع والميزانية والمناطق |
| **التحليلات** | مقارنة بين الفئات ببيانات حية |
| **الإدارة** | إضافة/تعديل/حذف الفئات |

#### بطاقة الفئة تحتوي على
- الأيقونة واللون المخصص
- عدد المشاريع وإجمالي الميزانية
- عدد الشركاء المشاركين
- المناطق الجغرافية المرتبطة بها
- أهداف SDG المرتبطة

#### ميزة الحذف الآمن
لا يمكن حذف فئة تحتوي على مشاريع مرتبطة بها.

### تدفق البيانات
```
GET /api/categories          → قائمة الفئات
GET /api/categories/stats    → إحصاءات إجمالية
GET /api/categories/:id/analytics → تحليلات فئة محددة
```

### الملفات المرتبطة
```
pages/admin/CategoryManagement.tsx
services/categoryService.ts
utils/exportUtils.ts
utils/pdfReportGenerator.ts
types/category.types.ts
```

---

## 16 — الشركاء والتبرعات (Partners & Donations)

**المسار:** `/partners`
**الملف:** `frontend/src/pages/PartnersAndDonations.tsx` (~1454 سطر)

### الهدف
إدارة شراكات المؤسسة، التبرعات، والتحديات التبرعية — نظام متكامل للتمويل التشاركي.

### الأقسام الثلاث (تبديل بالتبويبات)

#### تبويب الشركاء
- بطاقات الشركاء مع الشعار، مجال الدعم، إجمالي المساهمات
- نافذة إنشاء/تعديل شريك
- لوحة المتصدرين (Leaderboard) بأكثر الشركاء تبرعاً
- بيانات الاتصال والفترة الزمنية للشراكة

#### تبويب التبرعات
- تسجيل تبرع جديد (مبلغ، نوع، مشروع/تحدي مرتبط)
- قائمة تبرعات المستخدم الحالي
- إعدادات التبرع التلقائي:
  - **تقريب الراتب:** تبرع الفرق من الراتب المقرّب
  - **التبرع الشهري:** مبلغ ثابت شهرياً
  - **مضاعفة الشركة:** الشركة تضاهي تبرع الموظف

#### تبويب التحديات
- التحدي النشط حالياً مع شريط تقدم الهدف
- قائمة التحديات السابقة مع النتائج
- اتجاه التبرعات خلال التحدي (LineChart)
- نظام الجوائز (ChallengeRewards) مع الألوان والأيقونات

### تدفق البيانات
```
GET /api/partners                        → قائمة الشركاء
GET /api/partners/donations/leaderboard  → المتصدرون
GET /api/partners/challenges/current     → التحدي الحالي
POST /api/partners/donations             → تسجيل تبرع
```

### الملفات المرتبطة
```
pages/PartnersAndDonations.tsx
services/partnerService.ts
services/donationService.ts
services/challengeService.ts
utils/exportUtils.ts
types/partner.types.ts
```

---

## 17 — صندوق الأفكار (Ideas Box)

**المسار:** `/ideas`
**الملف:** `frontend/src/pages/IdeasBox.tsx` (~1404 سطر)

### الهدف
منصة داخلية لطرح الأفكار الإبداعية والتصويت عليها — يشارك فيها جميع الموظفين.

### الأقسام المرئية

#### 3 أوضاع عرض
| الوضع | الوصف |
|-------|-------|
| **الأفكار** | شبكة بطاقات لجميع الأفكار |
| **لوحة المتصدرين** | أكثر الموظفين اقتراحاً وتصويتاً |
| **إحصاءات** | توزيع الأفكار بالحالة والفئة والشهر |

#### بطاقة الفكرة
- العنوان والوصف
- تصنيف AI تلقائي (nlpCategory)
- عدد الأصوات + زر التصويت (toggle)
- شارة الحالة: pending / under_review / approved / rejected
- اسم مُقدِّم الفكرة وتاريخ التقديم

#### نظام الحالة
```
pending → under_review → approved
                      → rejected
```
فقط `admin` و`manager` يمكنهم تغيير الحالة — الموظفون يُقدّمون الأفكار فقط.

### تدفق البيانات
```
GET /api/ideas              → قائمة الأفكار مع عدد الأصوات
POST /api/ideas/:id/vote    → تبديل التصويت (vote toggle)
PATCH /api/ideas/:id        → تغيير الحالة (admin/manager فقط)
```

### الملفات المرتبطة
```
pages/IdeasBox.tsx
services/ideaService.ts
utils/exportUtils.ts
utils/pdfReportGenerator.ts
types/idea.types.ts
```

---

## 18 — تحليلات التواصل الاجتماعي (Social Media Analytics)

**المسار:** `/social-media`
**الملف:** `frontend/src/pages/SocialMediaAnalytics.tsx` (~926 سطر)

### الهدف
قياس تفاعل الموظفين داخلياً مع مشاريع وأنشطة المؤسسة — بالاعتماد على سجل الأنشطة (ActivityLog) وليس شبكات التواصل الاجتماعي الخارجية.

### الأقسام المرئية

#### 6 بطاقات KPI مع CountUp Animation
- إجمالي الانتشار (Total Reach)
- إجمالي التفاعل (Total Engagement)
- معدل التفاعل المتوسط (%)
- درجة المشاعر (Sentiment Score)
- معدل النمو (%)
- أكثر القنوات تفاعلاً

#### الرسوم البيانية
| الرسم | النوع | الوصف |
|-------|-------|-------|
| اتجاه التفاعل | AreaChart | التفاعل الشهري خلال 6 أشهر |
| توزيع المشاعر | PieChart | إيجابي / محايد / سلبي |
| أنواع الأنشطة | BarChart | تقييمات، أفكار، تبرعات، مراجعات |
| اتجاه المشاعر | LineChart | تغيرات المشاعر عبر الزمن |
| الحملات | جدول | قناة، انتشار، تفاعل، مشاعر |

#### بطاقة ESG
تقييم بيئي/اجتماعي/حوكمة محسوب من بيانات المشاريع الحقيقية.

### مصدر البيانات
البيانات مُستخرجة من جداول داخلية: ActivityLog, Reviews, Ideas, Donations — ليست بيانات خارجية.

### تدفق البيانات
```
GET /api/social-media
    → socialMediaService.getAnalytics()
    → إرجاع مقاييس التفاعل وبيانات ESG
```

### الملفات المرتبطة
```
pages/SocialMediaAnalytics.tsx
services/socialMediaService.ts
backend/src/routes/socialMedia.ts
```

---

## 19 — بوابة المستقبل (Future Portal)

**المسار:** `/future`
**الملف:** `frontend/src/pages/FuturePortal.tsx` (~998 سطر)

### الهدف
مركز التحليل الذكي والتنبؤ — يجمع بين التنبؤات الرياضية البسيطة وتحليلات الذكاء الاصطناعي الحقيقي عبر GitHub Models.

### تبويبان رئيسيان

#### تبويب "التنبؤات"
| القسم | الوصف |
|-------|-------|
| مؤشر الصحة الإجمالي | دائرة مئوية من 0-100 بأربعة أبعاد |
| توقعات الميزانية | LineChart للأشهر القادمة |
| توقعات الأثر | AreaChart لنمو المستفيدين |
| رؤى الفئات | BarChart لتوزيع توقعات الأداء |
| بطاقات التنبؤ | 6+ توصيات محددة مع درجة الثقة والأولوية |

#### تبويب "الذكاء الاصطناعي"
- **5 نطاقات تحليل:** نظرة عامة، مشاريع، مالي، أثر، شركاء
- **توصيات مُصنّفة:** عالي/متوسط/منخفض الأولوية
- **حقل السؤال الحر:** المستخدم يكتب سؤالاً بأي لغة
- **اقتراحات جاهزة:** أزرار بأسئلة مشتركة شائعة
- **اختيار النموذج:** 14 نموذج AI متاح (GPT-4o, Llama 3.1, Phi-4, إلخ)

### كيف يعمل الذكاء الاصطناعي
```
المستخدم يكتب سؤالاً
    → POST /api/ai-analytics/analyze
    → fetchContextData() ← يجلب بيانات حقيقية من PostgreSQL
    → buildSystemPrompt() ← يبني السياق للنموذج
    → GitHub Models API (github.com/models)
    → parseAiResponse() → عرض النتيجة
    → في حالة الفشل: generateLocalAnalysis() (احتياطي محلي)
```

### تدفق البيانات
```
GET /api/future               → التنبؤات الرياضية
POST /api/ai-analytics/analyze → تحليل AI
GET /api/ai-analytics/models   → قائمة النماذج
```

### الملفات المرتبطة
```
pages/FuturePortal.tsx
services/futureService.ts
services/aiAnalyticsService.ts (backend)
backend/src/routes/aiAnalytics.ts
backend/src/services/aiAnalyticsService.ts
```

---

## 20 — الإنذار المبكر (Early Warning)

**المسار:** `/early-warning`
**الملف:** `frontend/src/pages/EarlyWarning.tsx` (~1362 سطر)

### الهدف
مراقبة مستمرة للمشاريع والكشف عن الانحرافات قبل تفاقمها — ميزانية، جدول زمني، وجودة.

### الأقسام المرئية

#### 4 بطاقات KPI
إجمالي التنبيهات، النشطة منها، الحرجة، المحلولة.

#### التصفية المتقدمة
- نوع التنبيه: ميزانية / جدول زمني / جودة
- مستوى الخطر: حرج / عالٍ / متوسط / منخفض
- الحالة: نشط / محلول
- فترة زمنية

#### جدول التنبيهات
| العمود | الوصف |
|--------|-------|
| المشروع | اسم المشروع المرتبط |
| نوع التنبيه | Budget / Timeline / Quality مع أيقونة |
| المستوى | شارة ملونة (Critical=أحمر، High=برتقالي، Medium=أصفر) |
| الرسالة | وصف المشكلة |
| التاريخ | وقت إنشاء التنبيه |
| الحالة | نشط / محلول مع زر الحل |

#### الاختبار الاستباقي — "المدقق الليلي"
زر "تشغيل الفحص" يُرسل طلباً لـ `POST /api/notifications/scan` لتحليل جميع المشاريع النشطة والتخطيطية بالذكاء الاصطناعي وإنشاء تنبيهات جديدة.

### كيف تُنشأ التنبيهات
```
smartNotificationService.ts (backend)
    → يفحص كل مشروع نشط
    → رصد تجاوز الميزانية (> 90%)
    → رصد التأخير الزمني
    → رصد جودة التقييمات
    → يتحقق من عدم تكرار التنبيه
    → يستدعي AI لإنشاء رسالة وصفية
    → يُنشئ Alert + Notification في قاعدة البيانات
```

### الملفات المرتبطة
```
pages/EarlyWarning.tsx
services/alertService.ts
utils/exportUtils.ts
utils/pdfReportGenerator.ts
backend/src/services/smartNotificationService.ts
backend/src/routes/alerts.ts
types/alert.types.ts
```

---

## 21 — عرض الخريطة (Map View)

**المسار:** `/map`
**الملف:** `frontend/src/pages/MapView.tsx` (~525 سطر)

### الهدف
رؤية جغرافية لجميع مشاريع المؤسسة على خريطة تفاعلية لعُمان الحبوبة.

### المحتوى المرئي

#### الخريطة (Leaflet)
- مُركّزة على سلطنة عُمان (Oman bounds)
- علامات (Markers) مخصصة بأيقونات SVG ملونة حسب الحالة
- المشاريع الحرجة والعالية الخطر لها تأثير نبض (pulse animation)
- حدود التكبير: لا تسمح بالخروج خارج نطاق الخريطة

#### بطاقة المشروع (عند التحويم)
- الاسم + الفئة
- شارة الحالة
- شريط التقدم
- الميزانية / المصروف
- عدد المستفيدين
- مستوى الخطر

#### الفلاتر
- الفئة (dropdown)
- الحالة (dropdown)
- البحث بالاسم

### الإحداثيات الجغرافية
المشاريع التي لا تملك إحداثيات محددة تُعرض في موقع المحافظة الافتراضي (11 محافظة عُمانية محددة مسبقاً).

### تدفق البيانات
```
GET /api/projects/map
    → يُرجع جميع المشاريع غير المؤرشفة مع:
       lat, lng, status, category, budget, spent,
       beneficiaryCount, risk, description
```

### الملفات المرتبطة
```
pages/MapView.tsx
services/projectService.ts     ← getProjectsMap()
components/map/MiniMapWidget.tsx
```

---

## 22 — الإعدادات (Settings)

**المسار:** `/settings`
**الملف:** `frontend/src/pages/Settings.tsx` (~2067 سطر) — أكبر ملف في المشروع

### الهدف
مركز إدارة الحساب الشخصي والإعدادات العامة للمنصة.

### التبويبات الثمانية

#### 1. الحساب (Account)
- تعديل الملف الشخصي: الاسم، البريد، الهاتف، المسمى الوظيفي، الصورة
- تغيير كلمة المرور (يتطلب كلمة المرور الحالية)
- إعداد المصادقة الثنائية (2FA) بـ QR Code
- تفضيلات الإشعارات (بريد إلكتروني / SMS / إشعارات داخلية)
- تصدير بيانات الحساب (GDPR Export)
- حذف الحساب بشكل دائم (يتطلب تأكيد كلمة المرور)

#### 2. الشركة (Company)
- اسم المنظمة، الشعار، الرسالة
- سنة التأسيس، القطاع، الموقع الإلكتروني
- بيانات الاتصال الرسمية

#### 3. النظام (System)
- تنسيق التاريخ والوقت
- اللغة والمنطقة الزمنية
- السمة (فاتح / داكن / تلقائي)
- خيارات المظهر العامة

#### 4. الأمان (Security)
- الجلسات النشطة مع إمكانية إنهائها
- سجل تسجيلات الدخول
- قائمة IPs المسموحة

#### 5. النسخ الاحتياطي (Backup)
- نسخ احتياطية يدوية + جدولة تلقائية
- استعادة من نسخة سابقة

#### 6. سجل المراجعة (Audit Log)
- قائمة كاملة بجميع الأنشطة في المنصة
- فلترة بنوع العمل، المستخدم، التاريخ
- تصدير CSV/JSON

#### 7. التكاملات (Integrations)
- إدارة مفاتيح API
- Webhooks
- الخدمات الخارجية المتصلة

#### 8. الفواتير (Billing)
- تفاصيل الخطة الحالية
- سجل المدفوعات + تنزيل الفواتير
- إحصاءات الاستخدام

### تدفق البيانات
```
GET /api/auth/me           → بيانات الملف الشخصي
PATCH /api/auth/me         → تحديث البروفايل
POST /api/auth/2fa/setup   → إعداد المصادقة الثنائية
GET /api/settings          → إعدادات النظام
PUT /api/settings          → تحديث إعدادات النظام
GET /api/activity-logs     → سجل الأنشطة
```

### الملفات المرتبطة
```
pages/Settings.tsx
services/authService.ts
services/settingsService.ts
services/activityLogService.ts
store/authStore.ts
store/uiStore.ts          ← حفظ السمة واللغة
theme/colors.ts
```

---

---

## الملفات المشتركة الأساسية

### 1. مدير الحالة (State Management)
| الملف | الغرض | البيانات المحفوظة |
|-------|--------|-----------------|
| `store/authStore.ts` | حالة المصادقة | `user`, `accessToken: 'cookie'` |
| `store/uiStore.ts` | واجهة المستخدم | `theme`, `locale`, `sidebarOpen` |
| `store/alertStore.ts` | عدد التنبيهات | `unreadCount` |

### 2. طبقة الخدمات (Services Layer)
كل ملف خدمة يقابل كياناً في الخادم:
```
services/
├── api.ts                  ← Axios instance + CSRF + auto-refresh
├── authService.ts          ← كل عمليات المصادقة
├── projectService.ts       ← CRUD المشاريع + sub-resources
├── dashboardService.ts     ← بيانات لوحة التحكم
├── reportService.ts        ← التقارير الثلاثة
├── userService.ts          ← إدارة المستخدمين
├── categoryService.ts      ← الفئات
├── partnerService.ts       ← الشركاء
├── donationService.ts      ← التبرعات
├── challengeService.ts     ← التحديات
├── ideaService.ts          ← الأفكار
├── alertService.ts         ← التنبيهات
├── settingsService.ts      ← الإعدادات
├── socialMediaService.ts   ← التحليلات + ESG
├── futureService.ts        ← التنبؤات
└── notificationService.ts  ← الإشعارات
```

### 3. مكونات UI المشتركة
```
components/common/
├── ActionBar.tsx           ← أزرار Excel + PDF + طباعة + تحديث
├── KpiCard.tsx             ← بطاقة المؤشر الرئيسي
├── Toast.tsx               ← إشعارات نجاح/خطأ
├── Pagination.tsx          ← ترقيم الصفحات
├── SearchBar.tsx           ← حقل البحث
├── ConfirmDialog.tsx       ← نافذة تأكيد الحذف
├── EmptyState.tsx          ← حالة لا يوجد بيانات
└── RiskBadge.tsx           ← شارة مستوى الخطر

components/charts/
├── AreaChart.tsx           ← مخطط المساحة
├── BarChart.tsx            ← المخطط الشريطي
├── LineChart.tsx           ← المخطط الخطي
├── DonutChart.tsx          ← مخطط الدونات
├── RadarChart.tsx          ← المخطط الراداري
├── HeatmapGrid.tsx         ← خريطة الحرارة
└── StackedBarChart.tsx     ← المخطط الشريطي المكدّس

components/layout/
├── AppShell.tsx            ← الهيكل الرئيسي (Sidebar + Header + Outlet)
├── Sidebar.tsx             ← الشريط الجانبي بجميع الروابط
└── Header.tsx              ← الشريط العلوي مع الإشعارات
```

### 4. أدوات التصدير
```
utils/
├── pdfReportGenerator.ts   ← مولّد PDF احترافي (jsPDF)
│   ├── generateGeneralReportPDF()    ← 11 قسم، A4 أفقي
│   ├── generateFinancialReportPDF()  ← مالي كامل
│   ├── generateImpactReportPDF()     ← 9 أقسام
│   └── generateEarlyWarningPDF()     ← تقرير التنبيهات
│
└── exportUtils.ts          ← مولّد Excel متعدد الأوراق (xlsx)
    ├── generateGeneralReportExcel()    ← 10 أوراق
    ├── generateFinancialReportExcel()  ← 13 ورقة
    ├── generateImpactReportExcel()     ← 8 أوراق
    └── exportToExcel()                ← ورقة واحدة (لبقية الصفحات)
```

### 5. نظام الألوان والسمات
```
theme/colors.ts
├── lightTheme   ← سمة فاتحة بألوان دافئة (Forest Green)
├── darkTheme    ← سمة داكنة BentoShowcase palette
├── statusColors ← ألوان حالات المشاريع
├── riskColors   ← ألوان مستويات الخطر
├── categoryColors ← ألوان الفئات
└── chartColors  ← لوحة ألوان المخططات
```

---

## نقاط القوة التقنية للمشروع

| الميزة | التفاصيل |
|--------|---------|
| **الأمان** | HttpOnly Cookies، CSRF، OLA، تقييد المعدل، تشفير bcrypt، حظر الحساب |
| **الذكاء الاصطناعي** | 14 نموذج AI عبر GitHub Models مع نظام انتقال تلقائي ونتائج احتياطية |
| **التصدير** | PDF متعدد الأقسام + Excel متعدد الأوراق لكل تقرير |
| **الأداء** | TanStack Query بـ staleTime 5 دقائق، Code Splitting بـ React.lazy |
| **التصميم** | دعم كامل للوضع الداكن/الفاتح، رسوم متحركة Framer Motion |
| **قاعدة البيانات** | 22 نموذج Prisma، حذف ناعم، OLA middleware |
| **التنبيهات الذكية** | فحص استباقي بالذكاء الاصطناعي لمخاطر الميزانية والجدول الزمني |
| **الجغرافيا** | خريطة Leaflet تفاعلية بعلامات مخصصة لـ 11 محافظة عُمانية |

---

*منصة المسؤولية الاجتماعية للشركات — مشروع التخرج*
*الجامعة: Greet University of Technology | التخصص: هندسة نظم المعلومات*
*تاريخ الإعداد: أبريل 2026*
