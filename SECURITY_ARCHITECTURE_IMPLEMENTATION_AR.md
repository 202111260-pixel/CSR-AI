# شرح تطبيق الحماية في موقعك (من الكود الفعلي)

هذا الملف يشرح لك نفس مخطط الحماية الذي أرسلته، لكن بطريقة بسيطة جدًا، ومع كل نقطة يوجد كود حقيقي من مشروعك.

---

## 1) Layer 1: Transport Security (Helmet + CORS + Cookies)

### 1.1 Helmet + CSP
الكود من `backend/src/app.ts`:

```ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

الشرح:
- هذا يمنع أغلب تحميل الأكواد/الملفات من مصادر خارجية غير موثوقة.
- يقلل احتمالات هجمات XSS.
- يحسن حماية معلومات الإحالة (Referrer).

### 1.2 CORS Allowlist (بدون wildcard)
الكود من `backend/src/app.ts`:

```ts
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
```

الشرح:
- فقط الدومينات الموجودة في `ALLOWED_ORIGINS` تستطيع استدعاء API.
- `credentials: true` يسمح بإرسال الكوكيز الآمنة.

### 1.3 Cookie Flags (httpOnly / sameSite / secure)
الكود من `backend/src/routes/auth.ts`:

```ts
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
  path: '/',
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
});
```

الشرح:
- `httpOnly`: جافاسكربت في المتصفح لا يستطيع قراءة التوكن.
- `sameSite: strict`: يقلل هجمات CSRF.
- `secure`: الكوكيز تنتقل عبر HTTPS فقط في الإنتاج.

---

## 2) Layer 2: Rate Limiting

الكود من `backend/src/middleware/rateLimit.ts`:

```ts
export const apiRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000 });

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

export const resetCodeRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
});

