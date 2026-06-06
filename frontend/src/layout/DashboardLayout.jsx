import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Inbox,
  SlidersHorizontal,
  Sparkles,
  ScrollText,
  Cloud,
  Package2,
  CircleDot,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard", end: true },
  { to: "/discovery", label: "Product Discovery", icon: Search, testid: "nav-discovery" },
  { to: "/imports", label: "Import List", icon: Inbox, testid: "nav-imports" },
  { to: "/ai", label: "AI Settings", icon: Sparkles, testid: "nav-ai" },
  { to: "/logs", label: "Activity Logs", icon: ScrollText, testid: "nav-logs" },
  { to: "/cloud", label: "Cloud / License", icon: Cloud, testid: "nav-cloud" },
  { to: "/releases", label: "Plugin Releases", icon: Package2, testid: "nav-releases" },
];

function Sidebar() {
  const { data: license } = useQuery({
    queryKey: ["license"],
    queryFn: endpoints.licenseStatus,
    staleTime: 60_000,
  });

  return (
    <aside
      data-testid="sidebar"
      className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-30"
    >
      <div className="px-5 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white grid place-items-center font-display font-bold">
            N
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-slate-900">NIPS-AI</span>
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">Dropshipping Cloud</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1 nips-scroll">
        {NAV.map(({ to, label, icon: Icon, testid, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={`sidebar-${testid}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div
          data-testid="sidebar-cloud-status"
          className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs flex items-start gap-2"
        >
          <CircleDot className="w-4 h-4 text-emerald-500 mt-0.5" />
          <div>
            <div className="font-medium text-slate-700">Cloud connected</div>
            <div className="text-slate-500">api.nipsdownloads.com</div>
            <div className="text-slate-400 mt-1">
              License: {license?.plan ? `${license.plan} • ${license.key?.slice(-4)}` : "—"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardLayout() {
  return (
    <div className="App min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
