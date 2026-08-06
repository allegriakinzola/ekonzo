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

async function main() {
  const phone = "+243000000001";
  const email = `${phone}@phone.ekonzo.cd`;
  const password = "Admin@1234";

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
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
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
