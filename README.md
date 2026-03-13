<div align="center">

<img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=for-the-badge&labelColor=0f172a" />
<img src="https://img.shields.io/badge/node-18+-10b981?style=for-the-badge&labelColor=0f172a" />
<img src="https://img.shields.io/badge/license-MIT-f59e0b?style=for-the-badge&labelColor=0f172a" />
<img src="https://img.shields.io/badge/status-production--ready-22c55e?style=for-the-badge&labelColor=0f172a" />

<br /><br />

```
███████╗███╗   ███╗ █████╗ ██╗██╗     
██╔════╝████╗ ████║██╔══██╗██║██║     
█████╗  ██╔████╔██║███████║██║██║     
██╔══╝  ██║╚██╔╝██║██╔══██║██║██║     
███████╗██║ ╚═╝ ██║██║  ██║██║███████╗
╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝
███████╗██╗   ██╗██╗████████╗███████╗ 
██╔════╝██║   ██║██║╚══██╔══╝██╔════╝ 
███████╗██║   ██║██║   ██║   █████╗   
╚════██║██║   ██║██║   ██║   ██╔══╝   
███████║╚██████╔╝██║   ██║   ███████╗ 
╚══════╝ ╚═════╝ ╚═╝   ╚═╝   ╚══════╝ 
```

### The complete email intelligence platform — track, analyze, and optimize every send.

<br />