export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});
```

الشرح:
- يحدد عدد الطلبات لمنع الإغراق (DDoS) ومحاولات التخمين.
- عند تجاوز الحد، السيرفر يرجع `429 Too Many Requests`.

---

## 3) Layer 3: CSRF Protection (Double-Submit Cookie)

### 3.1 السيرفر ينشئ csrf_token
الكود من `backend/src/middleware/csrf.middleware.ts`:

```ts
if (!req.cookies?.csrf_token) {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}
```

الشرح:
- السيرفر ينشئ قيمة عشوائية ويضعها في كوكي `csrf_token`.
- هذا الكوكي ليس `httpOnly` لأن الواجهة تحتاج قراءته وإرساله في الهيدر.

### 3.2 الواجهة ترسل X-CSRF-Token
الكود من `frontend/src/services/api.ts`:

```ts
api.interceptors.request.use((config) => {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

الشرح:
- أي طلب تعديل (POST/PATCH/PUT/DELETE) يرسل توكن CSRF تلقائيًا.

### 3.3 السيرفر يتحقق من تطابق القيمتين
الكود من `backend/src/middleware/csrf.middleware.ts`:

```ts
const headerToken = req.headers['x-csrf-token'] as string;
const cookieToken = req.cookies?.csrf_token;

if (!headerToken || !cookieToken || headerToken !== cookieToken) {
  return res.status(403).json({
    success: false,
    error: { code: 'CSRF_FAILED', message: 'Invalid or missing CSRF token' },
  });
}
```

الشرح:
- إذا القيمة في الهيدر لا تساوي القيمة في الكوكي، يتم رفض الطلب مباشرة.

---

## 4) Layer 4: Authentication (JWT + Refresh Rotation + Lockout)

### 4.1 JWT مدد الصلاحية
الكود من `backend/src/utils/jwt.ts`:

```ts
export function signAccessToken(payload: object): string {
  return jwt.sign(payload, getSecret('JWT_SECRET'), { expiresIn: '15m' });
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), { expiresIn: '7d' });
}
```

الشرح:
- Access Token قصير (15 دقيقة).
- Refresh Token أطول (7 أيام).

### 4.2 Refresh Token في قاعدة البيانات (هاش SHA-256)
الكود من `backend/src/routes/auth.ts`:

```ts
async function storeRefreshToken(userId: string, refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
}
```

والجدول من `backend/src/prisma/schema.prisma`:

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

الشرح:
- لا يتم حفظ التوكن الخام في قاعدة البيانات، بل هاش فقط.
- هذا يسمح بإبطال التوكنات (revocation) عند logout أو الاختراق.

### 4.3 Token Rotation
الكود من `backend/src/routes/auth.ts`:

```ts
await prisma.refreshToken.delete({ where: { id: storedToken.id } });

const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: effectiveRole });
const newRefreshToken = signRefreshToken({ id: user.id, email: user.email, role: effectiveRole });
await storeRefreshToken(user.id, newRefreshToken);

setTokenCookies(res, newAccessToken, newRefreshToken);
```

الشرح:
- كل مرة تسوي refresh: التوكن القديم يُحذف، ويطلع زوج جديد.
- هذا يقلل خطر إعادة استخدام توكن مسروق.

### 4.4 Account Lockout
الكود من `backend/src/routes/auth.ts`:

```ts
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

if (checkAccountLockout(email)) {
  return res.status(429).json({
    success: false,
    error: { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' }
  });
}
```

الشرح:
- بعد 5 محاولات فاشلة، الحساب ينقفل 15 دقيقة.
- هذا يوقف هجمات تخمين كلمة المرور.

---

## 5) Layer 5: Authorization (RBAC + OLA + University Override)

### 5.1 RBAC (صلاحيات حسب الدور)
الكود من `backend/src/middleware/rbac.middleware.ts`:

```ts
export function requireRole(roles: string[]) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}
```

الشرح:
- كل endpoint حساس يحدد من يقدر ينفذه (`admin`, `manager`, ...).

### 5.2 OLA (صلاحية على نفس المشروع)
الكود من `backend/src/middleware/projectAccess.middleware.ts`:

```ts
if (user.role === 'admin' || user.role === 'manager') {
  return next();
}

const [isManager, isTeamMember] = await Promise.all([
  prisma.project.count({ where: { id: projectId, managerId: user.id } }),
  prisma.projectTeam.count({ where: { projectId, userId: user.id } }),
]);

if (isManager > 0 || isTeamMember > 0) {
  return next();
}

return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this project' } });
```

الشرح:
- الموظف/المشاهد لا يمكنه فتح أي مشروع إلا لو كان مديره أو ضمن فريقه.

### 5.3 University Auto-Admin Override
الكود من `backend/src/utils/effectiveRole.ts`:

```ts
export function getEffectiveRole(email: string, role: AppRole): AppRole {
  if (isUniversityEmail(email)) return 'admin';
  return role;
}
```

الشرح:
- إذا الإيميل تابع للدومين الجامعي المحدد، النظام يرفعه Admin تلقائيًا.

---

## 6) Layer 6: Input Validation (Zod + Password + Upload Security)

### 6.1 Zod Validation
الكود من `backend/src/middleware/validate.middleware.ts`:

```ts
const result = schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: result.error.flatten().fieldErrors },
  });
}
req.body = result.data;
```

الشرح:
- أي بيانات غلط أو ناقصة يتم رفضها قبل الوصول لمنطق العمل.

### 6.2 Password Complexity
الكود من `backend/src/routes/auth.ts`:

```ts
const passwordSchema = z.string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);
```

الشرح:
- كلمة المرور لازم تحتوي: حرف كبير + حرف صغير + رقم + رمز خاص.

### 6.3 File Upload Security
الكود من `backend/src/middleware/upload.middleware.ts`:

```ts
const BLOCKED_EXTENSIONS = /\.(exe|sh|bat|cmd|ps1|vbs|js|php|asp|aspx|jsp|py|rb|pl|cgi|com|scr|pif|msi|dll)$/i;

if (BLOCKED_EXTENSIONS.test(file.originalname)) {
  return cb(new Error('File type not allowed'));
}

if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
  return cb(new Error(`File type not allowed for ${category}. Allowed: ${allowedExts.join(', ')}`));
}
```

الشرح:
- يمنع الملفات الخطيرة حتى لو حاول شخص يغير اسمها.
- يعتمد على نوع الملف (MIME) + الامتداد معًا.

---

## 7) Layer 7: Data Protection

### 7.1 Password Hashing + Salt rounds
الكود من `backend/src/routes/auth.ts`:

```ts
const hashed = await bcrypt.hash(password, 12);
```

الشرح:
- لا يتم حفظ كلمة المرور كنص واضح.
- يتم حفظها بشكل مشفر hashing مع تكلفة `12`.

### 7.2 Timing-Safe Comparison
الكود من `backend/src/routes/auth.ts`:

```ts
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}
```

الشرح:
- يقلل هجمات timing attacks أثناء مقارنة الأكواد السرية.

### 7.3 Error Message Sanitization
الكود من `backend/src/middleware/errorHandler.ts`:

```ts
const message = process.env.NODE_ENV === 'production'
  ? 'An unexpected error occurred'
  : (err.message || 'An unexpected error occurred');
```

الشرح:
- في الإنتاج: المستخدم لا يرى تفاصيل حساسة عن الخطأ الداخلي.

### 7.4 Token Length Validation
الكود من `backend/src/middleware/auth.middleware.ts`:

```ts
if (token.length > 2048) {
  return res.status(401).json({
    success: false,
    error: { code: 'INVALID_TOKEN', message: 'Token is invalid' },
  });
}
```

الشرح:
- يمنع التوكنات غير الطبيعية (محاولات هجوم أو حقن).

---

## 8) Layer 8: Audit & Compliance

### 8.1 Activity Logs على العمليات الكتابية
مثال من `backend/src/routes/projects.ts`:

```ts
await prisma.activityLog.create({
  data: {
    userId: req.user!.id,
    projectId: project.id,
    action: 'create',
    entity: 'project',
    entityId: project.id,
    details: `Created project: ${project.name}`,
    type: 'create',
  },
});
```

الشرح:
- كل عملية مهمة (إنشاء/تعديل...) يتم تسجيلها للمتابعة والتدقيق.

### 8.2 GDPR-style Data Export
الكود من `backend/src/routes/auth.ts`:

```ts
router.get('/me/export', authenticate, async (req: Request, res: Response) => {
  // يرجع بيانات المستخدم + التبرعات + الأفكار + السجلات + المشاريع + التقييمات
});
```

الشرح:
- المستخدم يقدر يصدّر بياناته الشخصية من النظام.

### 8.3 Account Self-Deletion
الكود من `backend/src/routes/auth.ts`:

```ts
router.delete('/me', authenticate, validate(deleteMeSchema), async (req: Request, res: Response) => {
  const { password } = req.body;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Password is incorrect' } });
  }
  // بعدها يتم حذف/إخفاء بيانات الحساب
});
```

الشرح:
- حذف الحساب يحتاج تأكيد كلمة المرور.
- هذا يحمي الحساب من الحذف غير المقصود أو الخبيث.

---

## ملاحظات مهمة لك (غير برمجية)

- أنت بالفعل مطبق منظومة أمان قوية جدًا في مشروعك.
- أهم نقطة: لا تغيّر إعدادات الكوكيز أو CSRF أو rate limit بدون اختبار.
- إذا تريد، أقدر أعمل لك نسخة ثانية من هذا الملف على شكل "Checklist" تشغيل يومي (سهل جدًا للإدارة والمتابعة).