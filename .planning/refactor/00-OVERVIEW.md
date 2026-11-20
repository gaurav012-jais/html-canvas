# WAP Manager — Full Project Refactor Plan
> **Status:** Planning Phase | **Author:** Refactor Initiative | **Date:** Nov 2026

## Kyun Refactor Karna Hai?

Code padhne se pata chala ki project 3 bade problems face kar raha hai:

| Problem | Kahan Hai | Impact |
|---|---|---|
| **God Files** | `database/index.js` (763 lines), `otp.service.js` (1420 lines), `TemplateEditor.jsx` (973 lines) | Koi bhi edit karne se dar lagta hai |
| **Mixed Responsibilities** | `useFlowPages.js` ek file mein boot + cache + prefetch + URL sync + redirect sab karta hai | Test karna impossible |
| **Inline Migrations** | `database/index.js` mein 25+ `ensure*` functions — real migration files alag bhi hain | Schema ka state kya hai pata hi nahi |

---

## Project Map (High Level)

```
dddd/
├── backend/          → Express + TypeORM + PostgreSQL/MySQL
│   ├── src/
│   │   ├── app.js           ← App setup (괜찮a hai)
│   │   ├── common/          ← Middleware, guards, shared services
│   │   ├── config/          ← Configuration
│   │   ├── database/        ← DB init + entities + migrations + seeds
│   │   └── modules/         ← Business logic (13 modules)
│   └── scripts/             ← One-off scripts (messy, need cleanup)
│
└── frontend/         → React + Vite + Zustand + TailwindCSS
    └── src/
        ├── app/             ← Router + main entry
        ├── components/      ← UI + feature components
        ├── editor/          ← GrapesJS template editor
        ├── pages/           ← Route-level pages
        │   └── subscription/← Public funnel (most complex part)
        └── services/        ← API calls + flow logic
```

---

## Refactor Files Index

| File | Kya Cover Karta Hai |
|---|---|
| **[01-BACKEND.md](./01-BACKEND.md)** | Backend modules ka pura refactor plan |
| **[02-DATABASE.md](./02-DATABASE.md)** | Database layer cleanup — entities + migrations + seeds |
| **[03-FRONTEND-PAGES.md](./03-FRONTEND-PAGES.md)** | Pages aur subscription funnel refactor |
| **[04-FRONTEND-EDITOR.md](./04-FRONTEND-EDITOR.md)** | GrapesJS template editor refactor |
| **[05-FRONTEND-STORE.md](./05-FRONTEND-STORE.md)** | State management + API services cleanup |
| **[06-EXECUTION-ORDER.md](./06-EXECUTION-ORDER.md)** | Kab kya karna hai — phased execution plan |
| **[07-ADDITIONAL-FINDINGS.md](./07-ADDITIONAL-FINDINGS.md)** | Deep scan round 2 — 8 naye God files found |
| **[08-FINAL-COMPLETE-AUDIT.md](./08-FINAL-COMPLETE-AUDIT.md)** | Top 10 largest files master inventory |
| **[09-FULL-REPO-AUDIT-ALL-FILES.md](./09-FULL-REPO-AUDIT-ALL-FILES.md)** | 100% Complete Repo Scan — All 60 files over 400 lines |

---

## Technology Decisions

### Backend — JS Rahega (TypeScript Nahi)
Kyu? Backend pehle se `.js` hai, TypeORM EntitySchema use karta hai (not decorators), aur `.d.ts` files `dist/` mein already compiled hain. TS add karne se zyada confusion badega bina real benefit ke.

**What we DO instead:**
- JSDoc `@typedef` aur `@param` comments add karenge (VS Code type hints milenge bina TypeScript ke)
- File lengths 300 lines max rakhenge
- Har function ka ek kaam hoga

### Frontend — JSX Rahega (TSX Nahi)
React frontend already clean hai structurally. Main issue subscription page ki complexity hai, not types.

### Database — TypeORM Migrate to Proper Migrations Only
`database/index.js` ke andar inline `ensure*` functions hain jo real migrations hain — inhe actual migration files mein move karna hai.

---

## Common Refactor Rules (Har File Pe Apply)

1. **Ek file = ek responsibility** — agar naam mein "and" aata hai toh split karo
2. **Max 300 lines per file** — agar zyada hai toh extract karo
3. **No magic strings** — constants file mein rakho
4. **Functions 20 lines max** — zyada hai toh naam do aur extract karo
5. **Ek level of abstraction** — ek function ya high-level calls kare ya low-level, dono nahi
6. **Comments explain WHY, not WHAT** — code khud batayega kya kar raha hai

---

## Kya Nahi Badlega

- API endpoints (sab same rahenge — breaking change avoid)
- Database schema (data migration risk hai)
- Core flow logic (behavior same rahegi)
- Tech stack (Express, React, TypeORM, Zustand, Tailwind)
