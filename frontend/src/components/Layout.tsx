import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  LayoutDashboard,
  LogOut,
  Server,
  ShieldCheck,
} from "lucide-react";
import { logout } from "../api/client";
import type { ReactNode } from "react";

const NAV_ITEMS: { to: string; label: string; icon: ReactNode }[] = [
  { to: "/", label: "Resumen", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/monitors", label: "Monitores", icon: <Server className="h-4 w-4" /> },
  { to: "/incidents", label: "Incidentes", icon: <AlertTriangle className="h-4 w-4" /> },
  { to: "/metrics", label: "Métricas", icon: <BarChart3 className="h-4 w-4" /> },
  { to: "/insights", label: "Insights IA", icon: <BrainCircuit className="h-4 w-4" /> },
];

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <aside className="flex w-60 flex-col border-r border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">OpsMind</p>
            <p className="text-xs text-slate-500">Panel operativo</p>
          </div>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 px-3 py-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Sesión autenticada
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}