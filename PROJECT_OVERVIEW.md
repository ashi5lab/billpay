# Zalish BillingApp - Project Overview

## Introduction
BillingApp is a multi-purpose billing Progressive Web App (PWA) built for **Zalish Boutique**. It handles core retail operations including invoicing, expense tracking, advance payments, and maintaining a product catalog.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (using `pg` driver)
- **UI Components**: React 19, Recharts for data visualization

## Project Structure
- **`/app`**: Contains the Next.js App Router layout and pages.
  - **`/api`**: Backend REST API routes handling the business logic.
    - `/auth`: Authentication endpoints.
    - `/catalog`: Product catalog management.
    - `/config`: Store configuration (name, address, GSTIN).
    - `/expenses`: Expense tracking and categorization.
    - `/invoices`: Invoice generation and retrieval.
    - `/reports`: Data aggregation for dashboard charting.
    - `/advances`: Customer advance payment tracking.
  - `page.tsx`: The main application view and dashboard.
  - `globals.css`: Global styling overrides and Tailwind imports.
  - `manifest.webmanifest`: PWA configuration.
- **`/components`**: Reusable React components (e.g., `pwa-registration.tsx`).
- **`/db`**: Database schemas and configurations.
  - `zalish-schema.sql`: Complete PostgreSQL schema with table definitions, extensions (`pgcrypto`), and initial seed data.
- **`/public`**: Static assets for the PWA.

## Key Features
1. **Dashboard & Analytics**: Visualizes daily/monthly sales and expenses using Recharts.
2. **Invoicing**: Create and manage customer invoices.
3. **Product Catalog**: Manage inventory items with default and cost prices.
4. **Expense Management**: Track store expenses with customizable categories.
5. **Advance Payments**: Record advance payments from customers.
6. **PWA Support**: Can be installed on mobile/desktop devices as a native-like offline-capable application.
7. **Data Integrity**: Soft deletion is implemented across all business data (`deleted_at`) rather than hard deletion to preserve historical records.

## Database Schema Highlights
All tables are prefixed with `zalish_` for isolation.
- `zalish_store_config`: Store metadata.
- `zalish_users`: Admin/staff authentication (using `pgcrypto` for password hashing).
- `zalish_items`: Product catalog.
- `zalish_expenses` & `zalish_expense_categories`: Expense tracking.
- `zalish_advances`: Advance payments.

## Getting Started
1. **Environment Setup**: Copy `.env.example` to `.env.local` and define `DATABASE_URL` (your PostgreSQL connection string) and `AUTH_SECRET`.
2. **Database Initialization**: Execute `db/zalish-schema.sql` against your PostgreSQL instance. This creates the default admin user (`admin@zalish.local` / `root`).
3. **Run Locally**:
   ```bash
   npm install
   npm run dev
   ```
4. **Deployment**: Compatible with Railway, Vercel, or any standard Node.js hosting platform. Ensure environment variables are set in your production environment.
