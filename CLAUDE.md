# MASTER GENOME INDEX — CSR Platform

**Generated:** 2026-03-03 | **Updated:** 2026-04-16 | **Codebase:** ~65,000 LOC | **Models:** 23 | **Endpoints:** 125+ | **Pages:** 25

---

## 1. SYSTEM IDENTITY

Omani Corporate Social Responsibility management platform. Tracks CSR project lifecycle (planning > active > on_hold > completed > archived), budgets, beneficiaries, impact reports, partner donations, employee ideas, and early-warning alerts across Oman's 11 governorates.

**Architecture:** React SPA (port 5173) <-> REST API (Express 5, port 5000) <-> PostgreSQL 17 (port 5432, Prisma ORM).

---

## 2. THE BLUEPRINT -- Dependency Graph & Circular Risk Map

### 2.1 Inter-Layer Data Flow

```
Browser httpOnly cookies (access_token + refresh_token) -> Express cookie-parser
    | Axios withCredentials:true sends cookies automatically
    | CSRF double-submit cookie (csrf_token cookie + X-CSRF-Token header)
    | HTTP REST (JSON, 10MB limit)
Express middleware chain: helmet -> CORS -> apiRateLimit -> json -> cookieParser -> csrfProtection -> routes -> errorHandler
    | authenticate(cookie-first) -> requireRole -> requireProjectAccess(OLA) -> validate -> handler
    | Prisma Client (singleton via globalThis)
PostgreSQL 17 (DATABASE_URL from .env)

AI Analytics flow:
  POST /ai-analytics/analyze -> fetchContextData(scope) from PostgreSQL
    -> buildSystemPrompt(contextData) -> callGitHubModels(prompt, question, model?)
    -> ZenMux AI Gateway (https://zenmux.ai/api/v1/chat/completions)
    -> parseAiResponse(raw) or generateLocalAnalysis(fallback)

Prescriptive Analytics flow:
  POST /ai-analytics/simulate-solution -> fetchAlertContext(alertId, projectId)
    -> buildAlertSystemPrompt(context) -> callGitHubModels (scenario generation)
    -> Returns 4-5 solution scenarios with before/after impact metrics
    -> POST /ai-analytics/scenario-actions -> approval workflow (admin/manager)

Midnight Auditor flow:
  cron 00:00 Asia/Muscat -> scanProjectRisks() -> generateAIInsights()
    -> buildMorningBriefHtml() -> emailService.sendMorningBrief(admins/managers)
```

### 2.2 Circular Dependency Analysis

**No circular dependencies detected.** The architecture follows strict unidirectional flow:
- Frontend: `pages -> services -> api.ts -> backend`
- Backend: `routes -> prisma (via config/database.ts)`, `routes -> services`
- Stores are consumed by pages/components but never import from them

### 2.3 Shared Code Boundary Violations

| Issue | Details |
|-------|---------|
| ~~Zod version mismatch~~ | **RESOLVED (Phase 2)** — Both aligned on `zod@^3.x` |
| No shared types | Frontend defines its own types in `src/types/`, backend uses Prisma-generated types. No shared contract. |
| ~~`getLastNMonths` x7~~ | **RESOLVED (Phase 2)** — Extracted to `backend/src/utils/dateHelpers.ts` |

---

## 3. MODULE ANATOMY -- Complete File Catalog

### 3.1 Backend Files (44 files, ~10,600 LOC)

| File | Lines | Purpose | Input | Output | Side Effects | Complexity |
|------|-------|---------|-------|--------|-------------|-----------|
| `server.ts` | 42 | Entry point, env validation, starts Express on PORT, starts Midnight Auditor | env: PORT, JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL | HTTP server | console.log, cron registration | 2/10 |
| `app.ts` | 101 | Express factory, middleware chain, route mounting, health check | none | Express app | Mounts 18 routers, cookieParser, csrfProtection, helmet CSP | 4/10 |
| **Middleware** | | | | | | |
| `auth.middleware.ts` | 56 | JWT verification, DB user lookup, effective role override, attaches `req.user` | httpOnly cookie (fallback: Bearer header) | 401 or next() | DB lookup on every request | 4/10 |
| `csrf.middleware.ts` | 63 | Double-submit cookie CSRF protection with auth endpoint exemptions | `csrf_token` cookie + `X-CSRF-Token` header | 403 or next() | Sets csrf_token cookie on every response, 10 exempt paths | 3/10 |
| `projectAccess.middleware.ts` | 28 | Object-Level Authorization for project resources | `req.user` + `req.params.id` | 403 or next() | none | 3/10 |
| `rbac.middleware.ts` | 10 | Role-based access check | `req.user.role` | 403 or next() | none | 1/10 |
| `validate.middleware.ts` | 12 | Zod schema validation of `req.body` | req.body + ZodSchema | 400 or sanitized body | Replaces req.body with parsed data | 2/10 |
| `errorHandler.ts` | 29 | Global error handler maps Prisma/JWT/Zod errors | Error object | JSON error response | Sanitizes messages in prod | 3/10 |
| `rateLimit.ts` | 25 | Rate limiting: apiRateLimit (10K/15min), authRateLimit (20/15min), resetCodeRateLimit (5/10min), uploadRateLimit (50/15min) | request | 429 if exceeded | none | 2/10 |
| `upload.middleware.ts` | 74 | Multer with MIME/extension whitelists per category (documents/media/avatars), blocked patterns (exe, sh, bat, etc.) | multipart form | file buffer | none | 4/10 |
| **Routes** | | | | | | |
| `auth.ts` | 815 | Register, login, refresh, logout, me, forgot/reset password, 2FA (TOTP), cookie helpers, account lockout, university email auto-admin, data export, account self-deletion | Zod-validated bodies | httpOnly cookies, user data | ActivityLog, emailService, bcrypt hash, DB refresh tokens | 9/10 |
| `projects.ts` | 950 | Full CRUD for projects + sub-resources (milestones, expenses, team, beneficiaries, documents, media, success stories, reviews) + status transition validation + enriched map endpoint | Zod schemas per sub-resource | Project data with relations | ActivityLog on writes | 9/10 |
| `dashboard.ts` | 318 | KPI aggregation: counts, sums, trends, top partners, risk distribution, SDG, beneficiary demographics, budget allocation, Sankey flow | query params | Aggregated dashboard JSON | none (read-only) | 7/10 |
| `reports.ts` | 711 | General/Impact/Financial reports with date filtering + CSV/JSON export + efficiency metrics + budget forecasts | dateFrom, dateTo query | Report data or CSV download | none | 7/10 |
| `users.ts` | 467 | User CRUD + stats (role/department distribution, activity trends) | Zod schemas | User data | ActivityLog, password hashing | 6/10 |
| `categories.ts` | 528 | Category CRUD + stats + per-category analytics + flat trend detection | Zod schemas | Category data with project counts | ActivityLog | 6/10 |
| `ideas.ts` | 460 | Idea CRUD + toggle vote + stats + leaderboard | Zod schemas | Idea data with vote counts | ActivityLog, vote toggle | 7/10 |
| `partners.ts` | 830 | Partner CRUD + donation creation + stats + leaderboard + challenge system (full CRUD) + donation preferences | Zod schemas | Partner data enriched with live donation totals | ActivityLog | 8/10 |
| `alerts.ts` | 128 | Alert listing + stats + resolve + delete + distributed trend generation | query filters | Alert data | ActivityLog on resolve | 4/10 |
| `settings.ts` | 216 | Key-value settings store (GET/PUT single/bulk/DELETE) | key-value pairs | Settings data | none | 4/10 |
| `socialMedia.ts` | 926 | Internal engagement analytics + ESG metrics (Environmental, Social, Governance) + SDG coverage + sentiment analysis | none | Aggregated engagement + ESG metrics | none (read-only) | 7/10 |
| `future.ts` | 401 | Math-based predictions: success probability, budget forecast, impact projections, dynamic recommendations | none | Forecasts, projections, recommendations | none (read-only) | 7/10 |
| `aiAnalytics.ts` | ~700 | AI analysis: POST /analyze (GitHub Models), GET /models, GET /context, POST /analyze-alerts, POST /simulate-solution, scenario action CRUD + approval workflow, manual audit trigger | Zod-validated body, JWT | AI-generated analysis JSON + scenario actions | ActivityLog, DB writes, email notifications | 8/10 |
| `notifications.ts` | 104 | Notification CRUD: list (with unreadCount), mark read, mark all read, delete + smart risk scan trigger | userId from JWT | Notification data | DB updates, smart scanning | 4/10 |
| `activityLogs.ts` | 77 | Read-only activity log listing + stats | query filters | ActivityLog data | none | 3/10 |
| `upload.ts` | 115 | Category-based file upload (documents/media/avatars), single + multi-file (up to 10), path traversal protection | multipart file | `{ url }` | Writes file to disk | 4/10 |
| `oauth.ts` | 220 | Google/GitHub OAuth callback handling + university admin auto-role + domain whitelist | OAuth code exchange | httpOnly cookies (no tokens in URL) | User upsert, DB refresh tokens | 6/10 |
| `contact.ts` | 35 | Public contact form submission (no auth required) | Zod-validated body | success message | Email send | 2/10 |
| **Config** | | | | | | |
| `database.ts` | 10 | Prisma singleton | env: DATABASE_URL | PrismaClient | Global assignment | 1/10 |
| **Jobs** | | | | | | |
| `midnightAuditor.ts` | 192 | Midnight cron job: full risk scan, AI insights, Morning Brief HTML email to admins/managers | cron 00:00 Asia/Muscat | Email send | DB reads, AI calls, email | 6/10 |
| **Services** | | | | | | |
| `riskService.ts` | 41 | Budget/time/quality/impact risk calculators + overallRisk (max-of-all) | numeric thresholds | RiskLevel enum | none | 2/10 |
| `emailService.ts` | 195 | Multi-provider email: Resend API > SMTP fallback > console.log dev; sendResetCode, sendWelcome, sendNotification, sendScenarioApproved/Rejected, sendContactInquiry, sendMorningBrief | to, subject, html | void | Email send or console.log | 4/10 |
| `notificationService.ts` | 32 | DB notification creation: single, by role, for all | userId/role, title, message | Notification record(s) | DB writes | 2/10 |
| `aiAnalyticsService.ts` | 787 | GitHub Models AI integration: multi-model retry pool, bilingual system prompt, local fallback engine, 14 verified models, alert context builder, chart data generation | DB context data, question, model? | AI analysis JSON (summary, insights, recommendations, metrics, charts) | API calls to GitHub Models | 9/10 |
| `smartNotificationService.ts` | 397 | AI-powered risk scanning: budget/timeline/quality/impact checks, de-duplication against existing alerts, AI insight generation (6 insight types), portfolio analysis | Active/planning projects | Alert + Notification records | DB writes, AI API calls | 7/10 |
| **Utils** | | | | | | |
| `jwt.ts` | 20 | Sign access/refresh tokens, verify tokens, secret length validation | payload + secret | JWT string or payload | none | 1/10 |
| `constants.ts` | 2 | PROJECT_STATUSES and USER_ROLES arrays | none | const arrays | none | 1/10 |
| `dateHelpers.ts` | 44 | `getLastNMonths` and `getNextNMonths` shared utilities | n, labelOptions? | MonthRange[] | none | 1/10 |
| `effectiveRole.ts` | 19 | `isUniversityEmail` and `getEffectiveRole` — university admin override utility | email, role | effective role | none | 1/10 |
| **Types** | | | | | | |
| `express.d.ts` | 10 | Augments Express.Request with User interface | -- | -- | -- | 1/10 |
| `custom.types.ts` | 2 | RiskLevel and UserRole type exports | -- | -- | -- | 1/10 |
| **Prisma** | | | | | | |
| `schema.prisma` | 409 | 23 models, 8 enums, all relations and indexes | -- | -- | -- | -- |
| `seed.ts` | 838 | Database seeder with sample data | -- | -- | DB writes | 5/10 |
| `seed_demo.ts` | -- | Demo seeder variant | -- | -- | DB writes | -- |
| `reseed.ts` | -- | Reset + reseed utility | -- | -- | DB writes | -- |

