# 🚀 دليل تشغيل منصة المسؤولية الاجتماعية (CSR Platform)

> دليل مبسّط خطوة بخطوة — انسخ الأوامر والصقها في Terminal مباشرة.

---

## 📋 المتطلبات الأساسية (ثبّتها أولًا)

| البرنامج | الإصدار المطلوب | رابط التحميل |
|----------|----------------|-------------|
| **Node.js** | 18 أو أعلى | https://nodejs.org/ (اختر LTS) |
| **PostgreSQL** | 17 | https://www.postgresql.org/download/ |
| **Git** | أي إصدار | https://git-scm.com/downloads |

> **ملاحظة:** إذا كنت تستخدم **GitHub Codespaces** فكل شيء مثبّت مسبقًا ✅

---

## 🔽 الخطوة 1: تحميل المشروع

افتح Terminal (أو Command Prompt في Windows) والصق:

```bash
git clone https://github.com/202111260-pixel/csr-final-project.git
```

ثم ادخل مجلد المشروع:

```bash
cd csr-final-project
```

---

## 🗄️ الخطوة 2: إعداد قاعدة البيانات (PostgreSQL)

### إذا PostgreSQL مثبّت محليًا:

1. افتح **pgAdmin** أو Terminal وأنشئ قاعدة بيانات:

```sql
CREATE DATABASE csr_db;
```

2. تأكد إن اسم المستخدم وكلمة المرور يطابقون اللي في الخطوة 3.

### إذا تستخدم GitHub Codespaces:

PostgreSQL يعمل تلقائيًا — تخطَّ هذه الخطوة.

---

## ⚙️ الخطوة 3: إعداد ملف البيئة للخلفية (Backend)

```bash
cd backend
```

أنشئ ملف الإعدادات:

```bash
cp .env.example .env
```

الآن افتح ملف `backend/.env` وعدّل القيم حسب إعداداتك:

```env
# الخادم
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# قاعدة البيانات — عدّل كلمة المرور حسب إعدادك
DATABASE_URL=postgresql://postgres:كلمة_المرور@localhost:5432/csr_db

# مفاتيح الأمان (غيّرها لأي نص عشوائي طويل)
JWT_SECRET=my-super-secret-key-change-me-1234567890
JWT_REFRESH_SECRET=my-refresh-secret-key-change-me-0987654321
```

> **⚠️ مهم:** غيّر `كلمة_المرور` إلى كلمة مرور PostgreSQL عندك.

---

## 📦 الخطوة 4: تثبيت حزم الخلفية وتهيئة القاعدة

الصق الأوامر التالية واحد تلو الآخر (تأكد إنك داخل مجلد `backend`):

```bash
npm install
```

```bash
npm run db:generate
```

```bash
npm run db:push
```

```bash
npm run db:seed
```

> الأمر الأخير يملأ القاعدة ببيانات تجريبية (مشاريع، مستخدمين، إلخ).

---

## ▶️ الخطوة 5: تشغيل الخلفية (Backend)

```bash
npm run dev
```

✅ إذا شفت هذه الرسالة يعني الخلفية اشتغلت:

```
Server running on http://localhost:5000
Health check: http://localhost:5000/api/health
```

> **⚠️ لا تقفل هذا الـ Terminal** — خلّه مفتوح وافتح Terminal جديد للخطوة التالية.

---

## 🎨 الخطوة 6: تثبيت وتشغيل الواجهة (Frontend)

افتح **Terminal جديد** والصق:

```bash
cd csr-final-project/frontend
```

ثبّت الحزم:

```bash
npm install
```

أنشئ ملف الإعدادات:

```bash
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

شغّل الواجهة:

```bash
npm run dev
```

✅ إذا شفت هذه الرسالة يعني الواجهة اشتغلت:

```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## 🌐 الخطوة 7: افتح الموقع

افتح المتصفح وروح على:

```
http://localhost:5173
```

🎉 **مبروك! الموقع يعمل الآن.**

---

## 👤 بيانات الدخول الافتراضية

| الدور | البريد الإلكتروني | كلمة المرور |
|-------|-----------------|-------------|
| مدير (Admin) | أي بريد `@gcet.edu.om` عند التسجيل | تختاره أنت |
| موظف (Employee) | سجّل بأي بريد آخر | تختاره أنت |

> سجّل حساب جديد من صفحة **Register** — البريد المنتهي بـ `@gcet.edu.om` يحصل تلقائيًا على صلاحيات المدير.

---

## 🛑 إيقاف المشروع

- في كل Terminal اضغط: **`Ctrl + C`**

---

## 🔄 إعادة التشغيل (في المرات القادمة)

ما تحتاج تعيد التثبيت — فقط شغّل الخلفية والواجهة:

**Terminal 1 — الخلفية:**
```bash
cd csr-final-project/backend
npm run dev
```

**Terminal 2 — الواجهة:**
```bash
cd csr-final-project/frontend
npm run dev
```

ثم افتح `http://localhost:5173` في المتصفح.

---

## ❓ حل المشاكل الشائعة

| المشكلة | الحل |
|---------|------|
| `HTTP ERROR 502` | الواجهة أو الخلفية مو شغّالة — شغّلهم من الخطوة 5 و 6 |
| `FATAL: password authentication failed` | كلمة مرور PostgreSQL في `.env` غلط — صحّحها |
| `FATAL: database "csr_db" does not exist` | أنشئ القاعدة: `CREATE DATABASE csr_db;` |
| `EADDRINUSE: port 5000` | البورت مستخدم — أوقف أي برنامج عليه أو غيّر `PORT` في `.env` |
| `Cannot find module` | شغّل `npm install` مرة ثانية في المجلد المناسب |
| الصفحة بيضاء بدون بيانات | تأكد إن الخلفية شغّالة وإنك نفّذت `npm run db:seed` |

---

## 📁 هيكل المشروع (للمعلومية)

```
csr-final-project/
├── backend/          ← الخادم (Express + PostgreSQL)
│   ├── .env          ← إعدادات الخلفية (تنشئه أنت)
│   ├── src/          ← كود الخلفية
│   └── package.json
├── frontend/         ← الواجهة (React + Vite)
│   ├── .env          ← إعدادات الواجهة (تنشئه أنت)
│   ├── src/          ← كود الواجهة
│   └── package.json
└── HOW_TO_RUN.md     ← هذا الملف 😄
```
