import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    // "vercel" builds for Vercel serverless deploys (bun run dev is unaffected).
    // Use "node-server" instead when deploying to a plain VM/long-lived server.
    preset: "vercel"
  }
});