### 3.2 Frontend Files (185+ files, ~54,500 LOC)

#### Pages (25 pages)

| File | Lines | Purpose | API Dependencies | State | Complexity |
|------|-------|---------|-----------------|-------|-----------|
| `auth/Login.tsx` | 227 | Email/password login + OAuth (Google/GitHub) | `POST /auth/login` | authStore | 4/10 |
| `auth/Register.tsx` | 240 | Registration form with password requirements | `POST /auth/register` | authStore | 4/10 |
| `auth/ForgotPassword.tsx` | 616 | 3-step password reset (email > code > new password) | `POST /auth/forgot-password, verify-reset-code, reset-password` | local state | 6/10 |
| `auth/OAuthCallback.tsx` | 55 | Cookie-based OAuth callback (calls /auth/me) | `GET /auth/me` | authStore | 3/10 |
| `LandingPage.tsx` | ~1,200 | Marketing page — wrapper for 11 section components + 22 sub-components | none | none | 5/10 |
| `ai-smart/AiSmartPage.tsx` | 1,058 | Secondary landing page with Lenis scroll, contact stepper, tech stack marquee | `POST /contact` | local state | 5/10 |
| `Dashboard.tsx` | 2,977 | KPI cards, gauges, budget trends, project timeline, beneficiary demographics, export | `GET /dashboard`, futureService, aiAnalyticsService, reportService | TanStack Query + Zustand | 9/10 |
| `ProjectsList.tsx` | 1,098 | Filterable/searchable project list with pagination | `GET /projects`, categoryService | TanStack Query | 7/10 |
| `AddProject.tsx` | 1,679 | 6-step wizard: Basic > Budget > Beneficiaries > Location > Media > Review | `POST /projects`, categoryService, uploadService | local state | 9/10 |
| `EditProject.tsx` | 1,273 | Pre-filled project edit form with all 8 sub-resources | `GET/PATCH /projects/:id` | TanStack Query + local | 8/10 |
| `ProjectDetails.tsx` | 2,103 | Tabbed view: Overview, Timeline, Budget, Team, Docs, Media, Reviews, Stories | `GET /projects/:id` + sub-resource APIs | TanStack Query | 9/10 |
| `ArchivedProjects.tsx` | 973 | Archived projects list with restore | `GET /projects/archived`, `PATCH /:id/restore` | TanStack Query | 5/10 |
| `reports/GeneralReports.tsx` | 938 | Status/region distribution charts + export | `GET /reports/general` | TanStack Query | 6/10 |
| `reports/ImpactReports.tsx` | 1,924 | Beneficiary/SDG analysis + export | `GET /reports/impact` | TanStack Query | 7/10 |
| `reports/FinancialReports.tsx` | 1,254 | Budget/expense analysis + export | `GET /reports/financial` | TanStack Query | 7/10 |
| `admin/UserManagement.tsx` | 1,769 | User CRUD + role/department charts | `GET/POST/PATCH/DELETE /users` | TanStack Query | 8/10 |
| `admin/CategoryManagement.tsx` | 1,414 | Category CRUD + analytics | `GET/POST/PATCH/DELETE /categories` | TanStack Query | 7/10 |
| `PartnersAndDonations.tsx` | 1,838 | Partner CRUD + donation creation + leaderboard + challenges | `GET/POST/PATCH/DELETE /partners` + challenge APIs | TanStack Query | 8/10 |
| `IdeasBox.tsx` | 1,652 | Idea submission + voting + status management | `GET/POST/PATCH/DELETE /ideas` | TanStack Query | 7/10 |
| `SocialMediaAnalytics.tsx` | 1,005 | Internal engagement dashboards + ESG metrics | `GET /social-media` | TanStack Query | 6/10 |
| `FuturePortal.tsx` | 1,569 | AI predictions display (GitHub Models powered) | `GET /future`, `POST /ai-analytics/analyze`, `GET /ai-analytics/models` | TanStack Query | 5/10 |
| `EarlyWarning.tsx` | 2,472 | Alert management, filtering, resolution, AI risk ranking + scenario simulation | `GET /alerts`, `PATCH /alerts/:id/resolve`, aiAnalyticsService | TanStack Query | 8/10 |
| `MapView.tsx` | 526 | Leaflet map with project markers | `GET /projects/map` | TanStack Query | 5/10 |
| `Settings.tsx` | 2,160 | Profile, password, 2FA, system settings, notification prefs | Multiple auth + settings APIs | TanStack Query + authStore | 9/10 |
| `NotFound.tsx` | 71 | 404 page | none | none | 1/10 |

#### Landing Page Sub-Structure

```
pages/landing/
  LandingPage.tsx              -- Main wrapper (~1,200 LOC)
  components/ (22 files)       -- AnimatedCounter, BackgroundLines, BlurFade, BounceCards,
                                  CardDemo, Carousel, ContainerScrollAnimation, FloatingDock,
                                  GlassCard, NavbarMenu, Orb, RetroGrid, ScrollFloat,
                                  ScrollVelocity, ShinyButton, SparklesCore, StaggeredMenu,
                                  Stepper, Threads
  sections/ (11 files)         -- HeroSection, PrimaryHeroSection, FeaturesSection,
                                  BentoSection, ShowcaseSection, ProductShowcase,
                                  StatsSection, TestimonialsSection, FAQSection,
                                  CTASection, FooterSection

pages/ai-smart/
  AiSmartPage.tsx              -- Secondary landing page (~1,058 LOC)
  components/ (22 files)       -- Same animation components (shared structure)
  sections/ (11 files)         -- PrimaryHeroSection, HeroSection, BentoSection,
                                  ShowcaseSection, FAQSection, CTASection, FooterSection,
                                  FeaturesSection, StatsSection, ProductShowcase,
                                  TestimonialsSection
```

#### Components

| Category | Files | Key Components |
|----------|-------|---------------|
| `layout/` | 4 | AppShell (632 LOC, top bar+sidebar+outlet+search palette+fit mode), Sidebar (785 LOC, 5-section nav), PageHeader, AuthLayout |
| `common/` | 10 | Toast (context-based), LoadingSpinner, Pagination, SearchBar, ConfirmDialog, EmptyState, RiskBadge, KpiCard, ActionBar (export/refresh/print), ErrorBoundary |
| `charts/` | 7 | BarChart, LineChart, AreaChart, DonutChart, RadarChart, HeatmapGrid, StackedBarChart (all Recharts wrappers) |
| `ui/` | 19 | Badge, Card, Table, Button (178 LOC, 5 variants × 5 colors × 8 sizes), Input, Dock (+CSS), GlassSurface (+CSS, 348 LOC SVG displacement), ShapeBlur (402 LOC WebGL), RotatingText, NumberFlowSafe, Calendar, timeline, TracingBeam, world-map, CardSwap.css, ImageTrail.css |
| `notifications/` | 1 | NotificationHub (750 LOC, cinematic animations, risk categorization, AI insights, tabs) |
| `map/` | 1 | MiniMapWidget (Leaflet mini map with animated pulse markers) |
| `Lanyard/` | 2 | Lanyard (450 LOC, 3D suspended card with physics via @react-three/fiber + rapier) |
| `MetaBalls/` | 2 | MetaBalls (395 LOC, GLSL procedural blobs with mouse interaction) |

#### Services (22 files)

