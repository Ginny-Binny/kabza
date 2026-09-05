import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // reachable from the LAN, e.g. a phone on the same wifi
    proxy: {
      "/ws": { target: "ws://localhost:8090", ws: true },
    },
  },
});
