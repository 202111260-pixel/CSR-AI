# CSR Platform — File Structure & Data Flow

---

## Project Root

```
CSR-FINAL-PROJECT/
├── backend/                    ← Express REST API (Port 5000)
├── frontend/                   ← React SPA (Port 5173)
├── diagrams/                   ← Architecture diagrams (PNG)
├── docker-compose.yml
├── docker-compose.dev.yml
├── package.json
```

---

## Backend Structure

```
backend/
├── .env
├── package.json
├── tsconfig.json
│
└── src/
    ├── server.ts                         ← Entry Point
    ├── app.ts                            ← Express Factory + Middleware Chain
    │
    ├── config/
    │   ├── database.ts                   ← Prisma Client (Singleton)
    │   └── email.ts                      ← Nodemailer Transport
    │
    ├── middleware/
    │   ├── auth.middleware.ts             ← JWT Cookie Verification
    │   ├── csrf.middleware.ts             ← Double-Submit Cookie CSRF
    │   ├── projectAccess.middleware.ts    ← Object-Level Authorization
    │   ├── rbac.middleware.ts             ← Role-Based Access Control
    │   ├── validate.middleware.ts         ← Zod Schema Validation
    │   ├── upload.middleware.ts           ← Multer + MIME Whitelists
    │   ├── rateLimit.ts                  ← Rate Limiters (4 tiers)
    │   └── errorHandler.ts               ← Global Error Handler
    │
    ├── routes/
    │   ├── auth.ts                       ← Register, Login, 2FA, Password Reset
    │   ├── oauth.ts                      ← Google/GitHub OAuth
    │   ├── projects.ts                   ← Projects CRUD + Sub-Resources
    │   ├── dashboard.ts                  ← KPI Aggregation
    │   ├── reports.ts                    ← General/Impact/Financial Reports
    │   ├── users.ts                      ← User Management
    │   ├── categories.ts                 ← Category CRUD + Analytics
    │   ├── partners.ts                   ← Partners + Donations + Challenges
    │   ├── ideas.ts                      ← Ideas + Voting
    │   ├── alerts.ts                     ← Alert Management
    │   ├── notifications.ts              ← Notification CRUD + Smart Scan
    │   ├── settings.ts                   ← Key-Value Settings
    │   ├── socialMedia.ts                ← Engagement Analytics
    │   ├── future.ts                     ← Predictions & Forecasts
    │   ├── aiAnalytics.ts                ← AI Analysis (GitHub Models)
    │   ├── activityLogs.ts               ← Activity Log Listing
    │   └── upload.ts                     ← File Upload Endpoints
    │
    ├── services/
    │   ├── aiAnalyticsService.ts          ← GitHub Models API Integration
    │   ├── smartNotificationService.ts    ← AI Risk Scanning
    │   ├── riskService.ts                 ← Budget/Time/Quality Risk Calculators
    │   ├── emailService.ts                ← Email Sending
    │   └── notificationService.ts         ← DB Notification Creation
    │
    ├── utils/
    │   ├── jwt.ts                         ← Sign & Verify Tokens
    │   ├── constants.ts                   ← Status & Role Arrays
    │   ├── dateHelpers.ts                 ← getLastNMonths / getNextNMonths
    │   ├── effectiveRole.ts               ← University Admin Override
    │   └── logger.ts                      ← Logger
    │
    ├── types/
    │   ├── express.d.ts                   ← Express Request Augmentation
    │   └── custom.types.ts                ← RiskLevel, UserRole
    │
    ├── prisma/
    │   ├── schema.prisma                  ← 22 Models, 7 Enums
    │   └── seed.ts                        ← Sample Data Seeder
    │
    └── uploads/                           ← Uploaded Files (documents, media, avatars)
```

---

## Frontend Structure

