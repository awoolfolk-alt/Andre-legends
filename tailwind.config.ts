import type { Config } from "tailwindcss";

// Tailwind settings: where to look for class names, and our custom theme.
export default {
  // Tailwind scans these files and only builds the CSS for classes we actually use.
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Custom colors. These create classes like bg-navy, text-legacy, text-energy.
      // legacy = the hero's gold, energy = the blue sword glow.
      colors: {
        navy: "#0d1830",
        legacy: "#d4a72c",
        energy: "#4fd1ff",
      },
      // font-display uses Cinzel (loaded in layout.tsx), with serif as a fallback.
      fontFamily: {
        display: ["Cinzel", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