| File | Lines | Exports | HTTP Methods Used |
|------|-------|---------|------------------|
| `api.ts` | 56 | Axios instance with withCredentials, CSRF token injection, auto-refresh 401 interceptor with request queuing | -- |
| `authService.ts` | 45 | login, register, logout, refreshToken, forgotPassword, verifyResetCode, resetPassword, changePassword, setup2FA, verify2FA, disable2FA, getMe, updateProfile, exportMyData, deleteMyAccount | POST, GET, PATCH, DELETE |
| `projectService.ts` | 35 | getProjects, getProject, createProject, updateProject, deleteProject, restoreProject, getArchivedProjects, getProjectStats, getProjectMap + sub-resource CRUD | GET, POST, PATCH, DELETE |
| `dashboardService.ts` | 5 | getDashboardData | GET |
| `reportService.ts` | 14 | getGeneralReport, getImpactReport, getFinancialReport + export variants | GET |
| `userService.ts` | 22 | getUsers, getUser, createUser, updateUser, deleteUser, getUserStats | GET, POST, PATCH, DELETE |
| `categoryService.ts` | 24 | getCategories, getCategory, createCategory, updateCategory, deleteCategory, getCategoryStats, getCategoryAnalytics | GET, POST, PATCH, DELETE |
| `alertService.ts` | 30 | getAlerts, getAlertStats, resolveAlert, deleteAlert + AI scenario actions (list, submit, approve, reject) | GET, PATCH, DELETE, POST |
| `partnerService.ts` | 20 | getPartners, getPartner, createPartner, updatePartner, deletePartner, getPartnerStats, getPartnerLeaderboard | GET, POST, PATCH, DELETE |
| `donationService.ts` | 28 | createDonation, getDonationStats, getDonationPreferences, saveDonationPreferences, getDonationsByUser | POST, GET, PATCH |
| `challengeService.ts` | 60 | getCurrentChallenge, getPastChallenges, getChallengeDonationTrend, createChallenge, updateChallenge, finalizeChallenge + rewards | GET, POST, PATCH, DELETE |
| `ideaService.ts` | 35 | getIdeas, getIdea, createIdea, updateIdea, deleteIdea, voteIdea, getIdeaStats, getIdeaLeaderboard | GET, POST, PATCH, DELETE |
| `settingsService.ts` | 18 | getSettings, getSetting, updateSettings, updateSetting, deleteSetting | GET, PUT, DELETE |
| `socialMediaService.ts` | 128 | getSocialMediaData (ESG scoring, engagement, sentiment) | GET |
| `futureService.ts` | 18 | getFutureData | GET |
| `expenseService.ts` | 12 | project expense CRUD | GET, POST, PATCH, DELETE |
| `beneficiaryService.ts` | 12 | project beneficiary CRUD | GET, POST, PATCH, DELETE |
| `reviewService.ts` | 8 | project review CRUD | GET, POST |
| `notificationService.ts` | 33 | getNotifications, markAsRead, markAllAsRead, deleteNotification, scanRisks | GET, PATCH, POST, DELETE |
| `activityLogService.ts` | -- | getActivityLogs, getActivityStats | GET |
| `uploadService.ts` | -- | uploadFile | POST |
| `aiAnalyticsService.ts` | 71 | analyze, getContext, getModels, analyzeAlerts + 6 model definitions (Claude, Gemini, GPT-4o, Gemma, Mistral, Llama) | POST, GET |

#### Stores (2 Zustand stores)

| Store | Persisted | Key | State Shape | Actions |
|-------|-----------|-----|-------------|---------|
| `authStore` | Yes (full) | `auth-storage` | `{ user: AuthUser or null, accessToken: 'cookie' or null }` | setUser, setAccessToken (marker only), logout |
| `uiStore` | Yes (partial: theme, locale) | `ui-storage` | `{ sidebarOpen, theme: light/dark, locale: en/ar }` | toggleSidebar, setTheme, toggleTheme, setLocale |

#### Hooks (2 hooks)

`useAuth` (wrapper for authStore), `useTheme` (theme + colors with `getTheme()` + `useColors()`)

#### Types (9 type files in `src/types/`)

`api.types.ts` (13), `user.types.ts` (10), `project.types.ts` (115), `expense.types.ts` (5), `beneficiary.types.ts` (5), `partner.types.ts` (4), `alert.types.ts` (9), `idea.types.ts` (50), `category.types.ts` (7)

#### Utils (6 utility files)

`formatters.ts` (10), `constants.ts` (18, includes 17 SDG goals), `cn.ts` (4), `permissions.ts` (16), `exportUtils.ts` (1,100+ LOC, enterprise Excel/PDF/Print with Arabic RTL), `pdfReportGenerator.ts` (1,500+ LOC, native jsPDF for 11 report types)

#### Theme (1 file)

`colors.ts` (124) — Complete theme palette (light: warm cream + forest green; dark: near-black + white), statusColors, riskColors, categoryColors, chartColors, 29-property ThemeColors interface

---

## 4. STATE MACHINE MAPPING

### 4.1 Project Status Transitions

```
          +----------------------------------------------+
          |                                              |
  [CREATE] -> planning --> active --> completed           |
               |            |           |                |
               |            v           |                |
               |         on_hold -------+                |
               |            |                            |
               v            v                            v
           archived <-- (soft delete from any state)
               |
               v
           planning  <- (restore always resets to planning)
```

**API Controls:**
- `POST /projects` -> status defaults to `planning`
- `PATCH /projects/:id` -> validates status transitions (see allowed map below)
- `DELETE /projects/:id` -> sets status to `archived` (soft delete)
- `PATCH /projects/:id/restore` -> sets status to `planning` (NOT original status)

**Status Transition Rules (enforced server-side since Phase 2):**
- `planning` -> `active`, `archived`
- `active` -> `on_hold`, `completed`, `archived`
- `on_hold` -> `active`, `archived`
- `completed` -> `archived`
- `archived` -> none (use restore endpoint only, resets to `planning`)

### 4.2 Expense Status Machine

```
  [CREATE] -> pending --> approved (by admin/manager)
                |
                +--> rejected
```

**Critical:** `spent` calculations across ALL endpoints filter `status: 'approved'` only.

### 4.3 Idea Status Machine

```
  [CREATE] -> pending --> under_review --> approved
                                    +--> rejected
```

**RBAC:** Only `admin` and `manager` roles can change idea status.

### 4.4 Alert Lifecycle

```
  [SYSTEM GENERATED or MIDNIGHT AUDITOR] -> active (resolvedAt: null)
                                              |
                                              v
                                           resolved (resolvedAt: DateTime)
```

### 4.5 Scenario Action Lifecycle

```
  [AI SIMULATION] -> pending --> approved (by admin/manager, with executionNote)
                        |
                        +--> rejected (with rejectionReason)
```

**Notifications:** Email sent on approval/rejection via emailService.

### 4.6 Authentication State Machine

```
  [BROWSER LOAD]
       |
       +-- AuthInitializer always calls GET /auth/me (cookie-based)
       |     |
       |     +-- GET /auth/me succeeds -> authenticated (setUser, setAccessToken('cookie'))
       |     +-- GET /auth/me fails -> logout() -> user remains null
       |
       +-- PrivateRoute checks user (not accessToken)
       +-- PublicOnlyRoute checks user (not accessToken)
       +-- RootRedirect: user ? /dashboard : /landing
```

**401 Auto-Handling (with silent refresh):**
- Axios response interceptor catches 401 on non-auth endpoints
- Attempts silent refresh via `POST /auth/refresh` (cookie-based, with token rotation)
- If refresh succeeds: queued failed requests are retried automatically
- If refresh fails: clears localStorage `auth-storage`, hard redirect to `/login`
- Exception: `/auth/me`, `/auth/login`, `/auth/refresh`, `/auth/register` don't trigger retry

### 4.7 Challenge Status Machine

```
  [CREATE] -> active --> completed (goal reached or manually finalized)
                |
                +--> failed (manually finalized)
```

---

## 5. DATA MODEL -- Complete Schema Reference

### 5.1 Enums (8 enums)

```
UserRole:          admin | manager | employee | viewer
ProjectStatus:     planning | active | on_hold | completed | archived
AlertType:         budget | timeline | quality | impact
AlertLevel:        info | warning | critical
IdeaStatus:        pending | under_review | approved | rejected
ExpenseStatus:     approved | pending | rejected
ChallengeStatus:   active | completed | failed
ContractType:      full_time | part_time | contractor
```

### 5.2 Model Summary (23 models)