```
frontend/
├── .env
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
│
└── src/
    ├── App.tsx                            ← Router + Route Guards + Lazy Loading
    ├── App.css
    ├── main.tsx                           ← React DOM Entry
    │
    ├── pages/
    │   ├── auth/
    │   │   ├── Login.tsx
    │   │   ├── Register.tsx
    │   │   ├── ForgotPassword.tsx
    │   │   └── OAuthCallback.tsx
    │   │
    │   ├── admin/
    │   │   ├── UserManagement.tsx
    │   │   └── CategoryManagement.tsx
    │   │
    │   ├── reports/
    │   │   ├── GeneralReports.tsx
    │   │   ├── ImpactReports.tsx
    │   │   └── FinancialReports.tsx
    │   │
    │   ├── landing/
    │   │   ├── LandingPage.tsx            ← Main Landing Wrapper
    │   │   ├── components/               ← 22 Animation/UI Components
    │   │   │   ├── AnimatedCounter.tsx
    │   │   │   ├── AppleInvites.tsx
    │   │   │   ├── BackgroundLines.tsx
    │   │   │   ├── BlurFade.tsx
    │   │   │   ├── CardDemo.tsx
    │   │   │   ├── Carousel.tsx
    │   │   │   ├── ContainerScrollAnimation.tsx
    │   │   │   ├── DecryptedText.tsx
    │   │   │   ├── DraggableCard.tsx
    │   │   │   ├── FloatingDock.tsx
    │   │   │   ├── GlassCard.tsx
    │   │   │   ├── Navbar.tsx
    │   │   │   ├── Orb.tsx
    │   │   │   ├── RetroGrid.tsx
    │   │   │   ├── ScrollFloat.tsx
    │   │   │   ├── ScrollVelocity.tsx
    │   │   │   ├── ShinyButton.tsx
    │   │   │   ├── SparklesCore.tsx
    │   │   │   ├── TextPressure.tsx
    │   │   │   └── VariableProximity.tsx
    │   │   └── sections/                 ← 11 Landing Sections
    │   │       ├── HeroSection.tsx
    │   │       ├── FeaturesSection.tsx
    │   │       ├── BentoShowcase.tsx
    │   │       ├── ShowcaseSection.tsx
    │   │       ├── ShowcaseScroll.tsx
    │   │       ├── StatsSection.tsx
    │   │       ├── TechShowcase.tsx
    │   │       ├── VisionSection.tsx
    │   │       ├── FAQSection.tsx
    │   │       ├── CTASection.tsx
    │   │       └── FooterSection.tsx
    │   │
    │   ├── Dashboard.tsx
    │   ├── ProjectsList.tsx
    │   ├── AddProject.tsx
    │   ├── EditProject.tsx
    │   ├── ProjectDetails.tsx
    │   ├── ArchivedProjects.tsx
    │   ├── PartnersAndDonations.tsx
    │   ├── IdeasBox.tsx
    │   ├── EarlyWarning.tsx
    │   ├── FuturePortal.tsx
    │   ├── SocialMediaAnalytics.tsx
    │   ├── MapView.tsx
    │   ├── Settings.tsx
    │   └── NotFound.tsx
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx               ← Sidebar + Header + Outlet
    │   │   ├── Sidebar.tsx                ← Navigation Menu
    │   │   ├── Header.tsx                 ← Top Bar
    │   │   ├── PageHeader.tsx
    │   │   └── AuthLayout.tsx
    │   │
    │   ├── common/
    │   │   ├── Toast.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   ├── Pagination.tsx
    │   │   ├── SearchBar.tsx
    │   │   ├── ConfirmDialog.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── RiskBadge.tsx
    │   │   └── KpiCard.tsx
    │   │
    │   ├── charts/
    │   │   ├── BarChart.tsx
    │   │   ├── LineChart.tsx
    │   │   ├── AreaChart.tsx
    │   │   ├── DonutChart.tsx
    │   │   ├── RadarChart.tsx
    │   │   ├── HeatmapGrid.tsx
    │   │   └── StackedBarChart.tsx
    │   │
    │   ├── ui/
    │   │   ├── Badge.tsx
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Input.tsx
    │   │   ├── Table.tsx
    │   │   ├── Dock.tsx
    │   │   ├── GlassSurface.tsx
    │   │   ├── ShapeBlur.tsx
    │   │   ├── RotatingText.tsx
    │   │   ├── NumberFlowSafe.tsx
    │   │   └── Calendar.tsx
    │   │
    │   ├── notifications/
    │   │   └── NotificationHub.tsx        ← Smart Notification Center
    │   │
    │   ├── map/
    │   │   └── MiniMapWidget.tsx           ← Leaflet Mini Map
    │   │
    │   └── dashboard/
    │       └── OmanPulseMap.tsx
    │
    ├── services/
    │   ├── api.ts                          ← Axios Instance + CSRF + Refresh
    │   ├── authService.ts
    │   ├── projectService.ts
    │   ├── dashboardService.ts
    │   ├── reportService.ts
    │   ├── userService.ts
    │   ├── categoryService.ts
    │   ├── partnerService.ts
    │   ├── donationService.ts
    │   ├── challengeService.ts
    │   ├── ideaService.ts
    │   ├── alertService.ts
    │   ├── settingsService.ts
    │   ├── notificationService.ts
    │   ├── socialMediaService.ts
    │   ├── futureService.ts
    │   ├── aiAnalyticsService.ts
    │   ├── activityLogService.ts
    │   ├── expenseService.ts
    │   ├── beneficiaryService.ts
    │   ├── reviewService.ts
    │   └── uploadService.ts
    │
    ├── stores/
    │   ├── authStore.ts                   ← User + Cookie Marker (Zustand)
    │   ├── uiStore.ts                     ← Theme + Locale + Sidebar (Zustand)
    │   └── alertStore.ts                  ← Unread Count (Zustand)
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useProjects.ts
    │   ├── useExpenses.ts
    │   ├── useAlerts.ts
    │   ├── useDashboardData.ts
    │   ├── useDebounce.ts
    │   ├── usePermissions.ts
    │   ├── useLocalStorage.ts
    │   └── useTheme.ts
    │
    ├── types/
    │   ├── api.types.ts
    │   ├── user.types.ts
    │   ├── project.types.ts
    │   ├── expense.types.ts
    │   ├── beneficiary.types.ts
    │   ├── partner.types.ts
    │   ├── alert.types.ts
    │   ├── idea.types.ts
    │   └── category.types.ts
    │
    ├── utils/
    │   ├── formatters.ts
    │   ├── constants.ts
    │   ├── validators.ts
    │   ├── permissions.ts
    │   ├── riskCalculator.ts
    │   ├── exportUtils.ts                 ← Excel/PDF/Print Export
    │   ├── pdfReportGenerator.ts          ← Native PDF Reports
    │   └── cn.ts                          ← className Utility
    │
    ├── styles/
    │   ├── globals.css
    │   └── index.css
    │
    └── theme/
        └── colors.ts
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                  │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Zustand  │    │ TanStack │    │  Pages   │    │Components│  │
│  │  Stores   │◄──►│  Query   │◄──►│  (24)    │◄──►│  (38)    │  │
│  └────┬─────┘    └────┬─────┘    └──────────┘    └──────────┘  │
│       │               │                                         │
│       ▼               ▼                                         │
│  ┌─────────────────────────┐                                    │
│  │   Services (22 files)   │                                    │
│  └────────────┬────────────┘                                    │
│               │                                                 │
│               ▼                                                 │
│  ┌─────────────────────────┐                                    │
│  │  api.ts (Axios Client)  │                                    │
│  │  • withCredentials:true  │                                    │
│  │  • CSRF Token Injection  │                                    │
│  │  • 401 Auto-Refresh      │                                    │
│  └────────────┬────────────┘                                    │
└───────────────┼─────────────────────────────────────────────────┘
                │
                │  httpOnly Cookies (access_token + refresh_token)
                │  X-CSRF-Token Header
                │  HTTP REST (JSON)
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER (Port 5000)                     │
│                                                                   │
│  ┌─────────────── Middleware Chain ─────────────────────────┐     │
│  │                                                           │     │
│  │  helmet ──► CORS ──► cookieParser ──► rateLimit           │     │
│  │    │                                      │               │     │
│  │    ▼                                      ▼               │     │
│  │  json ──► csrfProtection ──► static('/uploads')           │     │
│  │                                      │                    │     │
│  │                                      ▼                    │     │
│  │              ┌── Route Middleware ──────────┐             │     │
│  │              │                              │             │     │
│  │              │  authenticate (JWT Cookie)   │             │     │
│  │              │       │                      │             │     │
│  │              │       ▼                      │             │     │
│  │              │  requireRole([...])           │             │     │
│  │              │       │                      │             │     │
│  │              │       ▼                      │             │     │
│  │              │  requireProjectAccess (OLA)  │             │     │
│  │              │       │                      │             │     │
│  │              │       ▼                      │             │     │
│  │              │  validate(zodSchema)          │             │     │
│  │              │       │                      │             │     │
│  │              │       ▼                      │             │     │
│  │              │  Route Handler               │             │     │
│  │              └──────────────────────────────┘             │     │
│  │                              │                            │     │
│  │                              ▼                            │     │
│  │                       errorHandler                        │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                     │
│  │  Routes  │    │ Services │    │  Utils   │                     │
│  │  (17)    │───►│   (5)    │    │   (5)    │                     │
│  └────┬─────┘    └────┬─────┘    └──────────┘                     │
│       │               │                                           │
│       ▼               ▼                                           │
│  ┌─────────────────────────┐                                      │
│  │   Prisma Client (ORM)   │                                      │
│  └────────────┬────────────┘                                      │
└───────────────┼───────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────┐        ┌──────────────────────────┐
│   PostgreSQL 17 (5432)    │        │   GitHub Models API      │
│   22 Models · 7 Enums     │        │   (AI Analytics)         │
│   Prisma Schema           │        │   14 Verified Models     │
└───────────────────────────┘        └──────────────────────────┘
```

