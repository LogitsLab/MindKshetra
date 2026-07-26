import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // sweph is a native addon; keep it out of any transform pipeline.
    server: { deps: { external: ["sweph"] } },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // lib/content/db.ts imports "server-only", a build-time marker with no
      // runtime resolution outside Next's bundler. Alias it to a no-op so the
      // real modules can be exercised instead of reimplementations.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
});
