-- Convention électronique de compte-titres (art. 66 loi 22/069)

CREATE TABLE "securities_account_convention" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "partnerBankName" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "securities_account_convention_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "securities_account_convention_version_key" ON "securities_account_convention"("version");

CREATE TABLE "securities_account_agreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "signedName" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "pdfSha256" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT true,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "securities_account_agreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "securities_account_agreement_userId_conventionId_key" ON "securities_account_agreement"("userId", "conventionId");
CREATE INDEX "securities_account_agreement_userId_signedAt_idx" ON "securities_account_agreement"("userId", "signedAt");

ALTER TABLE "securities_account_agreement" ADD CONSTRAINT "securities_account_agreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "securities_account_agreement" ADD CONSTRAINT "securities_account_agreement_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "securities_account_convention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
