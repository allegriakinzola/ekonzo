import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Le CLI Prisma (migrate, studio) utilise la connexion directe (non-pooler).
    url: env("DIRECT_URL"),
  },
});
