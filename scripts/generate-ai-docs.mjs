import fs from 'fs';
import path from 'path';

const docsDir = path.join(process.cwd(), 'docs');

const dirs = [
  'agent',
  'standards',
  'architecture',
  'domains/dar',
  'domains/kpi',
  'domains/document-control',
  'domains/auth',
  'domains/announcements',
  'domains/qms'
];

dirs.forEach(dir => {
  fs.mkdirSync(path.join(docsDir, dir), { recursive: true });
});

const files = {
  'agent/00-start-here.md': '# AI Agent Start Here\n\n## Welcome\nWelcome to the QMS System repository. This document is your entry point.\n\n## Workflow For Future Agents\nBefore reading source code:\n1. Read `docs/agent/00-start-here.md`\n2. Read `docs/agent/01-current-state.md`\n3. Read `docs/architecture/domain-map.md`\n4. Read `docs/architecture/tech-stack.md`\n5. Read only the relevant standards file in `docs/standards/`\n6. Read only the relevant domain documentation in `docs/domains/`\n7. Open the minimum required source files\n\n**Do not scan the entire repository unless explicitly required.**\nOptimize documentation for minimum future token consumption.\n',

  'agent/01-current-state.md': '# Current State\n\n## Completed Features\n- Authentication (MS Graph / Credentials) [PARTIAL / COMPLETED]\n- Department & User Management [PARTIAL]\n- Document Action Request (DAR) submission and routing [PARTIAL]\n- KPI Objectives and Monthly Reporting [PARTIAL]\n- External integrations (SharePoint, MS Graph, Email) [PARTIAL]\n- Background/Scripts (Check API Patterns) [PARTIAL]\n\n## Partially Completed Features\n- Full Document Control Lifecycle\n- QMS Processing steps\n- System Health and Audit Logs\n- Approval Action Tokens\n\n## Missing Features\n- NOT IMPLEMENTED: Full E2E tests for all UI flows.\n- NOT IMPLEMENTED: Advanced analytics dashboard.\n\n## Technical Debt\n- Some API patterns might need to be migrated to use standard `actionTokenService` or `auditService`.\n- Frontend code might still have some missing Radix UI implementations.\n\n## Known Risks\n- Neon Serverless connection limits or timeouts.\n- SharePoint/MS Graph token expirations.\n- Email delivery failures if idempotency isn\'t strictly enforced.\n\n## Recommended Next Tasks\n- Complete full UI flows for Document Control.\n- Ensure all endpoints use standard audit logging.\n- Add comprehensive Vitest coverage.\n',

  'agent/02-file-map.md': '# File Map\n\n## Major Folders\n\n### `/app`\n- **Purpose**: Next.js App Router containing pages and API routes.\n- **Dependencies**: React, Next.js, Components, Services, Schemas.\n- **Related Domains**: All domains.\n- **Important Files**: `layout.tsx`, `api/.../route.ts`\n\n### `/components`\n- **Purpose**: Shared UI components (Radix UI, Tailwind).\n- **Dependencies**: Radix UI, React Hook Form, Zod.\n- **Related Domains**: UI Shared.\n- **Important Files**: `ui/*`\n\n### `/services`\n- **Purpose**: Business logic layer.\n- **Dependencies**: Repositories, External APIs (SharePoint, MS Graph).\n- **Related Domains**: All domains.\n- **Important Files**: `darService.ts`, `kpiService.ts`, `email.ts`, `ms-graph.ts`\n\n### `/repositories`\n- **Purpose**: Data access layer.\n- **Dependencies**: Prisma Client.\n- **Related Domains**: All domains.\n- **Important Files**: `baseRepository.ts`, `darRepository.ts`\n\n### `/prisma`\n- **Purpose**: Database schema and migrations.\n- **Dependencies**: PostgreSQL, Prisma.\n- **Related Domains**: Database.\n- **Important Files**: `schema.prisma`\n\n### `/schemas`\n- **Purpose**: Zod validation schemas for forms and API requests.\n- **Dependencies**: Zod.\n- **Related Domains**: Validation.\n- **Important Files**: `darSchema.ts`, `kpiSchema.ts`\n',

  'agent/03-standards.md': '# Standards\n\nPlease refer to the following standard documents:\n\n- [Frontend Standards](../standards/frontend.md)\n- [Backend Standards](../standards/backend.md)\n- [API Standards](../standards/api.md)\n- [Database Standards](../standards/database.md)\n- [UI Standards](../standards/ui.md)\n- [Security Standards](../standards/security.md)\n- [Testing Standards](../standards/testing.md)\n',

  'agent/04-task-log.md': '# Task Log\n\n- [x] Analyze current repository and build AI-optimized documentation system.\n',

  'agent/05-decisions.md': '# Decisions Log\n\n- **Documentation System**: Adopted a domain-driven AI-optimized documentation structure to minimize token usage for future agents.\n- **Architecture**: Enforced standard Next.js App Router, Services, Repositories, and Prisma.\n',

  'architecture/tech-stack.md': '# Tech Stack\n\n## Core\n- **Framework**: Next.js 15 (App Router)\n- **Language**: TypeScript\n- **Runtime**: Node.js\n\n## Frontend\n- **UI Library**: React 19\n- **Styling**: Tailwind CSS v4, PostCSS\n- **Components**: Radix UI\n- **State Management / Data Fetching**: TanStack React Query\n- **Forms & Validation**: React Hook Form, Zod\n\n## Backend\n- **Database**: PostgreSQL (Neon Serverless)\n- **ORM**: Prisma\n- **Auth**: Next-Auth v5 (Beta)\n- **Caching / Queues**: ioredis\n- **Email/Integrations**: MS Graph, SharePoint\n\n## Tooling\n- **Testing**: Vitest\n- **Linting**: ESLint\n',

  'architecture/domain-map.md': '# Domain Map\n\n1. **Authentication (auth)**: Handles login, Next-Auth, MS Graph tokens.\n2. **Document Action Request (dar)**: DAR Master, Items, Approvals, Attachments.\n3. **KPI (kpi)**: KPI Objectives, Monthly Reports, Corrective Actions.\n4. **Document Control (document-control)**: Active documents, Categories, Revisions.\n5. **QMS (qms)**: QMS Processing steps for DARs.\n6. **Announcements (announcements)**: Public/Company announcements.\n7. **System & IT (it, health)**: Health checks, Configs, Audit Logs, Notification Logs.\n8. **Users & Departments (profile, departments)**: Org structure.\n',

  'architecture/api-map.md': '# API Map\n\n## Feature -> API -> Service -> Repository -> Database\n\n### DAR Domain\n- **Feature**: Create DAR\n- **API**: `/api/dar/route.ts`\n- **Service**: `darService.ts`\n- **Repository**: `darRepository.ts`\n- **Database**: `DarMaster`, `DarItem`, `DarDistribution`, `DarAttachment`\n\n### KPI Domain\n- **Feature**: Submit Monthly KPI\n- **API**: `/api/kpi/.../route.ts`\n- **Service**: `kpiMonthlyService.ts`\n- **Repository**: `kpiMonthlyReportRepository.ts`\n- **Database**: `KPIMonthlyReport`, `KPIMonthlyDetail`\n\n### Authentication Domain\n- **Feature**: Login\n- **API**: `/api/auth/[...nextauth]/route.ts`\n- **Service**: `userService.ts`\n- **Repository**: `userRepository.ts`\n- **Database**: `User`, `Department`\n\n### Audit & Notifications\n- **API**: `/api/audit-logs`, `/api/health`\n- **Service**: `auditService.ts`, `notificationService.ts`\n- **Repository**: `auditLogRepository.ts`, `notificationLogRepository.ts`\n- **Database**: `AuditLog`, `NotificationLog`\n',

  'architecture/database-map.md': '# Database Map\n\n## Core Models\n- `Department`: Org units.\n- `User`: Employees.\n- `SystemConfig`: Key-Value configs.\n\n## DAR Models\n- `DarMaster`: Main request.\n- `DarItem`, `DarDistribution`, `DarAttachment`, `DarApproval`\n- `QmsProcessing`\n\n## KPI Models\n- `KPI`, `KPIObjective`\n- `KPIMonthlyReport`, `KPIMonthlyDetail`, `KPICorrectiveAction`\n\n## Document Control\n- `DocumentControl`, `DocumentCategory`, `DocumentControlRevision`, `PublicDocument`\n\n## Logs & Audit\n- `AuditLog`, `NotificationLog`, `ActionToken`\n',

  'architecture/dependency-map.md': '# Dependency Map\n\n- **Feature -> API**: Frontend components (e.g., `dar-form`) call `/api/dar`.\n- **API -> Service**: API Routes strictly call functions in `services/` (e.g., `darService.createDar`).\n- **Service -> Repository**: Services call `repositories/` (e.g., `darRepository.create`).\n- **Repository -> Database**: Repositories use Prisma Client.\n- **Frontend -> API**: React Query hooks fetch from `/api/...`.\n- **Shared Components -> Consumers**: `components/ui/*` consumed by `app/(dashboard)/*`.\n- **External Integrations -> Related Modules**: `email.ts` and `sharepoint.ts` consumed by `darService` and `kpiService`.\n',

  'standards/frontend.md': '# Frontend Standards\n- Use Next.js App Router patterns.\n- Use TanStack React Query for data fetching.\n- Use React Hook Form + Zod for forms.\n- Follow Tailwind CSS utility-first classes.\n',

  'standards/backend.md': '# Backend Standards\n- Layered architecture: API -> Service -> Repository.\n- Do not use Prisma directly in API routes.\n- Handle business logic in Services.\n',

  'standards/api.md': '# API Standards\n- Standard JSON responses `{ data: ..., error: ... }`.\n- Strict validation using Zod in routes.\n- Implement rate limiting or idempotency where required.\n',

  'standards/database.md': '# Database Standards\n- Use Prisma Client via Repositories.\n- Apply transactions (`prisma.$transaction`) for multi-table writes.\n- Never hard delete data unless explicitly required (use soft deletes or status changes).\n',

  'standards/ui.md': '# UI Standards\n- Adhere to Radix UI accessibility standards.\n- Dark mode support using Tailwind `dark:` variants.\n- Toast notifications using `sonner`.\n',

  'standards/security.md': '# Security Standards\n- Use Next-Auth for authentication.\n- Validate role-based access in APIs.\n- Parameterize all external inputs.\n',

  'standards/testing.md': '# Testing Standards\n- Use Vitest for unit/integration tests.\n- Mock external services (SharePoint, Email).\n'
};

