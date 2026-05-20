# ZenMax — Security & AI Agent Pipeline
# Code Reference for Presentation

---

## PART 1 — SECURITY

---

### 1. JWT — Token Creation
**File:** [backend/src/utils/jwt.ts](backend/src/utils/jwt.ts) — Lines 11-21

```typescript
// Access Token — expires in 15 minutes
export function signAccessToken(payload: object): string {        // L11
  return jwt.sign(payload, getSecret('JWT_SECRET'), { expiresIn: '15m' });
}

// Refresh Token — expires in 7 days
export function signRefreshToken(payload: object): string {       // L15
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), { expiresIn: '7d' });
}

// Verify token — throws error if expired or tampered
export function verifyToken(token: string, secret: string) {      // L19
  return jwt.verify(token, secret) as jwt.JwtPayload;
}
```

> عندنا access token يعيش 15 دقيقة، وrefresh token يعيش 7 أيام. إذا انتهى الـ access token، الـ refresh token يجيب واحد جديد بدون ما يسجل المستخدم دخول مرة ثانية.

---

### 2. JWT — Secure Cookie Storage
**File:** [backend/src/routes/auth.ts](backend/src/routes/auth.ts) — Lines 37-56

```typescript
function setTokenCookies(res, accessToken, refreshToken) {   // L37
  res.cookie('access_token', accessToken, {
    httpOnly: true,   // JavaScript cannot read this cookie   // L43
    secure: IS_PROD,  // HTTPS only in production
    sameSite: IS_PROD ? 'none' : 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes                   // L46
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days              // L53
    path: '/api/auth', // Only sent to auth endpoints
  });
}
```

> التوكن يتحفظ في httpOnly cookie — يعني JavaScript في المتصفح ما يقدر يقرأه. هذا يحمي من هجوم XSS.

---

### 3. SHA-256 — Refresh Token Hashing
**File:** [backend/src/routes/auth.ts](backend/src/routes/auth.ts) — Lines 63-68

```typescript
async function storeRefreshToken(userId, refreshToken) {     // L63
  // Never store the raw token — store its SHA-256 hash
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');                                          // L64

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: ... },
  });
}
```

> ما نحفظ الـ refresh token في قاعدة البيانات مباشرة. نحفظ فقط الـ hash — حتى لو اختُرقت قاعدة البيانات، ما أحد يقدر يستخدم التوكن.

---

### 4. BCrypt — Password Hashing & Comparison
**File:** [backend/src/routes/auth.ts](backend/src/routes/auth.ts) — Lines 181 & 229

```typescript
// Register — hash the password before saving              // L181
const hashed = await bcrypt.hash(password, 12);
await prisma.user.create({ data: { password: hashed } });

// Login — compare entered password to stored hash         // L229
const valid = await bcrypt.compare(password, user.password);
if (!valid) {
  recordFailedLogin(email);
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

> الباسورد ما يتحفظ كنص — يتحول لـ hash. حتى لو سُرقت قاعدة البيانات، ما أحد يعرف الباسورد الأصلي.

---

### 5. Password Complexity Validation — Zod
**File:** [backend/src/routes/auth.ts](backend/src/routes/auth.ts) — Lines 111-116

```typescript
const passwordSchema = z.string()                          // L111
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'At least one uppercase letter')
  .regex(/[a-z]/, 'At least one lowercase letter')
  .regex(/[0-9]/, 'At least one digit')
  .regex(/[^A-Za-z0-9]/, 'At least one special character'); // L116
```

> Zod يتحقق من الباسورد قبل ما يوصل لقاعدة البيانات — يجب أن يحتوي على حرف كبير وصغير ورقم ورمز خاص.

---

### 6. Account Lockout — Brute Force Protection
**File:** [backend/src/routes/auth.ts](backend/src/routes/auth.ts) — Lines 89-104

```typescript
const MAX_FAILED_ATTEMPTS = 5;                             // L83
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min     // L84

