import { useEffect, useState } from "react";

function relativeLabel(lastUpdated: number): string {
  const secs = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000));
  if (secs < 5) return "ahora mismo";
  if (secs < 60) return `hace ${secs} s`;
  const mins = Math.floor(secs / 60);
  return `hace ${mins} min`;
}

export function UpdateIndicator({
  lastUpdated,
  intervalMs = 30_000,
}: {
  lastUpdated: number | null;
  intervalMs?: number;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (lastUpdated === null) return null;

  const autoText = intervalMs >= 60_000
    ? ` cada ${Math.round(intervalMs / 60_000)} min`
    : ` cada ${intervalMs / 1000} s`;

  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
      <span className="flex h-2 w-2 items-center justify-center">
        <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      Actualizado {relativeLabel(lastUpdated)}
      <span className="text-slate-600">·</span>
      <span>auto {autoText}</span>
    </span>
  );
}