const domains = ['dar', 'kpi', 'document-control', 'auth', 'announcements', 'qms'];

domains.forEach(domain => {
  const upperDomain = domain.toUpperCase();
  files['domains/' + domain + '/overview.md'] = '# ' + upperDomain + ' Domain Overview\n\nPurpose: Handle ' + domain + ' related business logic.\nStatus: PARTIAL\n';
  files['domains/' + domain + '/frontend.md'] = '# ' + upperDomain + ' Frontend\n\nUI components and pages for ' + domain + '.\n';
  files['domains/' + domain + '/backend.md'] = '# ' + upperDomain + ' Backend\n\nServices and Repositories for ' + domain + '.\n';
  files['domains/' + domain + '/api.md'] = '# ' + upperDomain + ' API\n\nAPI Endpoints under `/api/' + domain + '`.\n';
  files['domains/' + domain + '/database.md'] = '# ' + upperDomain + ' Database\n\nPrisma models related to ' + domain + '.\n';
  files['domains/' + domain + '/task-log.md'] = '# ' + upperDomain + ' Task Log\n\n- [ ] Initial setup\n';
});

for (const filepath of Object.keys(files)) {
  fs.writeFileSync(path.join(docsDir, filepath), files[filepath].trim() + '\n');
}

console.log('AI documentation system generated successfully.');
