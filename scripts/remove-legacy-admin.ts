import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const old = await prisma.user.findFirst({
    where: { phoneNumber: "+243000000001" },
  });
  if (old) {
    await prisma.session.deleteMany({ where: { userId: old.id } });
    await prisma.account.deleteMany({ where: { userId: old.id } });
    await prisma.auditLog.deleteMany({ where: { userId: old.id } });
    await prisma.user.delete({ where: { id: old.id } });
    console.log("Ancien admin +243000000001 supprimé");
  } else {
    console.log("Ancien admin déjà absent");
  }

  const left = await prisma.user.findMany({
    select: { phoneNumber: true, name: true, role: true },
  });
  console.log("Restants:", left);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
