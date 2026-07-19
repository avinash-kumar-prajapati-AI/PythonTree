import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    // "vercel" builds for Vercel serverless deploys (bun run dev is unaffected).
    // Use "node-server" instead when deploying to a plain VM/long-lived server.
    preset: "vercel",
    // The db client picks its libsql flavor with a top-level await, which
    // nitro's default es2019 target rejects; every deploy target runs
    // Node 18+, so es2022 is safe.
    esbuild: { options: { target: "es2022" } }
  }
});
