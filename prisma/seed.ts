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
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ekonzo.cd";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      emailVerified: true,
    },
    create: {
      name: "Administrateur ekonzo",
      email,
      emailVerified: true,
      role: "ADMIN",
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

  console.log(`✅ Admin créé — email: ${email} | mot de passe: ${password}`);
  console.log(`   Connexion : ${email} sur /ministry/login`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
