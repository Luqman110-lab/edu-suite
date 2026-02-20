-- Fix column type mismatch: migration used numeric(15,2) but Drizzle schema uses integer
-- This aligns the DB with what the Drizzle ORM expects

-- Fix budgets table
ALTER TABLE "budgets"
  ALTER COLUMN "amount_allocated" TYPE integer USING "amount_allocated"::integer,
  ALTER COLUMN "amount_spent" TYPE integer USING "amount_spent"::integer;

-- Fix petty_cash_accounts table
ALTER TABLE "petty_cash_accounts"
  ALTER COLUMN "float_amount" TYPE integer USING "float_amount"::integer,
  ALTER COLUMN "current_balance" TYPE integer USING "current_balance"::integer;

-- Fix petty_cash_transactions table
ALTER TABLE "petty_cash_transactions"
  ALTER COLUMN "amount" TYPE integer USING "amount"::integer;

-- Fix journal_lines (debit/credit) -- already integer in Drizzle schema but was numeric in migration
ALTER TABLE "journal_lines"
  ALTER COLUMN "debit" TYPE integer USING "debit"::integer,
  ALTER COLUMN "credit" TYPE integer USING "credit"::integer;

-- Also make petty_cash_accounts.custodian_id nullable (originally NOT NULL in schema but nullable in practice)
ALTER TABLE "petty_cash_accounts"
  ALTER COLUMN "custodian_id" DROP NOT NULL;
