# QMS System (Quality Management System)

Enterprise internal QMS with digital approval workflows.

## Tech Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript (strict)
- Database: PostgreSQL
- ORM: Prisma
- UI: Tailwind CSS + Radix UI
- Auth: NextAuth.js v5 (beta)
- Cache/Rate limiting: Redis (ioredis)
- Integrations: Microsoft Graph API (Email + SharePoint)
- Deployment: Ubuntu Server (Docker)

## Architecture

- `app/api/*`: Route handlers (thin controllers)
- `services/*`: Business/domain logic
- `repositories/*`: Data access layer
- `schemas/*`: Zod validation schemas
- `lib/*`: Shared infra utilities (auth, db, redis, error handling)

## Core Rules

- Type safety first: strict mode, no `any`
- Validate all inputs with Zod
- Do not access DB from UI/components/hooks directly
- Keep API handlers async/await and delegate logic to services
- Attachments must go to SharePoint via Graph API only

## Getting Started

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run build
npm run db:migrate
npm run db:studio
```
