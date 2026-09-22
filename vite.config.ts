/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/stegolens/",
  plugins: [react()],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});