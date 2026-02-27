ALTER TABLE "fee_payments" ADD COLUMN "isVoided" boolean DEFAULT false NOT NULL;
ALTER TABLE "fee_payments" ADD COLUMN "voidReason" text;
ALTER TABLE "finance_transactions" ADD COLUMN "isVoided" boolean DEFAULT false NOT NULL;