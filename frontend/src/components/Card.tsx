import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  icon,
  children,
  actions,
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            {icon && <span className="text-indigo-400">{icon}</span>}
            <div>
              {title && (
                <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-red-400"
        : tone === "warn"
          ? "text-amber-400"
          : "text-slate-100";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}