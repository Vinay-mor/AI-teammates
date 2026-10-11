import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to connect to Neon.");
}

const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.set("sslmode", "verify-full");

export const pool = new Pool({ connectionString: connectionUrl.toString() });

export const db = drizzle({ client: pool, schema });
