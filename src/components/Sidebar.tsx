"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useAlerts } from "@/hooks/useAlerts";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import {
  LiveIcon,
  AlertIcon,
  BusIcon,
  StopIcon,
  RouteIcon,
  ClockIcon,
  CommunityIcon,
  SupportIcon,
  TemplateIcon,
  FlagIcon,
  AuditIcon,
  BusinessIcon,
  CashIcon,
  BeakerIcon,
  LogoutIcon,
} from "@/components/icons";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  section: string;
}

const NAV: NavItem[] = [
  { label: "En vivo", href: "/home", section: "Ops", icon: LiveIcon },
  { label: "Alertas", href: "/alerts", section: "Ops", icon: AlertIcon },
  { label: "Mapa", href: "/map", section: "Ops", icon: RouteIcon },
  { label: "Plantillas", href: "/templates", section: "Ops", icon: TemplateIcon },
  { label: "Soporte", href: "/support", section: "Ops", icon: SupportIcon },

  { label: "Usuarios", href: "/users", section: "Datos", icon: CommunityIcon },
  { label: "Comunidad", href: "/community", section: "Datos", icon: CommunityIcon },
  { label: "Incidencias", href: "/incidents", section: "Datos", icon: CommunityIcon },
  { label: "Paradas", href: "/stops", section: "Datos", icon: StopIcon },
  { label: "Líneas", href: "/lines", section: "Datos", icon: BusIcon },
  { label: "Buses", href: "/buses", section: "Datos", icon: BusIcon },
  { label: "Horarios", href: "/schedules", section: "Datos", icon: ClockIcon },

  { label: "B2B", href: "/b2b", section: "Negocio", icon: BusinessIcon },
  { label: "Recargas", href: "/monetization", section: "Negocio", icon: CashIcon },
  { label: "Tests A/B", href: "/experiments", section: "Negocio", icon: BeakerIcon },

  { label: "Feature Flags", href: "/flags", section: "Sistema", icon: FlagIcon },
  { label: "Settings", href: "/settings", section: "Sistema", icon: FlagIcon },
  { label: "Health", href: "/health", section: "Sistema", icon: AuditIcon },
  { label: "Audit Log", href: "/activity", section: "Sistema", icon: AuditIcon },
];

function NavIconButton({
  item,
  active,
  badge,
  badgeColor,
}: {
  item: NavItem;
  active: boolean;
  badge: number | null;
  badgeColor: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
        active
          ? "bg-text text-bg-card shadow-sm"
          : "text-text-secondary hover:bg-bg-subtle hover:text-text"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2 : 1.75} />
      {badge !== null && (
        <span
          className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white tabular-nums ${badgeColor}`}
          style={{ boxShadow: "0 0 0 2px var(--color-bg-sidebar)" }}
        >
          {badge}
        </span>
      )}
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-text px-2 py-1 text-[11px] font-medium text-bg-card shadow-md group-hover:block z-50">
        {item.label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { alerts } = useAlerts();
  const { tickets } = useSupportTickets();

  const criticalAlerts = alerts.filter(
    (a) => a.active && a.severity === "critical"
  ).length;
  const openTickets = tickets.filter((t) => t.status === "open").length;

  const sections: Record<string, NavItem[]> = {};
  for (const item of NAV) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }

  return (
    <aside className="flex h-screen w-14 flex-col border-r border-border bg-bg-sidebar glass">
      {/* Logo */}
      <div className="flex h-12 items-center justify-center border-b border-border">
        <Link
          href="/home"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-white transition-transform hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
            boxShadow:
              "0 2px 4px rgba(37, 99, 235, 0.25), 0 0 0 1px rgba(37, 99, 235, 0.1)",
          }}
          title="Vamo"
        >
          V
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-2 no-scrollbar">
        {Object.entries(sections).map(([section, items], idx) => (
          <div key={section} className="flex flex-col gap-0.5">
            {idx > 0 && <div className="h-px bg-border my-0.5 mx-2" />}
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              let badge: number | null = null;
              let badgeColor = "bg-danger";
              if (item.href === "/alerts" && criticalAlerts > 0) {
                badge = criticalAlerts;
              } else if (item.href === "/support" && openTickets > 0) {
                badge = openTickets;
                badgeColor = "bg-warning";
              }
              return (
                <NavIconButton
                  key={item.href}
                  item={item}
                  active={active}
                  badge={badge}
                  badgeColor={badgeColor}
                />
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="flex flex-col items-center gap-1 border-t border-border py-2">
        <button
          title={user?.email ?? ""}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white transition-transform hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
          }}
        >
          {user?.email?.charAt(0).toUpperCase() ?? "?"}
        </button>
        <button
          onClick={signOut}
          title="Cerrar sesión"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text transition-colors"
        >
          <LogoutIcon size={15} />
        </button>
      </div>
    </aside>
  );
}
