import { config } from "dotenv";
config({ path: ".env" });
config({ path: "../equity-bank/.env" });

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
  const bank = await prisma.partnerBank.findUnique({ where: { code: "EQUITY" } });
  console.log(
    JSON.stringify(
      {
        found: !!bank,
        code: bank?.code,
        interopMode: bank?.interopMode,
        oauthClientId: bank?.oauthClientId,
        oauthClientSecret: bank?.oauthClientSecret
          ? `${bank.oauthClientSecret.slice(0, 8)}…`
          : null,
        authorizeUrl: bank?.authorizeUrl,
        tokenUrl: bank?.tokenUrl,
        userinfoUrl: bank?.userinfoUrl,
        equityEnvClientId: process.env.EKONZO_CLIENT_ID,
        match:
          bank?.oauthClientId === process.env.EKONZO_CLIENT_ID &&
          bank?.oauthClientSecret === process.env.EKONZO_CLIENT_SECRET,
      },
      null,
      2,
    ),
  );

  const sessions = await prisma.bankPaymentSession.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      partnerBankId: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  console.log("recent sessions", sessions.length, sessions);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
