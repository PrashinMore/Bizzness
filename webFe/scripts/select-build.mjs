/**
 * Selects the correct production build for the host.
 *
 * - Cloudflare Workers Builds sets WORKERS_CI=1 → run OpenNext once
 * - OpenNext itself invokes `npm run build` again → plain `next build`
 * - Vercel / local → plain `next build`
 */
import { spawnSync } from "node:child_process";

const isWorkersCi = process.env.WORKERS_CI === "1";
const openNextAlreadyRunning = process.env.OPEN_NEXT_RUNNING === "1";

const useOpenNext = isWorkersCi && !openNextAlreadyRunning;

const args = useOpenNext
  ? ["opennextjs-cloudflare", "build"]
  : ["next", "build"];

const env = {
  ...process.env,
  ...(useOpenNext ? { OPEN_NEXT_RUNNING: "1" } : {}),
};

const result = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env,
});

process.exit(result.status ?? 1);
