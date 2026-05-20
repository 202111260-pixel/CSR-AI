# ZenMax — AI-Powered CSR Management Platform

ZenMax is a full-stack web application for managing and analyzing Corporate Social Responsibility (CSR) projects. It uses a multi-agent AI pipeline to generate financial, impact, and risk analysis reports.

---

## Tools & Technologies

| Layer | Technology | Purpose |
|---|---|---|
| Language | TypeScript | Frontend & Backend |
| Frontend | React 19 + Vite | UI framework and build tool |
| Styling | Tailwind CSS + Radix UI | Design system and components |
| State Management | Zustand + TanStack Query | Client state and server data |
| Charts | Recharts | Data visualization |
| Backend | Node.js + Express.js | REST API server |
| ORM | Prisma | Database access layer |
| Database | PostgreSQL | Primary data store |
| Authentication | Auth0 + JWT | User identity and session tokens |
| Security | Helmet + CORS + Bcrypt + Zod | HTTP headers, validation, password hashing |
| AI Gateway | ZenMux | Routes requests to AI models |
| AI Models | DeepSeek / Gemini / Claude | Specialized agent models |
| Email | Nodemailer | Automated reporting |
| Scheduler | Node-cron | Midnight Auditor job |
| Frontend Deploy | Vercel | Hosting and CDN |
| Backend Deploy | Railway | Server hosting |

---

## Prerequisites

- Node.js v18 or higher
- PostgreSQL database
- Environment variables configured (see below)

---

## Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_jwt_secret
ZENMUX_API_KEY=your_zenmux_key
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

---

## How to Run

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set Up the Database

```bash
cd backend
npm run db:push      # Push schema to PostgreSQL
npm run db:seed      # Seed initial data
```

### 3. Run the Backend

```bash
cd backend
npm run dev
```

Server runs on: `http://localhost:3000`

### 4. Run the Frontend

```bash
cd frontend
npm run dev
```

App runs on: `http://localhost:5173`

---

## Available Scripts

### Backend

| Script | Description |
|---|---|
| `npm run dev` | Start backend in development mode |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed the database with initial data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

### Frontend

| Script | Description |
|---|---|
| `npm run dev` | Start frontend in development mode |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |

---

## Project Structure

```
CSR-FINAL-PROJECT/
├── frontend/         # React 19 + Vite application
│   └── src/
│       ├── pages/    # Application pages
│       ├── components/
│       └── services/
├── backend/          # Node.js + Express API
│   └── src/
│       ├── routes/   # API endpoints
│       ├── services/ # Business logic and AI agents
│       ├── jobs/     # Midnight Auditor cron job
│       └── prisma/   # Database schema and migrations
```

---

## Developer

**Mohammed Salem Al-Hadhari**
BSc Business Computing — Gulf College
Supervisor: Dr. Haneen

