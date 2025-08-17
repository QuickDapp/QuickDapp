import { defineConfig } from "drizzle-kit"
import { serverConfig } from "./src/shared/config/env"

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: serverConfig.DATABASE_URL,
  },
  verbose: true,
  strict: true,
})
