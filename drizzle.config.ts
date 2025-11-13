// Drizzle configuration for migrations and schema management
import dotenv from "dotenv";

dotenv.config();

const config = {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql" as const,
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sparti_db",
  },
};

export default config;