---

## Authentication Flow

```
                    ┌──────────┐
                    │  Browser │
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │  Login   │ │ Register │ │  OAuth   │
      └────┬─────┘ └────┬─────┘ └────┬─────┘
           │             │            │
           ▼             ▼            ▼
      ┌─────────────────────────────────────┐
      │         POST /auth/login            │
      │         POST /auth/register         │
      │         GET  /auth/google/callback  │
      └──────────────┬──────────────────────┘
                     │
                     ▼
      ┌─────────────────────────────┐
      │  Set httpOnly Cookies:      │
      │  • access_token  (15 min)   │
      │  • refresh_token (7 days)   │
      │  • csrf_token    (session)  │
      └──────────────┬──────────────┘
                     │
                     ▼
      ┌─────────────────────────────┐
      │  AuthInitializer            │
      │  GET /auth/me (every load)  │
      │        │                    │
      │        ▼                    │
      │  Zustand: setUser(data)     │
      └─────────────────────────────┘
                     │
                     ▼
      ┌─────────────────────────────┐
      │  401 on any request?        │
      │        │                    │
      │        ▼                    │
      │  POST /auth/refresh         │
      │  (token rotation)           │
      │        │                    │
      │   ┌────┴────┐              │
      │   ▼         ▼              │
      │ Success   Failure          │
      │ Retry     Redirect         │
      │ queued    to /login         │
      │ requests                   │
      └─────────────────────────────┘
```