| Model | PK | Notable Fields | Relations (outgoing) | Cascade Delete | Indexes |
|-------|----|----|----|----|-----|
| User | UUID | email(unique), password(bcrypt), role(enum), status(string), is2FAEnabled, twoFASecret, resetCode, resetCodeExpiresAt, lastLoginAt, jobTitle, employeeId, contractType(enum), bio, notifyEmail, notifySms, notifyPush, salaryRoundingEnabled, monthlyDonationEnabled, companyMatchEnabled, monthlyDonationAmount, loginCount, lastIP | manages Project[], has ActivityLog[], Donation[], Idea[], IdeaVote[], Notification[], ProjectTeam[], Review[], RefreshToken[], ScenarioAction[] (created+approved) | -- | email, role, status, department, employeeId |
| Category | UUID | name(unique), nameAr, description, icon, color, budget, sdgGoals(Json), regions(Json), order | has Project[] | -- | name |
| Project | UUID | categoryId(FK), managerId(FK nullable), budget, location, region, lat/lng(nullable), progress(float), status(enum), tags/objectives/expectedOutputs/sdgGoals(Json), riskThresholds(Json) | belongs to Category, User; has Milestone[], Expense[], Beneficiary[], Review[], Media[], Document[], SuccessStory[], ProjectTeam[], Alert[], ActivityLog[], Donation[], ScenarioAction[] | -- | categoryId, status, managerId, region, startDate, endDate, createdAt |
| Milestone | UUID | projectId(FK), title, description, status(string "pending"), date, attachments(Json) | belongs to Project | **Cascade** | projectId, status |
| Expense | UUID | projectId(FK), amount, category(string), description, status(enum), approvedBy(string nullable), invoiceUrl, date | belongs to Project | **Cascade** | projectId, category, status, date |
| Beneficiary | UUID | projectId(FK), count, male, female, children, elderly, disabled, ageGroup, gender, description, impact | belongs to Project | **Cascade** | projectId |
| Review | UUID | projectId(FK), userId(FK), rating(float), comment | belongs to Project, User | **Cascade** | projectId, userId |
| Media | UUID | projectId(FK), url, type, thumbnail, caption, category, phase | belongs to Project | **Cascade** | projectId, category |
| Document | UUID | projectId(FK), name, type, size, url, uploadedBy | belongs to Project | **Cascade** | projectId |
| SuccessStory | UUID | projectId(FK), title, content, beforeImage, afterImage | belongs to Project | **Cascade** | projectId |
| ProjectTeam | UUID | projectId(FK), userId(FK), role(string) | belongs to Project, User | **Cascade** | projectId, userId; unique(projectId,userId) |
| Alert | UUID | projectId(FK), type(enum incl. impact), level(enum), message, resolvedAt | belongs to Project | **Cascade** | projectId, level, resolvedAt, createdAt |
| Idea | UUID | userId(FK), title, description, nlpCategory, status(enum), votes(int) | belongs to User; has IdeaVote[] | -- | userId, status |
| IdeaVote | UUID | ideaId(FK), userId(FK) | belongs to Idea, User | **Cascade** (from Idea) | unique(ideaId,userId) |
| Partner | UUID | name, type, supportArea, logoUrl, totalContribution, contactPerson, phone, email, status, projectsCount(denormalized), startDate, endDate | has Donation[] | -- | type, status |
| Donation | UUID | userId(FK nullable), partnerId(FK nullable), projectId(FK nullable), challengeId(FK nullable), amount, type | belongs to Partner, User, Project, Challenge | SetNull on Challenge delete | userId, partnerId, projectId, challengeId, type, createdAt |
| ActivityLog | UUID | userId(FK), projectId(FK nullable), action, entity, entityId, details, type, diffJson(Json), ip | belongs to User, Project | -- | userId, projectId, entity, createdAt |
| Settings | UUID | orgId, key, value(String) | -- | -- | unique(orgId,key) |
| Notification | UUID | userId(FK), title, message, type(string), read(bool), link | belongs to User | **Cascade** | userId, read, createdAt |
| RefreshToken | UUID | userId(FK), tokenHash(unique, SHA-256), expiresAt | belongs to User | **Cascade** | userId, tokenHash, expiresAt |
| Challenge | UUID | title, description, goal(Float), collected(Float), startDate, endDate, status(ChallengeStatus), winner, participants(Int), topDonorsSnapshot(Json) | has Donation[], ChallengeReward[] | -- | status, endDate, createdAt |
| ChallengeReward | UUID | challengeId(FK), title, condition, icon, color | belongs to Challenge | **Cascade** | challengeId |
| **ScenarioAction** | UUID | projectId(FK), alertId(nullable), scenarioId(string), title, description, status(string: pending/approved/rejected), impactBefore(Json), impactAfter(Json), confidence(Int), effort(string), timeframe(string), approvedById(FK nullable), approvedAt, rejectedById, rejectedAt, rejectionReason, executionNote, createdById(FK) | belongs to Project, User (creator), User? (approver) | -- | projectId, status, createdAt, alertId |

### 5.3 Denormalization Points

| Field | Location | Live Override |
|-------|----------|--------------|
| `Partner.projectsCount` | Stored in Partner table | API overrides with `donations.length` or `_count.donations` |
| `Partner.totalContribution` | Stored in Partner table | API enriches from `SUM(donation.amount)` |
| `Idea.votes` | Stored in Idea table | Updated on vote toggle via count query |
| `Challenge.collected` | Stored in Challenge table | Updated on donation creation |
| `Challenge.participants` | Stored in Challenge table | Updated on donation creation |

---

## 6. SECURITY ARCHITECTURE

### 6.1 Authentication Flow

```
POST /auth/login
  -> authRateLimit (20 req/15min on auth endpoints)
  -> Zod validates { email, password }
  -> Account lockout check (5 failed attempts = 15 min lockout)
  -> bcrypt.compare(password, user.password) + status check
  -> signAccessToken({ id, email, role }) -- expires 15 minutes
  -> signRefreshToken({ id, email, role }) -- expires 7 days
  -> storeRefreshToken(userId, SHA-256 hash) in DB
  -> setTokenCookies(res, accessToken, refreshToken) -- httpOnly, sameSite:strict
  -> Response: { user } (NO tokens in response body)

POST /auth/refresh
  -> Read refresh_token from httpOnly cookie (fallback: req.body)
  -> verifyToken(refreshToken, JWT_REFRESH_SECRET)
  -> Verify SHA-256 hash exists in RefreshToken table
  -> Token Rotation: delete old token, issue new pair
  -> storeRefreshToken(new hash) + setTokenCookies(new pair)
  -> Response: { message: 'Token refreshed' }

POST /auth/logout
  -> authenticate (from cookie)
  -> revokeUserRefreshTokens(userId) -- delete all from DB
  -> clearTokenCookies(res) -- clear access_token + refresh_token cookies
  -> Response: { message: 'Logged out successfully' }

POST /auth/register
  -> University email (@gcet.edu.om) -> auto-assign admin role
  -> Other emails -> default 'employee' role
  -> Same cookie flow as login

GET /auth/me (every page load via AuthInitializer)
  -> authenticate reads httpOnly cookie
  -> DB lookup verifies user exists and is active
  -> getEffectiveRole() overrides role for university emails on every request
  -> Response: { user } with effective role
```

### 6.2 JWT & Cookie Configuration

| Parameter | Value |
|-----------|-------|
| Algorithm | HS256 (jsonwebtoken default) |
| Access Token Expiry | 15 minutes |
| Refresh Token Expiry | 7 days |
| Secret Source | `process.env.JWT_SECRET` (min 32 chars enforced at startup) |
| Refresh Secret | `process.env.JWT_REFRESH_SECRET` (min 32 chars enforced at startup) |
| Token Payload | `{ id, email, role }` |
| Storage (Backend) | httpOnly cookies (access_token at `/`, refresh_token at `/api/auth`) |
| Storage (DB) | RefreshToken table (SHA-256 hash, expiresAt, userId) |
| Storage (Frontend) | Zustand `auth-storage` stores `user` only (`accessToken: 'cookie'` marker) |
| Cookie Flags | httpOnly, sameSite:strict, secure(prod only), path-scoped |
| CSRF | Double-submit cookie: `csrf_token` non-httpOnly + `X-CSRF-Token` header (63 LOC, 10 exempt auth paths) |
| Token Rotation | Every refresh deletes old token, issues new pair |
| Account Lockout | 5 failed logins = 15 min lockout (in-memory per-email) |
| Password Complexity | min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char |
| Token Length Guard | Rejects tokens > 2048 chars (attack vector protection) |
| 2FA | HMAC-based TOTP: 6 digits, ±1 time step for clock drift tolerance |

### 6.3 RBAC Matrix

| Endpoint Group | admin | manager | employee | viewer |
|---------------|-------|---------|----------|--------|
| `GET /projects, /dashboard, /reports/*` | Y | Y | Y | Y |
| `POST /projects` | Y | Y | N | N |
| `PATCH/DELETE /projects/:id` | Y | Y | N | N |
| `POST /projects/:id/expenses` | Y | Y | Y | N |
| `PATCH/DELETE /projects/:id/expenses/:eid` | Y | Y | N | N |
| `POST/PATCH/DELETE /projects/:id/milestones` | Y | Y | N | N |
| `POST/PATCH/DELETE /projects/:id/team` | Y | Y | N | N |
| `POST /projects/:id/beneficiaries` | Y | Y | Y | N |
| `POST /projects/:id/documents` | Y | Y | Y | N |
| `POST /projects/:id/media` | Y | Y | Y | N |
| `POST/PATCH/DELETE /projects/:id/success-stories` | Y | Y | N | N |
| `POST/PATCH/DELETE /users` | Y | N | N | N |
| `POST/PATCH /categories` | Y | Y | N | N |
| `DELETE /categories` | Y | Y | N | N |
| `PATCH /ideas/:id` (status change) | Y | Y | N | N |
| `POST/PATCH /partners` | Y | Y | N | N |
| `DELETE /partners` | Y | N | N | N |
| `DELETE /alerts` | Y | N | N | N |
| `PUT /settings` | Y | Y | N | N |
| `DELETE /settings` | Y | N | N | N |
| `GET /activity-logs` | Y | Y | N | N |
| `POST /ai-analytics/analyze` | Y | Y | Y | Y |
| `POST /ai-analytics/simulate-solution` | Y | Y | N | N |
| `PATCH /ai-analytics/scenario-actions` | Y | Y | N | N |
| `POST /notifications/scan` | Y | Y | N | N |
| `POST /ai-analytics/trigger-audit` | Y | Y | N | N |

### 6.4 Security Findings