function checkAccountLockout(email: string): boolean {     // L89
  const record = failedAttempts.get(email);
  if (record?.count >= MAX_FAILED_ATTEMPTS) {
    if (Date.now() - record.lastAttempt < LOCKOUT_DURATION_MS)
      return true; // Still locked
  }
  return false;
}

function recordFailedLogin(email: string): void {          // L99
  const record = failedAttempts.get(email) || { count: 0 };
  record.count += 1;
  failedAttempts.set(email, record);
}
```

> بعد 5 محاولات خاطئة، الحساب يتقفل 15 دقيقة تلقائياً — يمنع brute force attacks.

---

### 7. Authentication Middleware — JWT Verification
**File:** [backend/src/middleware/auth.middleware.ts](backend/src/middleware/auth.middleware.ts) — Lines 6-65

```typescript
export async function authenticate(req, res, next) {       // L6
  const token = req.cookies?.access_token                  // L8
             || req.headers.authorization?.slice(7);

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  // Reject suspiciously long tokens (attack prevention)
  if (token.length > 2048) return res.status(401).json({ error: 'Invalid' }); // L22

  const payload = verifyToken(token, process.env.JWT_SECRET); // L38

  // Check user still exists and is active in DB
  const user = await prisma.user.findUnique({ where: { id: payload.id } }); // L41
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Token is no longer valid' });      // L46
  }

  req.user = user;
  next();
}
```

> كل request يمر من هنا أول. يتحقق من التوكن وأيضاً يتحقق أن المستخدم لا يزال موجوداً ونشطاً في قاعدة البيانات.

---

### 8. RBAC — Role-Based Access Control
**File:** [backend/src/middleware/rbac.middleware.ts](backend/src/middleware/rbac.middleware.ts) — Lines 3-10

```typescript
export function requireRole(roles: string[]) {             // L3
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' }); // L6
    }
    next();
  };
}

// Usage in routes:
router.delete('/users/:id', authenticate, requireRole(['admin']), deleteUser);
router.post('/projects',    authenticate, requireRole(['admin', 'manager']), createProject);
```

> كل endpoint يحدد من يقدر يوصله. مثلاً حذف مستخدم — admin فقط. إضافة مشروع — admin أو manager.

---

### 9. Helmet — HTTP Security Headers
**File:** [backend/src/app.ts](backend/src/app.ts) — Lines 35-47

```typescript
app.use(helmet({                                           // L35
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],   // Only load from our domain
      scriptSrc:  ["'self'"],   // No external scripts       // L39
      imgSrc:     ["'self'", 'data:', 'blob:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // L46
}));

app.disable('x-powered-by'); // Hide that we use Express   // L33
```

> Helmet يضيف security headers لكل response ويخفي أن الـ backend مبني على Express.

---

### 10. CORS — Origin Allowlist
**File:** [backend/src/app.ts](backend/src/app.ts) — Lines 50-66

```typescript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS.split(','); // L50

app.use(cors({                                             // L54
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);  // Allow                      // L57
    } else {
      callback(new Error('Not allowed by CORS'));  // Block // L59
    }
  },
  credentials: true, // Allow cookies to be sent
}));
```

> فقط الـ origins المصرّح بها تقدر تتواصل مع الـ backend. أي موقع ثاني يُرفض تلقائياً.

---

### 11. CSRF Protection
**File:** [backend/src/middleware/csrf.middleware.ts](backend/src/middleware/csrf.middleware.ts) — Lines 29-64

```typescript
export function csrfProtection(req, res, next) {           // L29
  // Set CSRF token in a readable cookie
  if (!req.cookies?.csrf_token) {
    const csrfToken = crypto.randomBytes(32).toString('hex'); // L33
    res.cookie('csrf_token', csrfToken, { httpOnly: false });
  }

  // For POST/PATCH/PUT/DELETE — verify header matches cookie
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) { // L46
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.csrf_token;

    if (!headerToken || headerToken !== cookieToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' }); // L55
    }
  }
  next();
}
```

> يحمي من هجوم CSRF — موقع ثاني ما يقدر يرسل request بدون ما يعرف الـ token.

---

### 12. Rate Limiting
**File:** [backend/src/middleware/rateLimit.ts](backend/src/middleware/rateLimit.ts) — Lines 4-22

```typescript
// General API — 10,000 requests per 15 min              // L4
export const apiRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000 });

