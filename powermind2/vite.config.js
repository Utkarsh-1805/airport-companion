import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    fs: {
      // Allow Vite to serve files from the parent monorepo root so that any
      // sibling project (e.g. the original `Airport Rag/` map data, kept for
      // reference) can still be imported during development if needed.
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