| Severity | Finding | Status |
|----------|---------|--------|
| ~~HIGH~~ | ~~JWT stored in localStorage~~ | **RESOLVED (Phase 5)** — Moved to httpOnly cookies |
| ~~HIGH~~ | ~~No CSRF protection~~ | **RESOLVED (Phase 5)** — Double-submit cookie pattern |
| ~~MEDIUM~~ | ~~No password complexity requirements~~ | **RESOLVED (Phase 5)** — min 8, upper+lower+digit+special |
| ~~MEDIUM~~ | ~~No object-level authorization~~ | **RESOLVED (Phase 5)** — `requireProjectAccess` middleware |
| ~~LOW~~ | ~~Refresh token not stored server-side~~ | **RESOLVED (Phase 5)** — DB-stored with rotation |
| ~~MEDIUM~~ | ~~CORS allows any `localhost:*` origin~~ | **RESOLVED (Phase 6)** — Now uses explicit `ALLOWED_ORIGINS` env var allowlist |
| MEDIUM | `approvedBy` on Expense is raw string, not FK | `schema.prisma` |
| ~~LOW~~ | ~~No file type validation on upload beyond size limit~~ | **RESOLVED (Phase 6)** — MIME + extension whitelists per category |
| INFO | Error messages sanitized in production (good) | `backend/src/middleware/errorHandler.ts` |
| INFO | Timing-safe string comparison on reset codes | `backend/src/routes/auth.ts` |
| INFO | Account lockout after 5 failed logins (15 min) | `backend/src/routes/auth.ts` |
| INFO | Startup validation: required env vars + JWT secret length check | `backend/src/server.ts` |
| INFO | Token length guard (>2048 chars rejected) | `backend/src/middleware/auth.middleware.ts` |
| INFO | x-powered-by header disabled | `backend/src/app.ts` |

---

## 7. ~~DUPLICATED CODE -- getLastNMonths~~ (RESOLVED)

**Status:** Extracted to `backend/src/utils/dateHelpers.ts` in Phase 2.

All 7 route files now import `getLastNMonths` (and `getNextNMonths` for `future.ts`) from the shared utility.

---

## 8. BUILD & CONFIGURATION

### 8.1 Frontend Build

```
Vite 6.3.5
+-- Plugin: @vitejs/plugin-react (Babel transforms for JSX)
+-- Plugin: @tailwindcss/vite (Tailwind v4 integration)
+-- CSS: Tailwind CSS v4.2.1 + PostCSS 8.5.6 + Autoprefixer 10.4.21
+-- Code splitting: React.lazy() on all 25 page components
+-- Dev server: port 5173 (host: true, allowedHosts: localhost + *.app.github.dev)
+-- Env: VITE_API_URL (defaults to http://localhost:5000/api)
+-- Base path: VITE_BASE_PATH (for subdirectory deployment)
+-- Assets: includes *.glb (3D models)
```

### 8.2 Backend Build

```
TypeScript 5.8.3 -> tsc -> dist/
+-- Runtime: tsx (dev watch mode: tsx watch src/server.ts)
+-- Target: ES2022, Module: ESNext, ModuleResolution: bundler
+-- Strict mode: ON
+-- Express 5 (v5.1.0)
+-- Cron: node-cron (Midnight Auditor, 00:00 Asia/Muscat)
+-- Email: nodemailer (multi-provider: Resend > SMTP > console.log)
```

### 8.3 TypeScript Configuration

| Setting | Frontend | Backend |
|---------|----------|---------|
| target | ES2022 | ES2022 |
| module | ESNext | ESNext |
| moduleResolution | bundler | bundler |
| strict | true | true |
| jsx | react-jsx | -- |
| noUnusedLocals | true | false |
| noUnusedParameters | true | false |
| noEmit | true (Vite handles) | false (tsc emits) |
| verbatimModuleSyntax | true | -- |

### 8.4 Environment Variables

