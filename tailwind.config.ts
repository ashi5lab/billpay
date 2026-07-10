import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { brand: { 50: "#f6f2ff", 100: "#eee6ff", 200: "#ddd0ff", 500: "#7c3aed", 600: "#6d28d9", 700: "#5b21b6", 900: "#3b0764" } } } }, plugins: [] } satisfies Config;
