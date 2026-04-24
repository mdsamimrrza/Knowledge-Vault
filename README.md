# Knowledge Vault — Secure Personal Wiki & Knowledge Base

A high-security, full-stack personal wiki application for creating, organizing, and interlinking markdown articles. Built with a focus on **Zero-Trust Security**, **Modular Architecture**, and **Anti-Spam Email Protection**.

![License](https://img.shields.io/badge/license-MIT-blue)
![Database](https://img.shields.io/badge/database-MongoDB-green)
![Security](https://img.shields.io/badge/security-Zero--Trust-teal)

---

## 🛡️ Premium Security Features

This project implements advanced administrative and recovery security measures:

- **Zero-Trust Admin Gates** — High-risk actions (promoting/banning users) require a multi-stage authorization flow (Master Key + Email OTP).
- **Super Admin Master Key** — A hardware-style "Secret Key" required for all Super Admin account recovery and administrative changes.
- **Anti-Bounce Email Shield** — Integrated DNS Domain Validation prevents sending emails to non-existent domains, keeping your SMTP inbox clean from "Not Delivered" reports.
- **Domain Blacklisting** — Hard-blocks common test and fake domains at the app level.
- **Session Protection** — Persistent sessions via `connect-mongo` with `trust-proxy` support for cloud deployments (Railway/Vercel).

---

## 🚀 Tech Stack

| Layer       | Technology                                                        |
| ----------- | ----------------------------------------------------------------- |
| **Frontend**| React 18, TypeScript, Vite, Wouter (routing), TanStack Query      |
| **UI/UX**   | shadcn/ui, Tailwind CSS, Framer Motion (animations)               |
| **Backend** | Express 5, TypeScript (Modular Architecture)                      |
| **Database**| MongoDB (Mongoose ODM)                                            |
| **Auth**    | express-session + connect-mongo (Production ready)                |
| **Security**| bcryptjs, DNS-lookup validation, Custom OTP Engine                |

---

## 🏗️ Project Structure (Modular)

```
Knowledge-Vault/
├── client/                 # React frontend
├── shared/                 # Zod schemas & API contracts
├── server/
│   ├── index.ts            # Entry point & DB connection
│   ├── db.ts               # Mongoose initialization
│   ├── lib/
│   │   └── email.ts        # SMTP logic + DNS validation shield
│   ├── middleware/
│   │   └── auth.ts         # Security guards & role checks
│   ├── routes/
│   │   ├── index.ts        # Central route registration
│   │   └── api/            # Modular route handlers
│   │       ├── auth.ts     # Login/Register/Recovery logic
│   │       ├── admin.ts    # User management & Master Key logic
│   │       ├── articles.ts # Article & Versioning logic
│   │       ├── favorites.ts# User favorite management
│   │       └── tags.ts     # Global tag statistics
│   └── storage.ts          # Data Access Layer
└── railway.json            # Deployment configuration
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Required — MongoDB connection string
MONGODB_URI=mongodb+srv://...

# Required — Security
SESSION_SECRET=your-long-random-string
ADMIN_SECRET_KEY=your-hardware-master-key
SUPER_ADMIN_EMAIL=your-email@gmail.com

# Required — SMTP (Email OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-google-app-password
```

---

## 🚀 Deployment (Railway)

This project is pre-configured for **Railway** deployment:

1.  Push your code to GitHub.
2.  In Railway, create a **New Project** and connect your repository.
3.  Add all the **Environment Variables** listed above in the "Variables" tab.
4.  Railway will automatically detect the `railway.json` and deploy using Nixpacks.

---

## 📖 Key Features

- **Wiki-Style Linking** — Use `[[Article Title]]` to automatically link articles.
- **Version History** — Full audit trail of every edit with "One-Click Restore."
- **Markdown Editor** — Professional editor with live preview and syntax highlighting.
- **Tagging & Search** — Organize your knowledge with tags and instant search.
- **Admin Dashboard** — Complete control over users and statistics with secure gates.

---

## 📜 License

MIT