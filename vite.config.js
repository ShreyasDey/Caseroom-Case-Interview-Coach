import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // forwards browser calls to /api/* over to the Express proxy
      "/api": "http://localhost:3001",
    },
  },
});
