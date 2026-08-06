import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * DIRECT_URL est préféré pour migrate/studio (endpoint Neon non-pooler).
 * Sur Vercel, le postinstall peut s'exécuter sans toutes les env :
 * on tombe alors sur DATABASE_URL, puis sur une URL placeholder
 * (suffisante pour `prisma generate`, qui n'ouvre pas de connexion).
 */
const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ekonzo?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
