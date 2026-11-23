import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  trailingSlash: "always",
  // Keep the forum independent of the parent blog's PostCSS plugins.
  vite: { css: { postcss: { plugins: [] } } },
});
