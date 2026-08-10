import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { hash } from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Format aligné sur login / better-auth :
 * 9 chiffres sans 0 ni +243, préfixe 8 ou 9 (ex. 890000001).
 * Surcharge possible : SEED_ADMIN_PHONE=812345678
 */
function normalizeSeedPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("243") && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits;
}

async function main() {
  const phone = normalizeSeedPhone(process.env.SEED_ADMIN_PHONE ?? "890000001");

  if (!/^[89]\d{8}$/.test(phone)) {
    throw new Error(
      `SEED_ADMIN_PHONE invalide ("${phone}"). Attendu : 9 chiffres débutant par 8 ou 9 (ex. 890000001).`,
    );
  }

  const email = `${phone}@phone.ekonzo.cd`;
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      phoneNumber: phone,
      phoneNumberVerified: true,
      kycStatus: "VERIFIED",
      emailVerified: true,
    },
    create: {
      name: "Administrateur ekonzo",
      email,
      emailVerified: true,
      phoneNumber: phone,
      phoneNumberVerified: true,
      role: "ADMIN",
      kycStatus: "VERIFIED",
    },
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: email } },
    update: { password: hashedPassword },
    create: {
      userId: user.id,
      accountId: email,
      providerId: "credential",
      password: hashedPassword,
    },
  });

  console.log(`✅ Admin créé — tél: ${phone} | mot de passe: ${password}`);
  console.log(`   Connexion : saisir ${phone} (ou +243${phone}) sur /login`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