// Login/Register — max 20 attempts per 15 min           // L7
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts.',
});

// Password Reset — max 5 attempts per 10 min            // L16
export const resetCodeRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many verification attempts.',
});
```

> ثلاثة مستويات من الحماية — API عام، صفحة الدخول، وإعادة تعيين الباسورد.

---

### 13. Email Domain Validation
**File:** [backend/src/routes/auth.ts](backend/src/routes/auth.ts) — Lines 25-28

```typescript
const ALLOWED_DOMAINS = ['gcet.edu.om'];                  // L17

function isEmailAllowed(email: string): boolean {         // L25
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);                // L27
}

// Used on register (L169) and login (L209):
if (!isEmailAllowed(email)) {
  return res.status(403).json({ error: 'Only university emails allowed' });
}
```

> فقط emails تنتهي بـ gcet.edu.om تقدر تسجل أو تدخل.

---
---

## PART 2 — AI AGENT PIPELINE

---

### 14. Agent Model Definitions
**File:** [backend/src/services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) — Lines 94-99

```typescript
export const AGENT_MODELS = {           // L94
  financial: 'deepseek/deepseek-reasoner',
  impact:    'google/gemini-3.1-pro-preview',
  risk:      'anthropic/claude-sonnet-4.6',
  master:    'anthropic/claude-opus-4.6',
} as const;                             // L99
```

> كل وكيل له نموذج AI مختلف متخصص في مجاله.

---

### 15. Agent Prompts — Specialization
**File:** [backend/src/services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) — Lines 897-916

```typescript
const AGENT_PROMPTS = {                                    // L897
  financial: (data) => `
    You are "Financial Analyst Agent".
    Analyze ONLY financial aspects — budgets, ROI, expenses.
    Reply ONLY with JSON: { analysis, keyFindings, recommendations, chartData }
    LIVE DATA: ${data}
  `,
  impact: (data) => `                                      // L904
    You are "Impact Strategist Agent".
    Analyze ONLY impact/beneficiary aspects — SDG alignment, social outcomes.
    Reply ONLY with JSON: { analysis, keyFindings, sdgConnections }
    LIVE DATA: ${data}
  `,
  risk: (data) => `                                        // L910
    You are "Risk Assessor Agent".
    Prioritize: critical > high > medium > low.
    Reply ONLY with JSON: { analysis, keyFindings, recommendations }
    LIVE DATA: ${data}
  `,
};
```

> كل وكيل يحصل على prompt مختلف يحدد تخصصه ويرد بـ JSON فقط.

---

### 16. Parallel Execution — Promise.all
**File:** [backend/src/services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) — Lines 931-976

```typescript
async function runAgentPipeline(contextData, question) {   // L918

  const agentDefs = [                                      // L924
    { id: 'financial', name: 'Financial Analyst', model: AGENT_MODELS.financial },
    { id: 'impact',    name: 'Impact Strategist',  model: AGENT_MODELS.impact    },
    { id: 'risk',      name: 'Risk Assessor',      model: AGENT_MODELS.risk      },
  ];

  // Run all 3 agents at the same time
  const agentPromises = agentDefs.map(async (agent) => {   // L931
    const prompt = AGENT_PROMPTS[agent.id](dataJson);
    const { content } = await callZenMux(prompt, question, agent.model); // L934
    return parseAiResponse(content);
  });

  // Wait for ALL 3 to finish together
  const agents = await Promise.all(agentPromises);         // L976
}
```

> الـ 3 وكلاء يشتغلون في نفس الوقت بدل واحد بعد الثاني. هذا يوفر الوقت — بدل 3x الوقت، يخلص بـ 1x.

---

### 17. Master Synthesizer
**File:** [backend/src/services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) — Lines 984-1014

```typescript
const masterPrompt = `                                     // L984
  You are the "Grand Master Synthesizer".
  Three specialist agents analyzed the same question.
  Your job:
  1. Synthesize their findings into one unified executive summary
  2. Resolve any contradictions between agents
  3. Prioritize the most actionable recommendations
  4. Create 2-3 comprehensive charts

  AGENT REPORTS: ${agentSummaries}                        // L995
  ORIGINAL QUESTION: ${question}
  LIVE DATA: ${dataJson}
`;

