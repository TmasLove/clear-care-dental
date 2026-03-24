# Clear Care Dental

A full-stack mobile dental benefits platform built with React Native + Expo. Supports four user roles — Member, Dentist, Employer, and Admin — modeled after the Bento dental benefits platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile / Web | React Native + Expo SDK 51 |
| Navigation | React Navigation v6 |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (role-based) |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## User Roles

### Member
- View dental benefits and coverage summary
- Find in-network dentists
- Track claims history
- View EOBs and remaining deductible

### Dentist
- Patient eligibility verification
- Submit and track claims (PDF upload)
- Manage appointments with checkout flow
- Treatment plan estimates
- Reports: Payments from Bento, Membership, Ortho Payments

### Employer
- Manage employee benefit groups
- View enrollment and utilization reports
- Billing and invoice management

### Admin
- Platform-wide user and plan management
- Claims adjudication
- Analytics dashboard

---

## Project Structure

```
/
├── mobile/                  # React Native + Expo app
│   └── src/
│       ├── navigation/      # Stack + tab navigators per role
│       ├── screens/
│       │   ├── auth/        # Login, registration
│       │   ├── member/      # Member portal screens
│       │   ├── dentist/     # Dentist portal screens
│       │   ├── employer/    # Employer portal screens
│       │   └── admin/       # Admin portal screens
│       ├── utils/
│       │   ├── colors.js         # Shared color tokens
│       │   └── dentistColors.js  # Bento-inspired dentist portal theme
│       └── components/      # Shared UI components
│
├── backend/                 # Node.js + Express API
│   ├── server.js
│   └── src/
│       ├── routes/          # Auth, claims, patients, etc.
│       ├── middleware/       # JWT auth, role guards
│       └── db/              # PostgreSQL connection + migrations
│
└── railway.json             # Railway deployment config
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Expo CLI (`npm install -g expo-cli`)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_ORG/clear-care-dental.git
cd clear-care-dental

# Start the backend
cd backend
npm install
cp .env.example .env   # fill in DB credentials and JWT secret
npm start              # runs on http://localhost:3001

# Start the mobile app (new terminal)
cd mobile
npm install
npx expo start         # opens Expo DevTools on http://localhost:8081
```

### Environment Variables (backend/.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/clearcare
JWT_SECRET=your_jwt_secret
PORT=3001
```

---

## Deployment

| Service | Target |
|---------|--------|
| Frontend | Vercel (`app.clearcaredentalgroup.com`) |
| Backend API | Railway (`api.clearcaredentalgroup.com`) |
| DNS | AWS Route 53 |

The main website at `www.clearcaredentalgroup.com` is unaffected — the app lives on a subdomain.

---

## Design System — Dentist Portal

The dentist portal uses a Bento-inspired theme (`dentistColors.js`):

| Token | Value | Use |
|-------|-------|-----|
| `sidebarBg` | `#1A3347` | Dark navy tab bar / sidebar |
| `sidebarText` | `#47C2D0` | Inactive nav labels |
| `teal` | `#3D9B85` | CTA buttons, success states |
| `berry` | `#8C3080` | Secondary accent |
| `background` | `#F4F6F8` | Page background |

---

## License

Private — Clear Care Dental Group. All rights reserved.
