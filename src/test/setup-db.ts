// Loads DATABASE_URL for db tests before any module creates the pool. CI sets
// it directly, so a missing .env.local is fine.
try {
  process.loadEnvFile(".env.local");
} catch {}
