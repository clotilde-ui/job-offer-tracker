import "dotenv/config";
import { defineConfig } from "prisma/config";

function getDatasourceUrl(): string {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    return `${tursoUrl}?authToken=${encodeURIComponent(tursoToken)}`;
  }
  return "file:./dev.db";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatasourceUrl(),
  },
});
