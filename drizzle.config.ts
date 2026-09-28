import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Lê .env.local como o Next faz.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
