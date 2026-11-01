import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const dep = (name: string) => fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // ../src has no node_modules of its own.
  resolve: { alias: { react: dep("react"), "react-dom": dep("react-dom") } },
  server: { fs: { allow: [".."] } },
});