---

## Frontend Routing Map

```
/                          ──► redirect to /landing
│
├── /landing               ──► LandingPage (public)
│
├── /login                 ──► PublicOnlyRoute ──► Login
├── /register              ──► PublicOnlyRoute ──► Register
├── /forgot-password       ──► PublicOnlyRoute ──► ForgotPassword
├── /auth/callback         ──► OAuthCallback
│
└── /dashboard             ──► PrivateRoute ──► AppShell
    │                                            ├── Sidebar
    │                                            ├── Header
    │                                            └── <Outlet>
    │
    ├── /projects           ──► ProjectsList
    ├── /projects/add       ──► AddProject
    ├── /projects/archived  ──► ArchivedProjects
    ├── /projects/edit/:id  ──► EditProject
    ├── /projects/:id       ──► ProjectDetails
    │
    ├── /reports            ──► redirect to /reports/general
    ├── /reports/general    ──► GeneralReports
    ├── /reports/impact     ──► ImpactReports
    ├── /reports/financial  ──► FinancialReports
    │
    ├── /admin/users        ──► UserManagement
    ├── /admin/categories   ──► CategoryManagement
    │
    ├── /partners           ──► PartnersAndDonations
    ├── /ideas              ──► IdeasBox
    ├── /social-media       ──► SocialMediaAnalytics
    ├── /future             ──► FuturePortal
    ├── /early-warning      ──► EarlyWarning
    ├── /map                ──► MapView
    ├── /settings           ──► Settings
    │
    └── *                   ──► NotFound
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────┐
│                 State Sources                    │
│                                                  │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐  │
│  │  authStore   │  │  uiStore  │  │alertStore│  │
│  │  (Zustand)   │  │ (Zustand) │  │(Zustand) │  │
│  │              │  │           │  │          │  │
│  │  • user      │  │  • theme  │  │• unread  │  │
│  │  • accessToken│ │  • locale │  │  Count   │  │
│  │    ('cookie') │  │  • sidebar│  │          │  │
│  │              │  │           │  │          │  │
│  │  Persisted ✓ │  │Persisted ✓│  │    ✗     │  │
│  └──────┬───────┘  └─────┬─────┘  └────┬─────┘  │
│         │                │              │        │
│         ▼                ▼              ▼        │
│  ┌──────────────────────────────────────────┐    │
│  │          TanStack Query Cache            │    │
│  │                                          │    │
│  │  ['dashboard']    ['projects']            │    │
│  │  ['users']        ['categories']          │    │
│  │  ['partners']     ['ideas']               │    │
│  │  ['alerts']       ['notifications']       │    │
│  │                                          │    │
│  │  staleTime: 5min  retry: 1               │    │
│  └──────────────────────────────────────────┘    │
│                      │                           │
│                      ▼                           │
│              Page Components                     │
│              (useState for local/form state)     │
└─────────────────────────────────────────────────┘
```

