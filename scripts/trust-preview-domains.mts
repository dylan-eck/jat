// Runs before `next build` on Vercel. Neon Auth only redirects back to trusted
// origins, and its wildcards can't match Vercel's preview hostnames without
// trusting every *.vercel.app site. So each preview build trusts its own URLs
// on its own Neon branch (created by the Neon Vercel integration). Production
// and local builds do nothing.

if (process.env.VERCEL_ENV !== "preview") {
  process.exit(0);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in the Vercel Preview environment.`);
  }
  return value;
}

const apiKey = requiredEnv("NEON_API_KEY");
const projectId = requiredEnv("NEON_PROJECT_ID");
const dbHost = new URL(requiredEnv("DATABASE_URL_UNPOOLED")).hostname;
const api = `https://console.neon.tech/api/v2/projects/${projectId}`;

async function neon<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Neon API ${path}: ${res.status} ${await res.text()}`);
  }
  // Adding a domain answers 201 with an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// The integration injects the preview branch's connection string, so its
// compute host identifies the branch.
const { endpoints } = await neon<{
  endpoints: { host: string; branch_id: string }[];
}>("/endpoints");
const branchId = endpoints.find((e) => e.host === dbHost)?.branch_id;
if (!branchId) {
  throw new Error(`No Neon endpoint matches ${dbHost}.`);
}

// The stable per-branch alias and this deployment's own URL.
const origins = [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
  .filter((host) => host)
  .map((host) => `https://${host}`);

const { domains } = await neon<{ domains: { domain: string }[] }>(
  `/branches/${branchId}/auth/domains`,
);
const trusted = new Set(domains.map((d) => d.domain));

for (const domain of origins.filter((o) => !trusted.has(o))) {
  await neon(`/branches/${branchId}/auth/domains`, {
    method: "POST",
    body: JSON.stringify({ domain, auth_provider: "better_auth" }),
  });
  console.log(`Trusted ${domain} on Neon branch ${branchId}.`);
}
