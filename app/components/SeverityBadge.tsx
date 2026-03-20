import type { Severity } from "../lib/types";

const config: Record<Severity, { label: string; className: string; dot: string }> = {
  critical: {
    label: "Critical",
    className: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    className: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    className: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    dot: "bg-green-500",
  },
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, className, dot } = config[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
