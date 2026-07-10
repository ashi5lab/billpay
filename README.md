# Zalish Billing

Multi-purpose billing PWA foundation, initially configured for **Zalish Boutique**.

## Start

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to Railway's PostgreSQL connection URL.
2. Run `npm install` and `npm run dev`.
3. Apply the schema once: run the contents of `db/zalish-schema.sql` in Railway's PostgreSQL query console.

All Zalish tables deliberately begin with `zalish_`. Future clients should receive their own schema file and UI module following this naming convention.

## Railway

Create a service from this repository, add `DATABASE_URL` as a variable, and deploy. Railway's PostgreSQL public/private connection URL can be used directly. The build command is `npm run build`; the start command is `npm start`.