[**Live Demo**](https://emailsuite.dev) · [**API Reference**](./API.md) · [**Deployment Guide**](./DEPLOYMENT.md) · [**Security**](./SECURITY.md)

<br />

</div>

---

## What Is Email Suite?

Email Suite is a **full-stack email tracking and analytics platform** built for teams that need more than open-rate graphs. It handles real-time pixel tracking, per-link click attribution, PDF engagement heatmaps, and AI-driven send-time optimization — all wrapped in a multi-tenant SaaS billing layer powered by Stripe.

Whether you're sending a single transactional email or a 10,000-recipient campaign, every interaction is captured, stored, and surfaced in your analytics dashboard within seconds.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Security Model](#security-model)
- [Pricing & Billing](#pricing--billing)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Email Tracking

| Feature | Description |
|---------|-------------|
| **Real-time open tracking** | Invisible 1×1 pixel fires an event on open; deduplicates across devices |
| **Link click tracking** | Every link replaced with a tracked redirect; retains UTM parameters |
| **PDF attachment tracking** | Embedded tracking detects when attachments are opened and scrolled |
| **Group email analytics** | Per-recipient breakdown for group sends — no aggregate-only views |

### Campaign Management

| Feature | Description |
|---------|-------------|
| **Mass sending** | Batched queue handles 10,000+ recipients with automatic rate limiting |
| **Mail merge** | Handlebars-style variable substitution with CSV or API data sources |
| **Scheduled campaigns** | Cron-based scheduler with timezone awareness per recipient |
| **A/B testing** | Split-test subjects, sender names, and body content with statistical significance tracking |

### AI-Powered Insights

| Feature | Description |
|---------|-------------|
| **Subject line suggestions** | LLM-generated rewrites ranked by predicted open rate |
| **Send time optimization** | Per-recipient time prediction trained on your historical engagement data |
| **Response suggestions** | Context-aware reply drafts surfaced in your inbox integration |
| **Sentiment analysis** | Tone scoring on outbound content to catch accidental off-brand messaging |

### Analytics & Reporting

| Feature | Description |
|---------|-------------|
| **Engagement metrics** | Opens, clicks, device types, geolocation, and time-on-email |
| **Performance dashboards** | Real-time charts with configurable date ranges and segment filters |
| **Export capabilities** | One-click CSV and PDF report generation |
| **Team collaboration** | Shared dashboards with role-based access control |

---

## Architecture

```
                        ┌─────────────────────────────────┐
                        │           CLIENT LAYER           │
                        │  Web App · Mobile · Browser Ext  │
                        └────────────────┬────────────────┘
                                         │ HTTPS
                        ┌────────────────▼────────────────┐
                        │           API GATEWAY            │
                        │   Rate Limiting · Auth · Logs    │
                        └──┬──────────────────────────┬───┘
                           │                          │
              ┌────────────▼──────────┐  ┌────────────▼──────────┐
              │    Core API Service    │  │   Tracking Ingestor   │
              │  Campaigns · Analytics │  │  Pixel · Click · PDF  │
              │  AI · Billing          │  │  (High-throughput)    │
              └────────────┬──────────┘  └────────────┬──────────┘
                           │                          │
              ┌────────────▼──────────────────────────▼──────────┐
              │                   Message Queue                    │
              │              (Redis Streams / BullMQ)              │
              └──────────────────────┬────────────────────────────┘
                                     │
              ┌──────────────────────▼────────────────────────────┐
              │                 Worker Layer                       │
              │   Email Sender · AI Processor · Report Generator   │
              └──────────────────────┬────────────────────────────┘
                                     │
        ┌──────────┬─────────────────┼──────────────────┬─────────┐
        │          │                 │                  │         │
   ┌────▼───┐ ┌────▼───┐      ┌──────▼─────┐     ┌────▼───┐ ┌───▼────┐
   │Postgres│ │ Redis  │      │ClickHouse  │     │  S3    │ │Stripe  │
   │Metadata│ │Cache + │      │Event Store │     │Artifacts│ │Billing │
   │& Users │ │Sessions│      │& Analytics │     │& Media  │ │        │
   └────────┘ └────────┘      └────────────┘     └────────┘ └────────┘
```

**Key design decisions:**

- **Event store separation** — tracking events go to ClickHouse (columnar, fast aggregation) while relational data lives in Postgres. This lets the analytics layer scale independently of the transactional database.
- **Queue-backed sends** — no email is sent synchronously in a request/response cycle. All sends go through BullMQ, enabling retries, backpressure, and concurrency control.
- **Tracking ingestor is isolated** — the pixel/click endpoint is a separate lightweight service so tracking never competes with API resources.

---

## Tech Stack

**Backend**

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (TypeScript) |
| API framework | Fastify |
| Queue | BullMQ + Redis |
| ORM | Prisma |
| Primary DB | PostgreSQL |
| Analytics DB | ClickHouse |
| Cache | Redis |
| Object storage | AWS S3 / MinIO |

**Frontend**

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State | Zustand + React Query |

**AI / ML**

| Layer | Technology |
|-------|-----------|
| LLM integration | OpenAI API (GPT-4o) |
| Send-time model | Python service (scikit-learn) |
| Sentiment | Hugging Face Inference API |

**Infrastructure**

| Layer | Technology |
|-------|-----------|
| Containers | Docker + Docker Compose |
| Orchestration | Kubernetes (optional) |
| IaC | Terraform (AWS / GCP / Azure) |
| Monitoring | Prometheus + Grafana |
| Billing | Stripe Subscriptions + Usage |

---

## Quick Start

### Prerequisites

```
Node.js 18+
Docker 24+
PostgreSQL 15+ (or use the Docker Compose stack)
Redis 7+
```

### 1. Clone and install

```bash
git clone https://github.com/your-org/email-suite.git
cd email-suite
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — the minimum required variables to get started:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/emailsuite"
REDIS_URL="redis://localhost:6379"

# Email sending
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"

# AI features (optional for local dev)
OPENAI_API_KEY="sk-..."

# Stripe (optional for local dev)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TRACKING_BASE_URL="http://localhost:3001"
JWT_SECRET="change-me-in-production"
```

### 3. Start the stack

```bash
# Start all infrastructure (Postgres, Redis, ClickHouse)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Seed demo data (optional)
npm run db:seed

# Start the development servers
npm run dev
```

The web app will be at `http://localhost:3000`.  
The API runs at `http://localhost:3001`.  
The tracking ingestor runs at `http://localhost:3002`.

### 4. Send your first tracked email

```bash
curl -X POST http://localhost:3001/api/v1/send \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from Email Suite",
    "html": "<p>Click <a href=\"https://example.com\">here</a> to visit us.</p>",
    "tracking": {
      "opens": true,
      "clicks": true
    }
  }'
```

Check your dashboard at `http://localhost:3000/dashboard` to see the event arrive.

---

## Configuration

All configuration is driven by environment variables. See [`.env.example`](./.env.example) for the full annotated reference. Key sections:

| Variable group | Purpose |
|----------------|---------|
| `DATABASE_*` | Postgres connection |
| `REDIS_*` | Cache and queue backend |
| `CLICKHOUSE_*` | Analytics event store |
| `SMTP_*` | Email delivery credentials |
| `OPENAI_*` | AI feature enablement |
| `STRIPE_*` | Subscription billing |
| `TRACKING_*` | Pixel and click ingestion endpoint |
| `RATE_LIMIT_*` | Per-plan send and API rate limits |

For production-specific tuning, see [OPTIMIZATION.md](./OPTIMIZATION.md).

---

## Project Structure

```
email-suite/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/              # App Router pages and layouts
│   │   ├── components/       # Shared UI components
│   │   └── lib/              # API client, hooks, utilities
│   │
│   ├── api/                  # Core API service (Fastify)
│   │   ├── routes/           # Endpoint handlers
│   │   ├── services/         # Business logic
│   │   │   ├── campaigns/    # Campaign orchestration
│   │   │   ├── ai/           # AI feature integrations
│   │   │   ├── billing/      # Stripe integration
│   │   │   └── analytics/    # Query layer over ClickHouse
│   │   └── workers/          # BullMQ job processors
│   │
│   └── tracker/              # Lightweight tracking ingestor
│       ├── pixel.ts          # Open tracking endpoint
│       ├── click.ts          # Click redirect endpoint
│       └── pdf.ts            # PDF engagement endpoint
│
├── packages/
│   ├── db/                   # Prisma schema + migrations
│   ├── queue/                # Shared BullMQ definitions
│   └── types/                # Shared TypeScript types
│
├── infrastructure/
│   ├── terraform/            # Cloud resource definitions
│   ├── kubernetes/           # K8s manifests
│   └── monitoring/           # Prometheus + Grafana configs
│
├── docs/
│   ├── API.md                # Complete API reference
│   ├── DEPLOYMENT.md         # Production deployment guide
│   ├── DEVELOPMENT.md        # Local dev deep-dive
│   ├── OPTIMIZATION.md       # Performance tuning
│   └── SECURITY.md           # Security architecture
│
├── docker-compose.yml        # Local dev stack
├── .env.example              # Annotated environment template
└── package.json              # Monorepo root
```

---

## API Overview

All endpoints require a `Bearer` token in the `Authorization` header. Full documentation lives in [API.md](./API.md).

### Sending

```http
POST   /api/v1/send                    Single tracked email
POST   /api/v1/campaigns               Create campaign
POST   /api/v1/campaigns/:id/send      Launch campaign
POST   /api/v1/campaigns/:id/schedule  Schedule campaign
```

### Tracking (ingestor service)

```http
GET    /t/o/:trackingId.gif            Open pixel endpoint
GET    /t/c/:linkId                    Click redirect endpoint
POST   /t/p/:attachmentId             PDF engagement event
```

### Analytics

```http
GET    /api/v1/analytics/overview      Account-level summary
GET    /api/v1/analytics/emails/:id    Per-email breakdown
GET    /api/v1/analytics/campaigns/:id Campaign performance
GET    /api/v1/analytics/export        Download CSV / PDF report
```

### AI

```http
POST   /api/v1/ai/subject-suggestions  Generate subject line alternatives
POST   /api/v1/ai/send-time            Predict optimal send time
POST   /api/v1/ai/sentiment            Score content tone
POST   /api/v1/ai/reply-suggestions    Draft reply recommendations
```

### Billing

```http
GET    /api/v1/billing/plans           Available plans
POST   /api/v1/billing/subscribe       Start or change subscription
GET    /api/v1/billing/usage           Current period usage
POST   /api/v1/billing/portal          Create Stripe customer portal session
```

---

## Deployment

Three supported paths — pick what fits your infrastructure.

### Option A: Docker Compose (small teams / self-hosted)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Runs the full stack on a single host. Suitable for up to ~500k tracked events/month.

### Option B: Kubernetes (scalable)

```bash
kubectl apply -f infrastructure/kubernetes/
```

Each service scales independently. The tracker ingestor is designed to run at 10+ replicas under load. See [DEPLOYMENT.md](./DEPLOYMENT.md) for namespace, ingress, and HPA configuration.

### Option C: Managed cloud (Terraform)

```bash
cd infrastructure/terraform
terraform init
terraform apply -var-file="environments/prod.tfvars"
```

Provisions RDS (Postgres), ElastiCache (Redis), ClickHouse Cloud, S3, and ECS/GKE/AKS depending on your provider. See [DEPLOYMENT.md](./DEPLOYMENT.md) for per-cloud variable files.

---

## Security Model

> Full details in [SECURITY.md](./SECURITY.md).

- **Authentication**: JWT with short-lived access tokens and rotating refresh tokens. API keys for server-to-server integrations.
- **Multi-tenancy isolation**: All database queries are scoped by `organizationId` enforced at the ORM layer, not the application layer.
- **Tracking privacy**: IP addresses are hashed before storage. Geo-lookup uses the hashed IP and the raw address is never persisted.
- **Secrets**: All credentials are injected via environment variables. No secrets in source control. HashiCorp Vault integration available for production.
- **Stripe webhooks**: All inbound Stripe events are verified with the webhook signing secret before processing.
- **Rate limiting**: Per-plan limits enforced at the API gateway. Separate, lower limits on unauthenticated tracking endpoints.

To report a vulnerability, email **security@emailsuite.dev** — do not open a public issue.

---

## Pricing & Billing

Email Suite ships billing-ready with four Stripe-backed tiers.

| Plan | Tracked Emails/mo | Campaigns | AI Features | Price |
|------|-------------------|-----------|-------------|-------|
| **Free** | 500 | 1 | — | $0 |
| **Pro** | 25,000 | Unlimited | Included | $29/mo |
| **Business** | 250,000 | Unlimited | Included | $99/mo |
| **Enterprise** | Custom | Custom | Custom | Contact us |

Overages on Pro and Business are billed at $0.001 per additional tracked email. All billing flows through the Stripe customer portal — no custom billing UI to maintain.

---

## Contributing

Contributions are welcome. Please read [DEVELOPMENT.md](./DEVELOPMENT.md) before opening a PR.

```bash
# Run tests
npm run test

# Run linter
npm run lint

# Type-check
npm run typecheck
```

- Branch from `main`, prefix branches with `feat/`, `fix/`, or `chore/`
- All PRs require passing CI and one approving review
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## License

MIT © 2024 Email Suite Contributors — see [LICENSE](./LICENSE) for full terms.

---

<div align="center">

Built to make every email count.

[⬆ Back to top](#what-is-email-suite)

</div>




