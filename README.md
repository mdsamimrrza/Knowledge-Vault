# 🔐 Knowledge Vault

<div align="center">

### *A Secure, Full-Stack Personal Wiki & Knowledge Base*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-4CAF50?style=for-the-badge&logoColor=white)](https://knowledge-vault-production.up.railway.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

*Create • Organize • Interlink — with Enterprise-Grade Security*

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [Admin Control Center](#-admin-control-center)
- [Security Architecture](#-security-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Maintenance Scripts](#-maintenance-scripts)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🧠 Overview

**Knowledge Vault** is a full-stack, production-ready personal wiki application. It lets you create, edit, organize, and hyperlink markdown-based knowledge articles with a beautiful **Glassy Teal** design system.

Built with a security-first philosophy, every administrative action — from banning a user to resetting a password — goes through a hardened, multi-stage verification flow. It is fully deployed on [Railway](https://railway.app) and ready to be self-hosted.

**Key design goals:**
- 🔒 Zero-Trust administrative controls
- 📝 Rich markdown articles with wiki-style `[[links]]`
- 🎨 Premium "Glassy Teal" dark UI, fully responsive
- ✅ Comprehensive automated test suite

---

## 📸 Screenshots

### 🖥️ Desktop

<div align="center">
  <img src="client/public/laptopScreen.png" width="700" alt="Desktop View — Knowledge Vault">
</div>

<br>

### 📱 Mobile

<div align="center">
  <img src="client/public/mobileScreen.png" width="180" alt="Mobile View — Knowledge Vault">
</div>

---

## ✨ Features

### 📄 Article Management
- Create, edit, and delete **Markdown articles** with live preview
- Articles support **tags** for categorization and filtering
- **Public / Private** visibility control per article
- Full **version history** with up to 50 versions — restore any previous state
- **Slug-based URLs** for clean, shareable article links

### 🔗 Wiki-Style Linking
- Use `[[Article Title]]` syntax to create internal hyperlinks between articles
- Automatic **title resolution** — broken links are visually flagged
- Real-time link preview on hover

### ❤️ Favorites
- Users can **star/favorite** any article for quick access
- Personal favorites feed, separate from the public article list

### 🔍 Search & Discovery
- **Full-text search** powered by MongoDB text indexes
- **Tag-based filtering** — click any tag to browse all related articles
- Paginated results with configurable limits

### 👤 User Accounts
- Secure **register & login** with Zod-validated forms
- **Password reset via Email OTP** — 6-digit codes with 15-minute expiry
- Rate limiting on OTP requests (60-second cooldown)
- Automatic **ban check** on login — banned users are rejected immediately

---

## 🏗️ Admin Control Center

<div align="center">
  <img src="client/public/adminPanel.png" width="700" alt="Admin Control Center">
</div>

The built-in Admin Panel gives administrators complete oversight and control over the platform:

### 📊 Live Dashboard Stats
| Metric | Description |
|--------|-------------|
| Total Users | Count of all registered accounts |
| Total Articles | All articles in the system |
| Admins | Active administrator count |
| Suspended | Currently banned user count |

### 👥 User Management
| Action | Description | Security Level |
|--------|-------------|----------------|
| **Promote** | Grant admin privileges to a user | OTP Required |
| **Demote** | Revoke admin privileges | OTP Required |
| **Ban User** | Suspend a user's system access | Confirmation Dialog |
| **Unban User** | Restore a suspended account | Confirmation Dialog |
| **Delete User** | Permanently remove an account | Confirmation + OTP |

**Smart Rules:**
- 🚫 Banned users **cannot be promoted** until unbanned
- 🛡️ Admins **cannot ban themselves**
- ⚠️ Every destructive action shows a **custom AlertDialog** confirmation

---

## 🛡️ Security Architecture

Knowledge Vault implements a layered, **Zero-Trust** security model:

### 1. Environment Validation
On every server startup, all required environment variables are validated with **Zod**. If any are missing or malformed (e.g., `SESSION_SECRET` shorter than 32 chars), the server refuses to start.

### 2. Session Protection
- `express-session` backed by **MongoDB** (via `connect-mongo`)
- Mandatory `SESSION_SECRET` enforced at startup
- `trust proxy` support for production reverse-proxy deployments
- Session-bound admin state verification on every request

### 3. Role-Based Access Control (RBAC)
```
Guest    → Read public articles only
User     → Read + Favorite articles, manage own account
Admin    → Full CRUD on articles, access to Admin Panel
Super Admin → All admin actions + promote/demote admins
```

### 4. High-Risk Admin Actions (Multi-Stage Authorization)
```
Step 1: Click Action → AlertDialog Confirmation
Step 2: Server checks → EMAIL_OTP_REQUIRED
Step 3: Super Admin also needs → Master Key Verification
Step 4: OTP sent to admin's email (6-digit, 5min expiry)
Step 5: Admin enters OTP → Action is executed
```

### 5. Anti-Bounce Email Shield
Before sending any OTP or reset email, the system performs a **live DNS MX record lookup** to verify the email domain actually exists. Non-existent domains are rejected immediately, preventing bounce spam.

### 6. Password Reset Security
- OTP-based flow (no magic links to avoid phishing)
- 15-minute OTP expiry
- 60-second rate limit between requests
- Super Admin password reset requires **Master Key** first
- Test/disposable email addresses are blacklisted

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript | UI Components |
| **Build Tool** | Vite 7 | Dev server & bundling |
| **State / Data** | TanStack Query v5 | Server state & caching |
| **Routing** | Wouter | Lightweight client routing |
| **Forms** | React Hook Form + Zod | Validated forms |
| **UI Components** | shadcn/ui + Radix UI | Accessible primitives |
| **Styling** | Tailwind CSS v3 | Utility-first CSS |
| **Animations** | Framer Motion | Smooth transitions |
| **Icons** | Lucide React | Icon library |
| **Backend** | Express 5 + TypeScript | REST API server |
| **Database** | MongoDB + Mongoose | Data persistence |
| **Sessions** | express-session + connect-mongo | Auth sessions |
| **Passwords** | bcryptjs | Password hashing |
| **Email** | Nodemailer | SMTP OTP delivery |
| **Validation** | Zod | Schema validation (shared) |
| **Testing** | Vitest + V8 | Unit & integration tests |

---

## 📁 Project Structure

```
knowledge-vault/
├── client/                  # React frontend (Vite)
│   ├── public/              # Static assets (screenshots, banner)
│   └── src/
│       ├── components/      # Reusable UI components
│       │   └── ui/          # shadcn/ui primitives
│       ├── hooks/           # Custom React hooks (useAuth, etc.)
│       ├── lib/             # API client, query client, utils
│       └── pages/           # Route-level page components
│           ├── AdminPage.tsx
│           ├── AuthPage.tsx
│           ├── Home.tsx
│           ├── ArticleView.tsx
│           └── ...
├── server/                  # Express backend
│   ├── lib/                 # Email, versioning, env helpers
│   ├── middleware/          # Auth middleware (requireAuth, requireAdmin)
│   ├── routes/api/          # REST API route handlers
│   │   ├── admin.ts         # Admin management endpoints
│   │   ├── articles.ts      # Article CRUD
│   │   ├── auth.ts          # Login, register, OTP, reset
│   │   ├── favorites.ts     # Per-user favorites
│   │   └── tags.ts          # Tag aggregation
│   ├── models.ts            # Mongoose models
│   ├── storage.ts           # Data access layer
│   └── index.ts             # Server entry point
├── shared/                  # Shared types & schemas (client + server)
│   ├── schema.ts            # Zod schemas & TypeScript types
│   ├── routes.ts            # Route constants
│   └── wiki-links.ts        # Wiki-link parsing utilities
├── scripts/                 # Admin CLI scripts
│   ├── promote-admin.ts
│   └── cleanup-test-user.ts
├── tests/                   # Vitest test suites
└── .env.example             # Environment variable template
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** connection (Atlas or local)
- **SMTP credentials** (Gmail App Password recommended)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/knowledge-vault.git
cd knowledge-vault
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
```

### 4. Start development server
```bash
npm run dev
```

The app will be available at **http://localhost:5000**

### 5. Build for production
```bash
npm run build
npm start
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root. All variables are validated at startup with Zod — the server will not start if any are missing or invalid.

```env
# ── Database ──────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/knowledge-vault

# ── Session Security ──────────────────────────────────
# Must be at least 32 characters
SESSION_SECRET=your-random-32-char-secret-here

# ── Super Admin Configuration ─────────────────────────
# Email of the primary administrator
SUPER_ADMIN_EMAIL=admin@yourdomain.com
# Hardware-style master key for high-risk actions
ADMIN_SECRET_KEY=your-secret-master-key

# ── SMTP Email (for OTP delivery) ─────────────────────
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-google-app-password   # Use Gmail App Passwords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# ── Optional ──────────────────────────────────────────
PORT=5000
NODE_ENV=production
```

> **Tip:** Generate a secure `SESSION_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/me` | Session | Get current user |
| `POST` | `/register` | Public | Register new account |
| `POST` | `/login` | Public | Login |
| `POST` | `/logout` | Session | Logout |
| `POST` | `/forgot-password` | Public | Request password reset OTP |
| `POST` | `/verify-otp` | Public | Verify reset OTP code |
| `POST` | `/reset-password` | Public | Set new password |

### Articles (`/api/articles`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Public | List articles (search, tag, page) |
| `GET` | `/:id` | Conditional | Get single article |
| `GET` | `/slug/:slug` | Conditional | Get article by slug |
| `POST` | `/` | Admin | Create article |
| `PATCH` | `/:id` | Admin | Update article |
| `DELETE` | `/:id` | Admin | Delete article |
| `GET` | `/:id/versions` | Auth | Get version history |
| `POST` | `/:id/versions/:vId/restore` | Admin | Restore a version |

### Admin (`/api/admin`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/stats` | Admin | Dashboard statistics |
| `GET` | `/users` | Admin | List all users |
| `PATCH` | `/users/:id` | Admin | Update user status |
| `DELETE` | `/users/:id` | Admin | Initiate user deletion (triggers OTP) |
| `POST` | `/users/:id/request-otp` | Admin | Send action OTP to admin email |
| `POST` | `/users/:id/verify-master-key` | Super Admin | Verify master key |
| `POST` | `/users/:id/confirm-demote` | Admin | Confirm with OTP |
| `POST` | `/users/:id/confirm-promote` | Admin | Confirm with OTP |
| `POST` | `/users/:id/confirm-ban` | Admin | Confirm with OTP |
| `POST` | `/users/:id/confirm-delete` | Admin | Confirm with OTP |

### Favorites (`/api/favorites`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Auth | Get user's favorite article IDs |
| `POST` | `/:id` | Auth | Add article to favorites |
| `DELETE` | `/:id` | Auth | Remove from favorites |

---

## 🧪 Testing

Tests are written with **Vitest** and cover critical business logic:

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Generate HTML coverage report
npm run test:coverage
```

**Test Coverage Areas:**

| Test Suite | What's Covered |
|------------|---------------|
| `auth.middleware.test` | `requireAuth`, `requireAdmin`, Super Admin bypass |
| `versioning.test` | 50-version limit, LIFO sorting, version restore |
| `wiki-linking.test` | `[[Title]]` extraction, edge cases, nested brackets |
| `dns.validation.test` | MX record lookup, invalid domains, disposable emails |
| `env.validation.test` | Zod env schema, missing fields, short secrets |

---

## 🛠️ Maintenance Scripts

CLI scripts for common admin operations (run from the project root):

```bash
# Promote a user to Admin role
npm run script:promote-admin user@example.com

# Permanently delete a user by email
npm run script:cleanup-user testuser@example.com
```

See [scripts/README.md](scripts/README.md) for full documentation on each script.

---

## 🚢 Deployment

This project is configured for **Railway** deployment out of the box.

### Railway (Recommended)
1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Add all [environment variables](#-environment-variables) in the Railway dashboard
5. Railway auto-detects the `railway.json` config and deploys

### Manual / VPS
```bash
npm run build
NODE_ENV=production npm start
```

> Ensure all environment variables are set in your hosting environment before starting.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using React, Express, and MongoDB.

[⬆ Back to Top](#-knowledge-vault)

</div>