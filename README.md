# Load Estimate Calculator — Floot source snapshot

This ZIP contains the application-specific source used in the Floot project, plus the shared UI primitives directly used by the calculator.

Floot project ID:
c8e1e92e-fd87-4f89-b295-e26fda94b31d

Main files:
- pages/_index.tsx — calculator UI and sizing logic
- pages/_index.module.css — calculator styling
- endpoints/estimates_POST.ts — persistence endpoint
- endpoints/estimates_POST.schema.ts — request validation/client
- helpers/db.tsx and helpers/schema.tsx — PostgreSQL/Kysely layer
- components/Button.* / Input.* / Badge.* — UI primitives used by the page
- base.css — design tokens

The project uses Floot's runtime and seeded component system. This is therefore a Floot source snapshot, not a drop-in Vite/Next.js project. The database is provisioned by Floot and exposes FLOOT_DATABASE_URL.

Important: the current MVP's sizing formulas are intentionally simple. Before using it for production solar quotations, the engineering model should be reviewed and the requested manual-override audit trail should be completed.
