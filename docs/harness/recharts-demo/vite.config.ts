import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" so dist/ works from any folder or static host.
export default defineConfig({ base: "./", plugins: [react(), tailwindcss()],
  // Recharts plus d3 is about 600 kB unsplit. Fine for a demo; split routes in a real app.
  build: { chunkSizeWarningLimit: 800 },
});