| Variable | Used In | Required |
|----------|---------|----------|
| `DATABASE_URL` | Backend (Prisma) | **Yes** (startup fail-fast) |
| `JWT_SECRET` | Backend (auth) | **Yes** (startup fail-fast, min 32 chars) |
| `JWT_REFRESH_SECRET` | Backend (auth) | **Yes** (startup fail-fast, min 32 chars) |
| `PORT` | Backend (server) | No (default: 5000) |
| `NODE_ENV` | Backend (error handler, email, prisma logging) | No |
| `UPLOAD_DIR` | Backend (file uploads) | No (default: "uploads") |
| `SMTP_HOST` | Backend (email) | No (dev: console.log) |
| `SMTP_PORT` | Backend (email) | No (default: 1025) |
| `SMTP_USER` | Backend (email) | No |
| `SMTP_PASS` | Backend (email) | No |
| `EMAIL_FROM` | Backend (email) | No (default: noreply@csr-platform.com) |
| `RESEND_API_KEY` | Backend (email, preferred provider) | No (falls back to SMTP) |
| `VITE_API_URL` | Frontend (axios) | No (default: http://localhost:5000/api) |
| `VITE_BASE_PATH` | Frontend (base path) | No (default: /) |
| `AUTH0_DOMAIN` | Frontend (OAuth) | For OAuth only |
| `AUTH0_CLIENT_ID` | Frontend (OAuth) | For OAuth only |
| `ZENMUX_API_KEY` | Backend (AI Analytics) | No (falls back to GITHUB_MODELS_TOKEN, then local analysis) |
| `ZENMUX_BASE_URL` | Backend (AI Analytics) | No (default: https://zenmux.ai/api/v1) |
| `ALLOWED_EMAIL_DOMAINS` | Backend (auth, OAuth) | No (default: gcet.edu.om) |
| `UNIVERSITY_EMAIL_DOMAINS` | Backend (auth, OAuth) | No (default: gcet.edu.om) |
| `GOOGLE_CLIENT_ID` | Backend (OAuth) | For Google OAuth only |
| `GOOGLE_CLIENT_SECRET` | Backend (OAuth) | For Google OAuth only |
| `GOOGLE_CALLBACK_URL` | Backend (OAuth) | For Google OAuth only |
| `GITHUB_CLIENT_ID` | Backend (OAuth) | For GitHub OAuth only |
| `GITHUB_CLIENT_SECRET` | Backend (OAuth) | For GitHub OAuth only |
| `GITHUB_CALLBACK_URL` | Backend (OAuth) | For GitHub OAuth only |
| `FRONTEND_URL` | Backend (OAuth redirect) | No (default: http://localhost:5174) |
| `ALLOWED_ORIGINS` | Backend (CORS allowlist) | No (default: localhost:5173,localhost:5000) |

### 8.5 NPM Scripts

| Script | Location | Command |
|--------|----------|---------|
| `dev` | Frontend | `vite` |
| `build` | Frontend | `vite build` |
| `lint` | Frontend | `eslint .` |
| `preview` | Frontend | `vite preview` |
| `dev` | Backend | `tsx watch src/server.ts` |
| `start` | Backend | `node dist/server.js` |
| `build` | Backend | `tsc` |
| `db:generate` | Backend | `prisma generate --schema=src/prisma/schema.prisma` |
| `db:push` | Backend | `prisma db push --schema=src/prisma/schema.prisma` |
| `db:seed` | Backend | `tsx src/prisma/seed.ts` |
| `db:studio` | Backend | `prisma studio --schema=src/prisma/schema.prisma` |

### 8.6 Key Dependencies

**Backend (12 prod deps):**
`@prisma/client ^6.9.0`, `bcryptjs ^3.0.2`, `cookie-parser ^1.4.7`, `cors ^2.8.5`, `dotenv ^17.2.3`, `express ^5.1.0`, `express-rate-limit ^7.5.0`, `helmet ^8.1.0`, `jsonwebtoken ^9.0.2`, `multer ^2.1.0`, `node-cron ^4.2.1`, `nodemailer ^8.0.1`, `zod ^3.24.0`

**Frontend (55 prod deps — notable):**
`react ^19.1.1`, `react-dom ^19.1.1`, `react-router-dom ^7.9.4`, `@tanstack/react-query ^5.90.21`, `zustand ^5.0.11`, `axios ^1.12.2`, `framer-motion ^12.23.24`, `recharts ^3.3.0`, `leaflet ^1.9.4`, `react-leaflet ^5.0.0`, `three ^0.183.2`, `@react-three/fiber ^9.5.0`, `@react-three/drei ^10.7.7`, `@react-three/rapier ^2.2.0`, `gsap ^3.14.2`, `lenis ^1.3.18`, `lucide-react ^0.548.0`, `react-icons ^5.6.0`, `zod ^3.25.76`, `xlsx ^0.18.5`, `jspdf ^4.2.0`, `tailwindcss ^4.2.1`, `date-fns ^4.1.0`, `cobe ^0.6.5`, `ogl ^1.0.11`, `swiper ^12.1.2`

---

## 9. KNOWN ISSUES & TECH DEBT

### 9.1 Active Issues

| ID | Severity | Issue | Details |
|----|----------|-------|---------|
| H4 | High | `Settings.value` is String type | Stores JSON as string, requires JSON.parse on read |
| D1 | Medium | Dashboard totalProjects includes archived | `prisma.project.count()` has no status filter |
| D3 | Medium | No shared type contracts | Frontend and backend define types independently |
| D4 | Medium | Project restore always resets to `planning` | Does not restore original status |
| D8 | Low | `@auth0/auth0-react` in deps but OAuth is optional | Unused if not configured |
| D9 | Low | Several UI-only packages for LandingPage | `vanilla-tilt`, `react-parallax-tilt`, `@react-spring/web`, `@tsparticles/*` |

### 9.2 Resolved Issues (Phase 1)

- Auth middleware no longer has admin fallback bypass
- All expense calculations filter `status: 'approved'`
- Partner counts use live donation queries, not denormalized column
- Notification bell uses real API (not hardcoded `3`)
- All mock data removed from pages
- 50+ dead files deleted
- Error handler maps Prisma/JWT/Zod errors properly
- Route guards (PrivateRoute/PublicOnlyRoute) implemented
- 401 interceptor redirects to login

### 9.3 Resolved Issues (Phase 2)

- **H1:** `getLastNMonths` extracted to `backend/src/utils/dateHelpers.ts` — 7 route files now import from shared utility
- **D2:** Zod versions unified — frontend on v3 (`zod@^3.25.76`) to match backend (`zod@^3.24.0`)
- **D5:** Project status transition validation added — `PATCH /projects/:id` now enforces allowed state transitions, returns `400 INVALID_TRANSITION` on violation

### 9.4 Resolved Issues (Phase 3)

- **D6:** AI Analytics migrated from GitHub Models to ZenMux AI Gateway — 13 models, multi-agent pipeline (3 agents + master), bilingual system prompt, retry pool with local fallback
- OpenRouter completely removed from codebase — replaced with GitHub Models
- `aiAnalyticsService.ts` added with `fetchContextData`, `buildSystemPrompt`, `callGitHubModels`, `parseAiResponse`, `generateLocalAnalysis`

### 9.5 Resolved Issues (Phase 4)

- **Animation Fixes:** Fixed `opacity: 0` issues where page elements weren't visible (Dashboard, FinancialReports, EarlyWarning)
- **CategoryManagement Real Data:** Fixed `||` to `??` for budget, excluded own budget, added partners count, added regions extraction
- **Flat Trend Charts Fix:** Added cumulative growth curve generation when data concentrated in one month
- **Data Integrity:** All displayed data comes from real database queries

### 9.6 Resolved Issues (Phase 5)

- **Security Hardening — httpOnly Cookies:** JWT tokens moved from localStorage to httpOnly/sameSite:strict cookies
- **CSRF Protection:** `csrf.middleware.ts` implements double-submit cookie pattern (63 LOC, 10 exempt auth paths)
- **Object-Level Authorization:** `projectAccess.middleware.ts` — admin/manager bypass; employee/viewer must be project manager or team member
- **DB-Stored Refresh Tokens with Rotation:** `RefreshToken` Prisma model (SHA-256 hash). Token rotation on every refresh
- **Zod Validation on PATCH Routes:** 6 partial Zod schemas added for all unvalidated PATCH endpoints
- **University Admin Auto-Role:** `@gcet.edu.om` emails auto-get admin role (configurable via `UNIVERSITY_EMAIL_DOMAINS`)
- **OAuth Cookie Migration:** OAuth callbacks set httpOnly cookies, redirect to `/auth/callback` with NO tokens in URL
- **Account Lockout:** 5 failed login attempts = 15 min lockout (in-memory per-email)
- **Password Complexity:** min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
- **Timing-Safe Comparisons:** Reset codes use `crypto.timingSafeEqual`
- **Auth Rate Limiting:** Separate `authRateLimit` (stricter) applied to auth endpoints

### 9.7 Resolved Issues (Phase 6)

- **Challenge/Fundraising System:** `Challenge` and `ChallengeReward` Prisma models + `ChallengeStatus` enum. Full CRUD via `/api/partners/challenges/*`
- **Donation Preferences:** User-level preferences for salary rounding, monthly donations, company match
- **Smart Notification Service:** `smartNotificationService.ts` — AI-powered risk scanning with de-duplication
- **GDPR Data Export:** `GET /auth/me/export`
- **Account Self-Deletion:** `DELETE /auth/me` with password confirmation
- **PDF/Excel Export:** `exportUtils.ts` (1,100+ LOC) and `pdfReportGenerator.ts` (1,500+ LOC)
- **NotificationHub Component:** Rich notification center (750 LOC, cinematic animations)
- **MiniMapWidget Component:** Mini Leaflet map (Oman-centered with pulse markers)
- **Upload Security Hardened:** MIME whitelists, extension whitelists per category, blocked dangerous patterns
- **CORS Fixed:** Explicit `ALLOWED_ORIGINS` env var allowlist
- **Helmet CSP:** Content Security Policy, crossOriginResourcePolicy, referrerPolicy
- **Health Check:** `GET /api/health`
- **Landing Page Restructured:** Split into 33 sub-component/section files

### 9.8 Resolved Issues (Phase 7)

- **Prescriptive Analytics:** `POST /ai-analytics/simulate-solution` generates 4-5 AI solution scenarios per alert/project with before/after impact, confidence, effort, timeframe
- **Scenario Action Workflow:** `ScenarioAction` Prisma model (23rd model). CRUD + approval/rejection flow with email notifications
- **Midnight Auditor:** `midnightAuditor.ts` (192 LOC) — cron 00:00 Asia/Muscat, full risk scan, AI insights, Morning Brief HTML email to admins/managers
- **Alert Analysis:** `POST /ai-analytics/analyze-alerts` — AI-powered alert-specific analysis with budget/timeline/quality/impact context
- **Manual Audit Trigger:** `POST /ai-analytics/trigger-audit` — admin/manager can trigger Midnight Auditor on demand
- **Email Service Expanded:** Now supports Resend API (preferred), SMTP fallback, sendScenarioApproved/Rejected, sendContactInquiry, sendMorningBrief (195 LOC total)
- **Contact Route:** `POST /api/contact` — public contact form (no auth required)
- **AI Smart Page:** Secondary landing page (`pages/ai-smart/AiSmartPage.tsx`, 1,058 LOC) with Lenis smooth scroll, 3-step contact stepper, tech stack marquee
- **Impact Risk Type:** `AlertType` enum expanded with `impact` value
- **Risk Service Expanded:** Added `impactRisk()` and `overallRisk()` calculators (41 LOC total)
- **AI Analytics Service Expanded:** 787 LOC — added `fetchAlertContext`, `buildAlertSystemPrompt`, `generateLocalAlertAnalysis`, AiChart interface for Recharts-compatible chart data
- **Startup Validation:** `server.ts` now validates required env vars (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET) and warns on short secrets
- **New Frontend Components:** Lanyard (3D physics card, 450 LOC), MetaBalls (GLSL blobs, 395 LOC), Calendar, timeline, TracingBeam, world-map
- **Express 5:** Backend upgraded to Express v5.1.0
- **3D Capabilities:** @react-three/fiber + drei + rapier for 3D rendering

---

## 10. COMPLETE API ENDPOINT REFERENCE

### Auth (`/api/auth`)
```
POST   /register          -- Create account (sets httpOnly cookies, university @gcet.edu.om -> admin)
POST   /login             -- Login (sets httpOnly cookies, account lockout after 5 failures)
POST   /refresh           -- Refresh tokens (cookie-based, token rotation, DB-verified)
POST   /logout            -- Revoke all refresh tokens + clear cookies
GET    /me                -- Get current user profile (cookie auth)
PATCH  /me                -- Update current user profile
GET    /me/export         -- GDPR-style data export
DELETE /me                -- Account self-deletion (requires password)
POST   /forgot-password   -- Send reset code to email
POST   /verify-reset-code -- Verify 6-digit reset code
POST   /reset-password    -- Set new password with valid code
POST   /change-password   -- Change password (requires current password)
POST   /2fa/setup         -- Generate TOTP 2FA secret
POST   /2fa/verify        -- Verify and enable 2FA
POST   /2fa/disable       -- Disable 2FA (requires password)
```

### OAuth (`/api/auth` -- Google/GitHub)
```
GET    /google            -- Redirect to Google consent screen
GET    /google/callback   -- Google OAuth callback (sets cookies, redirects to /auth/callback)
GET    /github            -- Redirect to GitHub authorization
GET    /github/callback   -- GitHub OAuth callback (sets cookies, redirects to /auth/callback)
```

### Contact (`/api/contact`)
```
POST   /                  -- Submit contact form (public, no auth, Zod validated)
```

### Projects (`/api/projects`) -- 28+ endpoints
```
GET    /                  -- List (filters: status, region, category, search, budget range, page, limit)
GET    /stats             -- Project counts and KPIs
GET    /map               -- All non-archived projects with enriched data
GET    /archived          -- Archived projects list
GET    /:id               -- Single project with all relations (requireProjectAccess: OLA)
POST   /                  -- Create (requireRole: admin, manager)
PATCH  /:id               -- Update with status transition validation (requireRole: admin, manager)
DELETE /:id               -- Soft delete to archived (requireRole: admin, manager)
PATCH  /:id/restore       -- Restore from archive (requireRole: admin, manager)
-- Milestones --
POST   /:id/milestones
PATCH  /:id/milestones/:mid
DELETE /:id/milestones/:mid
-- Expenses --
GET    /:id/expenses
POST   /:id/expenses      (requireRole: admin, manager, employee)
PATCH  /:id/expenses/:eid
DELETE /:id/expenses/:eid
-- Reviews --
GET    /:id/reviews
POST   /:id/reviews
-- Team --
GET    /:id/team
POST   /:id/team
PATCH  /:id/team/:tid
DELETE /:id/team/:tid
-- Beneficiaries --
GET    /:id/beneficiaries
POST   /:id/beneficiaries (requireRole: admin, manager, employee)
PATCH  /:id/beneficiaries/:bid
DELETE /:id/beneficiaries/:bid
-- Documents --
GET    /:id/documents
POST   /:id/documents     (requireRole: admin, manager, employee)
DELETE /:id/documents/:did
-- Media --
GET    /:id/media
POST   /:id/media         (requireRole: admin, manager, employee)
DELETE /:id/media/:mid
-- Success Stories --
GET    /:id/success-stories
POST   /:id/success-stories
PATCH  /:id/success-stories/:sid
DELETE /:id/success-stories/:sid
```

### Dashboard (`/api/dashboard`)
```
GET    /    -- Returns: kpis, budgetTrend, projectsByCategory, projectsByRegion,
              projectsByStatus, recentProjects, recentAlerts, recentActivities,
              topPartners, riskDistribution, sdgAlignment, beneficiaryDemographics,
              budgetAllocation, avgDurationMonths, satisfactionScore, sankeyFlow
```

### Reports (`/api/reports`)
```
GET    /general           -- Status distribution, regional, temporal, enriched category breakdown
GET    /general/export    -- CSV or JSON export
GET    /impact            -- Beneficiary demographics, SDG alignment, impact distribution
GET    /impact/export     -- CSV or JSON export
GET    /financial         -- Budget utilization, expense breakdown, efficiency metrics, forecasts
GET    /financial/export  -- CSV or JSON export
```

### Users (`/api/users`)
```
GET    /                  -- List users (paginated, filters: search, role, status, sort)
GET    /stats             -- Role/department distribution, activity/new-user trends
GET    /:id               -- Single user with managed projects, team, activity
POST   /                  -- Create user (admin only)
PATCH  /:id               -- Update user (admin only)
DELETE /:id               -- Delete user (admin only, blocked if manages projects)
```

### Categories (`/api/categories`)
```
GET    /                  -- List categories (with project counts)
GET    /stats             -- Category statistics (budget, beneficiaries, ratings, trends, risk)
GET    /:id               -- Single category with enriched project data
GET    /:id/analytics     -- Per-category analytics (distribution, performance radar, growth trend)
POST   /                  -- Create (admin, manager)
PATCH  /:id               -- Update (admin, manager)
DELETE /:id               -- Delete (admin, manager; blocked if has projects)
```

### Partners (`/api/partners`)
```
GET    /                  -- List (enriched with live donation totals)
GET    /stats             -- Partner statistics
GET    /donations/leaderboard -- Top employee donors (rank, totalDonated, donationCount, months)
GET    /donations/stats   -- Donation statistics (total, thisMonth, thisYear, by type, trend)
GET    /donations/preferences -- Get user micro-donation preferences
PATCH  /donations/preferences -- Save user micro-donation preferences
GET    /donations/by-user -- Get donations made by authenticated user (grouped by project)
GET    /:id               -- Single partner with donation history
POST   /                  -- Create (admin, manager)
PATCH  /:id               -- Update (admin, manager)
DELETE /:id               -- Delete (admin only, cascade delete donations)
POST   /donations         -- Create donation (supports projectId, challengeId, partnerId)
-- Challenges --
GET    /challenges/current    -- Get current active challenge with stats
GET    /challenges/past       -- Get past challenges
GET    /challenges/:id/trend  -- Get donation trend for a challenge
POST   /challenges            -- Create challenge (admin, manager)
PATCH  /challenges/:id        -- Update challenge (admin, manager)
PATCH  /challenges/:id/finalize -- Finalize challenge with result (admin, manager)
POST   /challenges/:id/rewards -- Add reward to challenge (admin, manager)
DELETE /challenges/:id/rewards/:rid -- Remove reward (admin, manager)
```

### Ideas (`/api/ideas`)
```
GET    /stats             -- Idea statistics
GET    /leaderboard       -- Top idea contributors (ranked by votes received)
GET    /                  -- List ideas (paginated, filters: search, status, tab, sort)
GET    /:id               -- Single idea with votes + voter list
POST   /                  -- Submit idea (any authenticated)
PATCH  /:id               -- Update/change status (admin, manager for status)
DELETE /:id               -- Delete (owner or admin)
POST   /:id/vote          -- Toggle vote (any authenticated)
```

### Alerts (`/api/alerts`)
```
GET    /                  -- List alerts (paginated, filters: level, type, resolved)
GET    /stats             -- Alert statistics (total, unresolved, resolved, resolutionRate, trend)
PATCH  /:id/resolve       -- Mark alert resolved
DELETE /:id               -- Delete (admin only)
```

### Settings (`/api/settings`)
```
GET    /                  -- Get all settings
GET    /:key              -- Get single setting
PUT    /                  -- Bulk update (admin, manager)
PUT    /:key              -- Update single (admin, manager)
DELETE /:key              -- Delete (admin only)
```

### Notifications (`/api/notifications`)
```
GET    /                  -- List notifications + unreadCount
PATCH  /:id/read          -- Mark as read
POST   /read-all          -- Mark all as read
DELETE /:id               -- Delete notification
POST   /scan              -- Smart risk scanning + AI insights (admin, manager)
```

### Social Media (`/api/social-media`)
```
GET    /                  -- Internal engagement analytics + ESG metrics + SDG coverage + sentiment
```

### Future (`/api/future`)
```
GET    /                  -- Predictions, forecasts, recommendations, category insights, overall health
```

### AI Analytics (`/api/ai-analytics`)
```
GET    /models            -- List available models (14 GitHub Models)
POST   /analyze           -- AI analysis: question + scope + optional model -> AI response
POST   /analyze-alerts    -- AI alert analysis: question + riskType + alertIds -> risk analysis
POST   /simulate-solution -- Prescriptive: alertId + projectId -> 4-5 solution scenarios
POST   /trigger-audit     -- Manual Midnight Auditor trigger (admin, manager)
POST   /scenario-actions  -- Submit scenario for approval
GET    /scenario-actions   -- List all scenario actions (pending/approved/rejected)
PATCH  /scenario-actions/:id/approve -- Approve scenario (admin, manager)
PATCH  /scenario-actions/:id/reject  -- Reject scenario (admin, manager)
GET    /context           -- Raw DB context data (debug/testing)
```

### Activity Logs (`/api/activity-logs`)
```
GET    /                  -- List logs (admin, manager; filters: userId, projectId, entity, action, type, search, date)
GET    /stats             -- Log statistics (admin, manager)
```

### Upload (`/api/upload`)
```
POST   /:category         -- Upload single file (category: documents/media/avatars)
POST   /:category/multiple -- Upload multiple files (up to 10)
```

### Health (`/api`)
```
GET    /health            -- Health check (returns { status: 'ok', timestamp })
```

---

## 11. ROUTING ARCHITECTURE (Frontend)

### Provider Hierarchy
```
ErrorBoundary (with runtime error UI + "Return to Dashboard" button)
  +-- QueryClientProvider (staleTime: 5min, retry: 1, refetchOnWindowFocus: false)
      +-- ToastProvider
          +-- BrowserRouter (basename: VITE_BASE_PATH)
              +-- AppContent
                  +-- AuthInitializer (GET /auth/me on mount, always — cookie-based)
                  +-- Suspense (LoadingSpinner on dark bg)
                      +-- Routes
```

### Route Guard Logic

```typescript
PrivateRoute:     if (!user) -> Navigate to /login   // checks user, NOT accessToken
PublicOnlyRoute:  if (user)  -> Navigate to /dashboard
RootRedirect:     if (user)  -> /dashboard else -> /landing
```

### Route Tree
```
/ -> RootRedirect (dashboard if auth, landing if not)
/landing -> LandingPage (public)
/login -> PublicOnlyRoute -> Login
/register -> PublicOnlyRoute -> Register
/forgot-password -> PublicOnlyRoute -> ForgotPassword
/auth/callback -> OAuthCallback (no guard)
/dashboard -> PrivateRoute -> AppShell -> Dashboard
/projects -> AppShell -> ProjectsList
/projects/add -> AppShell -> AddProject
/projects/archived -> AppShell -> ArchivedProjects
/projects/edit/:id -> AppShell -> EditProject
/projects/:id -> AppShell -> ProjectDetails
/reports/general -> AppShell -> GeneralReports
/reports/impact -> AppShell -> ImpactReports
/reports/financial -> AppShell -> FinancialReports
/reports -> redirect to /reports/general
/admin/users -> AppShell -> UserManagement
/admin/categories -> AppShell -> CategoryManagement
/partners -> AppShell -> PartnersAndDonations
/ideas -> AppShell -> IdeasBox
/social-media -> AppShell -> SocialMediaAnalytics
/future -> AppShell -> FuturePortal
/early-warning -> AppShell -> EarlyWarning
/map -> AppShell -> MapView
/settings -> AppShell -> Settings
* -> AppShell -> NotFound
```

**Note:** AiSmartPage is NOT in App.tsx routes — it is accessed differently or used as an embedded component.

---

## 12. MIDDLEWARE EXECUTION ORDER (Backend)

```
1. helmet()                    -- Security headers (CSP, crossOriginResourcePolicy, referrerPolicy)
2. cors({ origin: ALLOWED_ORIGINS, credentials: true, allowedHeaders: X-CSRF-Token, maxAge: 600 })
3. apiRateLimit                -- 10,000 req / 15 min
4. express.json({ limit: 10mb }) -- Body parsing
5. cookieParser()              -- Parse cookies from requests
6. csrfProtection              -- Double-submit cookie CSRF validation (63 LOC, 10 exempt paths)
7. express.static('/uploads')  -- Serve uploaded files
8. Router-level middleware:
   a. authenticate             -- JWT from httpOnly cookie (fallback: Bearer header) + DB user lookup + getEffectiveRole
   b. requireRole([...])       -- RBAC check (per-route)
   c. requireProjectAccess     -- Object-Level Authorization (per-project-route)
   d. validate(zodSchema)      -- Zod input validation (per-route)
   e. Route handler            -- Business logic
9. errorHandler                -- Global error catch (Prisma/JWT/Zod mapping, prod sanitization)
```

---

## 13. LLM INSTRUCTION SET

### How to Think When Modifying This Project

**Architecture Rules:**
1. Frontend pages are in `frontend/src/pages/`. Each page is a single file, self-contained with its own state management via TanStack Query hooks defined inline.
2. API services are in `frontend/src/services/`. Each service file corresponds to a backend entity. Add new service functions here for new API calls.
3. Backend routes are in `backend/src/routes/`. Each route file is a standalone Express Router. Define Zod schemas at the top of the file, then endpoint handlers below.
4. Every write operation in backend routes should create an `ActivityLog` entry.
5. Database changes go through `backend/src/prisma/schema.prisma` then `npm run db:push` and `npm run db:generate`.

**Pattern Compliance:**
1. ALL responses follow `{ success: boolean, data?: any, error?: { code, message } }` format.
2. Pagination format: `{ data, meta: { total, page, limit, totalPages } }`.
3. Auth is via httpOnly cookies (`withCredentials: true`). CSRF token auto-attached from `csrf_token` cookie. Never pass tokens manually.
4. TanStack Query keys follow pattern: `['entity']` for lists, `['entity', id]` for singles.
5. Use `queryClient.invalidateQueries({ queryKey: ['entity'] })` after mutations.
6. Zustand stores are minimal — only auth state and UI preferences. Page-level state uses TanStack Query or local useState.
7. Theme colors come from `theme/colors.ts` via `useTheme()` and `useColors()` hooks — not hardcoded.

**When Adding a New Page:**
1. Create page component in `frontend/src/pages/`
2. Add lazy import in `App.tsx`
3. Add `<Route>` inside the AppShell PrivateRoute block in `App.tsx`
4. Add sidebar navigation link in `frontend/src/components/layout/Sidebar.tsx`
5. Create service file in `frontend/src/services/` if new API calls needed

**When Adding a New API Endpoint:**
1. Add handler in appropriate `backend/src/routes/[entity].ts`
2. Define Zod validation schema at top of file
3. Apply middleware: `authenticate`, `requireRole([...])`, `validate(schema)`
4. Use `prisma` from `config/database.ts`
5. Create ActivityLog entry for write operations
6. Return standard response format

**When Modifying the Database:**
1. Edit `backend/src/prisma/schema.prisma`
2. Add `@@index` on any new FK fields
3. Use `onDelete: Cascade` for child entities
4. Run `npm run db:push && npm run db:generate`
5. Update seed.ts if new required fields added

**Critical Pitfalls:**
- Auth is cookie-based (httpOnly) — frontend NEVER reads/stores real JWT tokens. `accessToken: 'cookie'` in Zustand is a marker only
- CSRF: every state-changing request must include `X-CSRF-Token` header matching `csrf_token` cookie. `api.ts` interceptor handles this automatically
- Route guards (`PrivateRoute`/`PublicOnlyRoute`) check `user` object, NOT `accessToken` — since token is in httpOnly cookie, JS can't read it
- `AuthInitializer` always calls `/auth/me` on mount (no conditional on accessToken) — cookie presence is the auth signal
- Refresh tokens use rotation: old token deleted on use, new pair issued. DB stores SHA-256 hash, not raw token
- Sidebar logout calls `POST /auth/logout` to revoke DB tokens + clear cookies before clearing Zustand state
- OAuth callbacks set cookies server-side and redirect to `/auth/callback` with NO tokens in URL params
- University emails (`@gcet.edu.om`) auto-get admin role on register, OAuth, AND every authenticated request via `getEffectiveRole()` — configurable via `UNIVERSITY_EMAIL_DOMAINS` env
- `Settings.value` is a String column — always `JSON.stringify()` on write, `JSON.parse()` on read
- `Partner.projectsCount` is denormalized — API overrides it with live counts, don't trust the stored value
- Project deletion is SOFT DELETE (sets status to archived), not actual DELETE
- Project restore always sets status to `planning`, not the previous status
- Dashboard project count includes archived — this is a known inconsistency
- `future.ts` uses simple math for predictions; real AI is in `aiAnalyticsService.ts` via ZenMux AI Gateway
- GitHub Models requires a Classic PAT (`ghp_` prefix) — fine-grained tokens (`github_pat_`) do NOT work
- AI Analytics gracefully degrades: GitHub Models -> retry pool (14 models) -> local fallback engine
- Expense `spent` must always filter `status: 'approved'`
- Zod versions are aligned at v3 across both frontend and backend — schemas use v3 API
- Project status transitions are validated server-side (planning->active->completed, etc.) — invalid transitions return 400
- Object-Level Authorization: employee/viewer can only access projects they manage or are team members of
- Framer Motion animations with `useInView` may cause `opacity: 0` if ref not in viewport — prefer `animate` directly on mount
- Seed data has ALL expenses dated March 2026 — backend generates distributed trends to avoid flat charts
- CategoryManagement budget uses `??` not `||` — `0` is valid, `||` would use fallback incorrectly
- `server.ts` validates required env vars at startup (fail-fast) and warns on short JWT secrets
- Midnight Auditor cron triggers at 00:00 Asia/Muscat timezone — registered on server start
- ScenarioAction approval sends email notification via emailService (Resend > SMTP > console.log)
- Express 5 is used (v5.1.0) — route handler signatures may differ from Express 4 docs
- Frontend uses `BrowserRouter` with configurable `basename` via `VITE_BASE_PATH` for Codespaces/subdirectory deployment
- `ErrorBoundary` in App.tsx catches React errors and shows UI to return to dashboard
- Prisma `onDelete: SetNull` on Donation.challengeId — deleting a challenge nullifies the FK (doesn't cascade)

**File Size Guidelines:**
- Pages over 1000 LOC should be considered for splitting into sub-components
- Currently 15 pages exceed 1000 LOC — this is acceptable for now but watch for growth
- The largest file is `Dashboard.tsx` at 2,977 LOC

---

## 14. IMPROVEMENT RECOMMENDATIONS (Priority-Ranked)

### Critical (All Resolved)

| # | Recommendation | Status |
|---|---------------|--------|
| ~~1~~ | ~~Move JWT from localStorage to httpOnly cookie~~ | **DONE (Phase 5)** |
| ~~2~~ | ~~Add CSRF protection~~ | **DONE (Phase 5)** |
| ~~3~~ | ~~Implement object-level authorization~~ | **DONE (Phase 5)** |
| ~~4~~ | ~~Add password complexity requirements~~ | **DONE (Phase 5)** |

### High (Fix Soon)

| # | Recommendation | Impact |
|---|---------------|--------|
| 8 | Create shared type package between FE/BE | Prevents type drift and ensures contract conformity |
| 10 | Filter archived projects from dashboard count | Fixes data inconsistency |

### Medium (Plan For)

| # | Recommendation | Impact |
|---|---------------|--------|
| 11 | Split large page components (Dashboard 2977 LOC, EarlyWarning 2472 LOC) | Maintainability |
| 14 | Change `Settings.value` to `Json` type in Prisma | Eliminates JSON.parse workaround |
| 17 | Store original status before archive for proper restore | Better UX |
| 18 | Add indexes on `Expense.approvedBy` if used in queries | Performance |
| 23 | Convert `Expense.approvedBy` to proper FK relation | Data integrity |

### Low (Nice to Have)

| # | Recommendation | Impact |
|---|---------------|--------|
| 19 | Add E2E tests (Playwright/Cypress) | Quality assurance |
| 20 | Remove unused frontend deps (vanilla-tilt, tsparticles if not critical) | Bundle size |
| 21 | Implement real WebSocket for notifications | Replace 30s polling |
| 22 | Add request/response logging middleware | Debugging |

---

## 15. CODEBASE METRICS

| Metric | Value |
|--------|-------|
| Total source files | ~230 |
| Total lines of code | ~65,000 |
| Frontend LOC | ~54,500 |
| Backend LOC | ~10,600 |
| Prisma models | 23 |
| Prisma enums | 8 |
| API endpoints | 125+ |
| Frontend pages | 25 |
| Frontend components | 46 |
| Frontend services | 22 |
| Frontend hooks | 2 |
| Zustand stores | 2 |
| Backend route files | 18 |
| Backend middleware | 8 |
| Backend services | 5 |
| Backend jobs | 1 (Midnight Auditor) |
| Largest file | Dashboard.tsx (2,977 LOC) |
| Files over 1000 LOC | 15 (pages) + 2 (utils) |
| Files over 500 LOC | 21 |
| System Maturity Score | 97/100 |

---

*Generated by 20-agent deep analysis protocol. Supersedes all previous documentation.*
*Phase 2 surgical update: 2026-03-03 — deduplication, state hardening, Zod sync.*
*Phase 3 update: 2026-03-07 — AI Analytics via GitHub Models, 14 verified models, bilingual prompt.*
*Phase 4 update: 2026-03-09 — Animation visibility fixes, CategoryManagement real data, flat trend chart fixes.*
*Phase 5 security update: 2026-03-13 — httpOnly cookies, CSRF, OLA, DB refresh tokens, Zod PATCH validation, university admin, account lockout, password complexity.*
*Phase 6 feature update: 2026-03-14 — Challenge system, donation preferences, smart notifications, GDPR export, upload security, CORS fix, landing restructure, map enrichment.*
*Phase 7 comprehensive update: 2026-04-16 — Prescriptive analytics, ScenarioAction model (23rd), Midnight Auditor cron, alert analysis, contact route, AI Smart page, impact AlertType, risk service expansion, email multi-provider, Express 5, 3D rendering, startup validation, 65K LOC total.*
*Phase 8 AI update: 2026-04-16 — Migrated from GitHub Models to ZenMux AI Gateway (13 models). Multi-agent pipeline: 3 parallel agents (Financial/DeepSeek-R1, Impact/Gemini-2.5-Flash, Risk/Claude-Sonnet-4) + Grand Master (GPT-4o). New: useTypewriter hook, AgentCard/MasterReport/GeneratingLoader components. Updated FuturePortal AI tab, EarlyWarning AI advisor, Dashboard BentoChatCell with agent cards + typewriter.*
*Path: `c:\CSR-FINAL-PROJECT\CLAUDE.md`*
