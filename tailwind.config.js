export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#0f1216", panel2: "#151a20", edge: "#232a33",
        accent: "#5eead4", accent2: "#38bdf8", warn: "#fbbf24", danger: "#f87171",
        bit: { zero: "#1f2937", one: "#0ea5e9", changed: "#f59e0b", payload: "#22d3ee" }
      }
    }
  },
  plugins: []
};