const { content } = await callZenMux(                     // L1003
  masterPrompt, question, AGENT_MODELS.master             // claude-opus-4.6
);
const masterReport = parseAiResponse(content);            // L1009
```

> بعد ما الـ 3 وكلاء ينهون، Claude Opus يقرأ كل تقاريرهم ويدمجها في تقرير واحد موحد.

---

### 18. ZenMux Gateway — AI Router
**File:** [backend/src/services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) — Line 357

```typescript
async function callZenMux(systemPrompt, userMessage, model) { // L357
  const response = await fetch('https://zenmux.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ZENMUX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      temperature: 0.3,  // Low = analytical, consistent output
      max_tokens: 4096,
    }),
  });
  return { content: data.choices[0].message.content, modelUsed: model };
}
```

> ZenMux هو gateway يوجّه الـ requests لأي AI model بنفس الـ API — DeepSeek أو Gemini أو Claude.

---

### 19. Fallback System — If AI Fails
**File:** [backend/src/services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts)

```typescript
const FREE_MODELS = [
  'openai/gpt-4o-mini',
  'deepseek/deepseek-chat',
  'google/gemini-2.5-flash',
];

for (const model of FREE_MODELS) {
  try {
    return await callZenMux(prompt, question, model); // Try each model
  } catch {
    continue; // If it fails, try next
  }
}

// If ALL models fail — local analysis from DB, no AI
return generateLocalAnalysis(contextData, question);
```

> إذا فشل النموذج يجرب الثاني، ثم الثالث. إذا فشلت كلها النظام يولّد تحليل محلي. لا يتوقف أبداً.

---

## QUICK REFERENCE

| الموضوع | الملف | اللاين |
|---|---|---|
| JWT sign & verify | [utils/jwt.ts](backend/src/utils/jwt.ts) | L11 – L21 |
| Cookie storage | [routes/auth.ts](backend/src/routes/auth.ts) | L37 – L56 |
| SHA-256 hash | [routes/auth.ts](backend/src/routes/auth.ts) | L63 – L68 |
| BCrypt hash | [routes/auth.ts](backend/src/routes/auth.ts) | L181 |
| BCrypt compare | [routes/auth.ts](backend/src/routes/auth.ts) | L229 |
| Password validation | [routes/auth.ts](backend/src/routes/auth.ts) | L111 – L116 |
| Account lockout | [routes/auth.ts](backend/src/routes/auth.ts) | L83 – L104 |
| Auth middleware | [middleware/auth.middleware.ts](backend/src/middleware/auth.middleware.ts) | L6 – L65 |
| RBAC roles | [middleware/rbac.middleware.ts](backend/src/middleware/rbac.middleware.ts) | L3 – L10 |
| Helmet + CORS | [app.ts](backend/src/app.ts) | L35, L54 |
| CSRF | [middleware/csrf.middleware.ts](backend/src/middleware/csrf.middleware.ts) | L29 – L64 |
| Rate limiting | [middleware/rateLimit.ts](backend/src/middleware/rateLimit.ts) | L4 – L22 |
| Email domain | [routes/auth.ts](backend/src/routes/auth.ts) | L25 – L28 |
| Agent models | [services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) | L94 – L99 |
| Agent prompts | [services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) | L897 – L916 |
| Parallel execution | [services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) | L931 – L976 |
| Master synthesizer | [services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) | L984 – L1014 |
| ZenMux gateway | [services/aiAnalyticsService.ts](backend/src/services/aiAnalyticsService.ts) | L357 |
