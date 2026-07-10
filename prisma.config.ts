import "dotenv/config";
import { defineConfig } from "prisma/config";

// DIRECT_DATABASE_URL is only required for migrations (direct non-pooled connection).
// prisma generate runs at build time and does not connect to the database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
