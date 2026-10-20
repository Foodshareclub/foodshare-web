import { cn } from "@/lib/utils";

interface MeshGradientProps {
  className?: string;
  variant?: "primary" | "warm" | "cool" | "sunset";
}

const gradientConfigs = {
  primary: {
    colors: ["#FF2D55", "#FF6B9D", "#f093fb", "#667eea"],
    positions: ["0% 0%", "100% 0%", "100% 100%", "0% 100%"],
  },
  warm: {
    colors: ["#FF9A8B", "#FF6A88", "#FF99AC", "#FCB69F"],
    positions: ["0% 0%", "100% 0%", "100% 100%", "0% 100%"],
  },
  cool: {
    colors: ["#667eea", "#764ba2", "#f093fb", "#f5576c"],
    positions: ["0% 0%", "100% 0%", "100% 100%", "0% 100%"],
  },
  sunset: {
    colors: ["#FA709A", "#FEE140", "#FF9A8B", "#FF6A88"],
    positions: ["0% 0%", "100% 0%", "100% 100%", "0% 100%"],
  },
};

export function MeshGradient({ className, variant = "primary" }: MeshGradientProps) {
  const config = gradientConfigs[variant];

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(at ${config.positions[0]}, ${config.colors[0]} 0%, transparent 50%),
            radial-gradient(at ${config.positions[1]}, ${config.colors[1]} 0%, transparent 50%),
            radial-gradient(at ${config.positions[2]}, ${config.colors[2]} 0%, transparent 50%),
            radial-gradient(at ${config.positions[3]}, ${config.colors[3]} 0%, transparent 50%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
