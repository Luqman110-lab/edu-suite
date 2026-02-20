-- =============================================================
-- Finance Module Migration: 0001_finance_module.sql
-- Creates double-entry accounting, budgeting, and petty cash tables
-- =============================================================

-- 1. Chart of Accounts
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "account_code" text NOT NULL,
  "account_name" text NOT NULL,
  "account_type" text NOT NULL,       -- Asset | Liability | Equity | Revenue | Expense
  "parent_account_id" integer,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "accounts_school_id_account_code_unique" UNIQUE("school_id", "account_code")
);
--> statement-breakpoint

-- 2. Journal Entries (header)
CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "entry_date" text NOT NULL,
  "reference" text,
  "description" text,
  "status" text DEFAULT 'draft',      -- draft | posted | reversed
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- 3. Journal Lines (debit/credit entries)
CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" serial PRIMARY KEY NOT NULL,
  "journal_entry_id" integer NOT NULL REFERENCES "journal_entries"("id") ON DELETE CASCADE,
  "account_id" integer NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "student_id" integer REFERENCES "students"("id") ON DELETE SET NULL,
  "debit" numeric(15,2) DEFAULT 0,
  "credit" numeric(15,2) DEFAULT 0,
  "description" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- 4. Budgets
CREATE TABLE IF NOT EXISTS "budgets" (
  "id" serial PRIMARY KEY NOT NULL,
  "school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "category_id" integer REFERENCES "expense_categories"("id") ON DELETE SET NULL,
  "term" integer NOT NULL,
  "year" integer NOT NULL,
  "amount_allocated" numeric(15,2) DEFAULT 0,
  "amount_spent" numeric(15,2) DEFAULT 0,
  "is_locked" boolean DEFAULT false,
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "budgets_school_id_category_id_term_year_unique" UNIQUE("school_id", "category_id", "term", "year")
);
--> statement-breakpoint

-- 5. Petty Cash Accounts (imprest)
CREATE TABLE IF NOT EXISTS "petty_cash_accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "custodian_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "float_amount" numeric(15,2) DEFAULT 0,
  "current_balance" numeric(15,2) DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- 6. Petty Cash Transactions
CREATE TABLE IF NOT EXISTS "petty_cash_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "account_id" integer NOT NULL REFERENCES "petty_cash_accounts"("id") ON DELETE CASCADE,
  "transaction_type" text NOT NULL,   -- disbursement | replenishment
  "amount" numeric(15,2) NOT NULL,
  "description" text NOT NULL,
  "reference" text,
  "transaction_date" text NOT NULL,
  "approved_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- 7. Add missing columns to expenses table (approval workflow)
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "document_url" text;

--> statement-breakpoint

-- =============================================================
-- Default Chart of Accounts (seeded for each school on first use)
-- We insert a helper function so each school auto-gets defaults.
-- =============================================================

-- Seed default accounts for each existing school that has no accounts yet
INSERT INTO "accounts" ("school_id", "account_code", "account_name", "account_type")
SELECT
  s.id,
  a.account_code,
  a.account_name,
  a.account_type
FROM "schools" s
CROSS JOIN (VALUES
  ('1000', 'Cash at Bank',              'Asset'),
  ('1010', 'Petty Cash',                'Asset'),
  ('1100', 'Accounts Receivable - Fees','Asset'),
  ('1200', 'Prepaid Expenses',          'Asset'),
  ('2000', 'Accounts Payable',          'Liability'),
  ('2100', 'Accrued Expenses',          'Liability'),
  ('3000', 'School Fund / Equity',      'Equity'),
  ('3100', 'Retained Surplus',          'Equity'),
  ('4000', 'Tuition Fee Income',        'Revenue'),
  ('4100', 'Boarding Fee Income',       'Revenue'),
  ('4200', 'Other Income',              'Revenue'),
  ('5000', 'Staff Salaries',            'Expense'),
  ('5100', 'Teaching Materials',        'Expense'),
  ('5200', 'Utilities',                 'Expense'),
  ('5300', 'Maintenance & Repairs',     'Expense'),
  ('5400', 'General & Admin Expenses',  'Expense'),
  ('5500', 'Transport & Travel',        'Expense')
) AS a(account_code, account_name, account_type)
WHERE NOT EXISTS (
  SELECT 1 FROM "accounts" acc WHERE acc.school_id = s.id
);
