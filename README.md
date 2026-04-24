# Knowledge Vault — Secure Personal Wiki & Knowledge Base

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://knowledge-vault-production.up.railway.app)
[![Tests](https://img.shields.io/badge/tests-vitest-blue)](/tests)
[![License](https://img.shields.io/badge/license-MIT-blue)](/LICENSE)
[![Security](https://img.shields.io/badge/security-Zero--Trust-teal)](#-premium-security-features)

![Knowledge Vault Banner](client/public/banner.png)

A high-security, full-stack personal wiki application for creating, organizing, and interlinking markdown articles. Built with a focus on **Zero-Trust Security**, **Modular Architecture**, and **Anti-Spam Email Protection**.

---

## 📸 Screenshots

| Dashboard | Mobile View | Admin Panel |
|-----------|-------------|-------------|
| ![Dashboard](https://placehold.co/600x400?text=Modern+Wiki+Dashboard) | ![Mobile](https://placehold.co/300x600?text=Responsive+Layout) | ![Admin](https://placehold.co/600x400?text=Zero-Trust+Admin+Panel) |

---

## 🛡️ Premium Security Features

This project implements advanced administrative and recovery security measures:

- **Zero-Trust Admin Gates** — High-risk actions (promoting/banning users) require a multi-stage authorization flow (Master Key + Email OTP).
- **Super Admin Master Key** — A hardware-style "Secret Key" required for all Super Admin account recovery and administrative changes.
- **Environment Validation** — Strict Zod-based validation on startup ensures the server never runs with insecure or missing configurations.
- **Anti-Bounce Email Shield** — Integrated DNS Domain Validation (MX records) prevents sending emails to non-existent domains.
- **Session Protection** — Hardened `express-session` with `trust-proxy` support and mandatory `SESSION_SECRET` (minimum 32 chars).

---

## 🧪 Testing Suite

Powered by **Vitest**, the project includes comprehensive unit and integration tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Key Test Coverage:**
- **Auth Middleware**: Role-based access control and Super Admin bypass.
- **Versioning**: 50-version history limit, restoration logic, and sorting.
- **Wiki-Links**: Pattern extraction and markdown pre-processing.
- **DNS/Email**: Domain validity checks and disposable email blacklisting.

---

## 🛠️ Maintenance Scripts

Common administrative tasks can be performed via the CLI:

```bash
# Promote a user to Super Admin
npm run script:promote-admin <email>

# Cleanup a test user
npm run script:cleanup-user <email>
```
*Note: See [scripts/README.md](/scripts/README.md) for more details.*

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory. The application will validate these on startup:

```env
# Database
MONGODB_URI=mongodb+srv://...

# Security (Validated by Zod)
SESSION_SECRET=your-32-char-random-string...
ADMIN_SECRET_KEY=your-hardware-master-key
SUPER_ADMIN_EMAIL=admin@example.com

# SMTP (Email OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-google-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

---

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Lucide Icons.
- **UI/UX**: shadcn/ui, Tailwind CSS, Framer Motion.
- **Backend**: Express 5, TypeScript, express-session.
- **Database**: MongoDB (Mongoose).
- **Testing**: Vitest, V8 Coverage.

---

## 📜 License

MIT