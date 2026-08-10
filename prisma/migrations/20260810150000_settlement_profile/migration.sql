-- Profil de règlement (canal préféré MoMo / RIB)
CREATE TABLE IF NOT EXISTS "settlement_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredChannel" "PaymentChannel" NOT NULL DEFAULT 'MOBILE_MONEY',
    "momoPhone" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settlement_profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "settlement_profile_userId_key"
ON "settlement_profile"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settlement_profile_userId_fkey'
  ) THEN
    ALTER TABLE "settlement_profile"
      ADD CONSTRAINT "settlement_profile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
