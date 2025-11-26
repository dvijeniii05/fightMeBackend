import postgres from "postgres";
import { config } from "dotenv";

config();

const sql = postgres(process.env.DB_URL!);

async function checkDrizzleSchema() {
  try {
    console.log("Checking for drizzle schema migrations table...\n");

    // Check if there's a migrations table in the drizzle schema
    const drizzleMigrations = await sql`
      SELECT * FROM drizzle.__drizzle_migrations ORDER BY id
    `.catch(() => null);

    if (drizzleMigrations) {
      console.log("✅ Found migrations in drizzle schema:");
      console.table(drizzleMigrations);
    } else {
      console.log("❌ No drizzle.__drizzle_migrations table found");
    }

    // Also check public schema
    const publicMigrations = await sql`
      SELECT * FROM public.__drizzle_migrations ORDER BY id
    `.catch(() => null);

    if (publicMigrations) {
      console.log("\n✅ Found migrations in public schema:");
      console.table(publicMigrations);
    } else {
      console.log("\n❌ No public.__drizzle_migrations table found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sql.end();
  }
}

checkDrizzleSchema();
