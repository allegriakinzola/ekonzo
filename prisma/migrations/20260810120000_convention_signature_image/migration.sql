-- Signature manuscrite / méthode de signature sur la convention

ALTER TABLE "securities_account_agreement" ADD COLUMN IF NOT EXISTS "signatureMethod" TEXT NOT NULL DEFAULT 'TYPED';
ALTER TABLE "securities_account_agreement" ADD COLUMN IF NOT EXISTS "signatureImagePath" TEXT;
