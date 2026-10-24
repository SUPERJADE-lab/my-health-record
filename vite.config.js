import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the build works under https://<id>.github.io/<repo>/
export default defineConfig({ plugins: [react()], base: "./" });
