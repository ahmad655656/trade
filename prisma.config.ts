// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
datasource: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_glQHR5T1cdrA@ep-misty-mouse-a4que6i5.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30",
  },

});