import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Проксируем GraphQL через тот же origin, чтобы httpOnly session cookie
    // работала в dev так же, как в проде (nginx).
    proxy: {
      "/graphql": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
});
