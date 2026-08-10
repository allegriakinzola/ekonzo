-- Banque partenaire choisie à la signature (tenue du compte-titres)
ALTER TABLE "securities_account_agreement"
ADD COLUMN IF NOT EXISTS "partnerBankCode" TEXT,
ADD COLUMN IF NOT EXISTS "partnerBankName" TEXT;

-- Backfill pour les signatures déjà existantes (si applicable)
UPDATE "securities_account_agreement" a
SET
  "partnerBankCode" = COALESCE(a."partnerBankCode", 'EQUITY_BCDC'),
  "partnerBankName" = COALESCE(
    a."partnerBankName",
    (
      SELECT c."partnerBankName"
      FROM "securities_account_convention" c
      WHERE c."id" = a."conventionId"
    ),
    'Equity BCDC'
  )
WHERE a."partnerBankCode" IS NULL OR a."partnerBankName" IS NULL;

ALTER TABLE "securities_account_agreement"
ALTER COLUMN "partnerBankCode" SET NOT NULL,
ALTER COLUMN "partnerBankName" SET NOT NULL;
