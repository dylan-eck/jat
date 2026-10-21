import "server-only";

// Reads a required server-only variable, failing fast at import time instead
// of on the first request that needs it.
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local.`);
  }
  return value;
}
