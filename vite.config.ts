import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "/dispatch/",    // tell Vite your repo subpath
  server: { port: 5173 }
});