---

## Database Models (22)

```
User ──────────┬──► ActivityLog
               ├──► Donation
               ├──► Idea ────────► IdeaVote
               ├──► Notification
               ├──► ProjectTeam
               ├──► Review
               └──► RefreshToken

Category ──────► Project ──┬──► Milestone
                           ├──► Expense
                           ├──► Beneficiary
                           ├──► Review
                           ├──► Media
                           ├──► Document
                           ├──► SuccessStory
                           ├──► ProjectTeam
                           ├──► Alert
                           ├──► ActivityLog
                           └──► Donation

Partner ───────► Donation

Challenge ─────┬──► Donation
               └──► ChallengeReward

Settings (standalone)
```

---

## Service ──► Route Mapping

```
Frontend Service          ──►    Backend Route
─────────────────────────────────────────────────
authService.ts            ──►    routes/auth.ts + routes/oauth.ts
projectService.ts         ──►    routes/projects.ts
dashboardService.ts       ──►    routes/dashboard.ts
reportService.ts          ──►    routes/reports.ts
userService.ts            ──►    routes/users.ts
categoryService.ts        ──►    routes/categories.ts
partnerService.ts         ──►    routes/partners.ts
donationService.ts        ──►    routes/partners.ts (donation endpoints)
challengeService.ts       ──►    routes/partners.ts (challenge endpoints)
ideaService.ts            ──►    routes/ideas.ts
alertService.ts           ──►    routes/alerts.ts
settingsService.ts        ──►    routes/settings.ts
notificationService.ts    ──►    routes/notifications.ts
socialMediaService.ts     ──►    routes/socialMedia.ts
futureService.ts          ──►    routes/future.ts
aiAnalyticsService.ts     ──►    routes/aiAnalytics.ts
activityLogService.ts     ──►    routes/activityLogs.ts
expenseService.ts         ──►    routes/projects.ts (expense endpoints)
beneficiaryService.ts     ──►    routes/projects.ts (beneficiary endpoints)
reviewService.ts          ──►    routes/projects.ts (review endpoints)
uploadService.ts          ──►    routes/upload.ts
```
