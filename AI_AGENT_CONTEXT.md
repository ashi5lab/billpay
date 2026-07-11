# Zalish BillingApp - AI Agent Context & Specifications

This document serves as the master knowledge base for any AI agent interacting with this project. It tracks the global requirements, style guidelines, architecture rules, and the most recent changes to ensure context is maintained across sessions.

## 1. Project Overview & Architecture
*   **Purpose**: A multi-purpose Progressive Web App (PWA) for **Zalish Boutique** handling invoicing, expense tracking, advance payments, and catalog management.
*   **Tech Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, PostgreSQL (`pg` library).
*   **Frontend Approach**: A unified dashboard feel. Most logic is heavily consolidated into `app/page.tsx` using conditional rendering based on state (tabs/active views) to emulate a snappy Single Page Application.
*   **Backend Approach**: Next.js API Routes (`app/api/*/route.ts`) handling RESTful requests. Direct raw SQL queries are used via the `pg` pool (`db/index.js` or inline connections).

## 2. Global Styles & UI Requirements
The application enforces strict design tokens defined in `tailwind.config.ts` and `app/globals.css`.

### Brand Colors (Purple/Violet Theme)
*   Primary Brand: `#7c3aed` (500) and `#6d28d9` (600)
*   Soft Accents: `#f6f2ff` (50) and `#eee6ff` (100)

### CSS Component Classes (`globals.css`)
Agents MUST use these pre-defined utility classes rather than raw tailwind strings for these elements to maintain visual consistency:
*   `.card`: `rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`
*   `.button`: `inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300`
*   `.button-secondary`: `inline-flex items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 font-semibold text-brand-700 hover:bg-brand-100`
*   `.label`: `mb-1 block text-sm font-medium text-slate-600`

### General UI Rules
*   **Inputs**: Use the standard input styling defined in `@layer base`: `w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100`
*   **Animations**: Smooth micro-interactions. Elements should have `transition` applied (especially hover states).
*   **Printing**: A `@media print` query in `globals.css` hides everything except the `#receipt` div. Ensure receipt components are wrapped correctly.

## 3. Database Rules (`db/zalish-schema.sql`)
*   **Prefix**: All tables must be prefixed with `zalish_`.
*   **Primary Keys**: Use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
*   **Data Integrity (Soft Deletes)**: Do NOT use hard `DELETE` statements. Tables include a `deleted_at TIMESTAMP` column. Use `UPDATE table SET deleted_at = CURRENT_TIMESTAMP` and filter active records via `WHERE deleted_at IS NULL`.
*   **Audit Trails**: Every row should track `created_at`, `updated_at`, and `created_by` (UUID referencing `zalish_users`).

## 4. Change Log & Recent Specifications
*   **Payment Modes (Completed)**: 
    *   `payment_mode` (UPI, Cash, Card, Bank Transfer) was integrated across **Invoices** (`zalish_invoices`), **Advances** (`zalish_advances`), and **Expenses** (`zalish_expenses`).
    *   A generic `SelectField` UI component was added to `app/page.tsx` to handle these dropdowns efficiently.
    *   A consolidated `PaymentsReport` component was added to the **Reports** tab to aggregate all credits/debits.
*   **Data Export (Completed)**: Added an Excel `.xlsx` export route at `/api/reports/payments-export` mapping the unified payment ledger for accounting.
*   **Patching Resiliency (Known Issue)**: `app/page.tsx` uses `\r\n` line endings. Any programmatic AI replacements (Node scripts or regex) MUST account for `\r?\n` to avoid ReferenceErrors caused by misaligned string matching that skips state variable definitions.

## 5. Agent Instructions
1.  **Read First**: Always read this document to align with the design language.
2.  **No Extraneous Dependencies**: The user prefers lightweight native solutions (like raw `pg` SQL) over heavy ORMs unless explicitly instructed.
3.  **UI Consistency**: Reuse the `Field`, `SelectField`, and `DataTable` abstraction components inside `app/page.tsx` rather than building bespoke tables or forms for new tabs.
4.  **Confirm Changes**: If a change involves a structural modification to `app/page.tsx`, ensure variables are declared and passed appropriately, as the file is massive and interconnected.
