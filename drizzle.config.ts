// Drizzle configuration for migrations and schema management
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

const config: Config = {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sparti_db",
  },
};

export default config;

