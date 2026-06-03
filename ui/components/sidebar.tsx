"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Cpu, Box, Settings } from "lucide-react";

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    titleKey: "nav.dashboard",
    href: "/iot-dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    titleKey: "nav.devices",
    href: "/device",
    icon: <Cpu className="h-4 w-4" />,
  },
  {
    titleKey: "nav.assets",
    href: "/assets",
    icon: <Box className="h-4 w-4" />,
  },
  {
    titleKey: "nav.settings",
    href: "/setting",
    icon: <Settings className="h-4 w-4" />,
  },
];


interface NavLinkProps {
  item: NavItem;
  collapsed?: boolean;
  title: string;
}

function NavLink({ item, collapsed, title }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      title={collapsed ? title : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      {item.icon}
      {!collapsed && <span>{title}</span>}
    </Link>
  );
}

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const t = useTranslations();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Image
          src="/iot-icon.png"
          alt="Cospa CRM"
          width={32}
          height={32}
          className="rounded-md"
        />
        {!collapsed && (
          <span className="font-semibold text-foreground">Cospa CRM</span>
        )}
      </div>

      {/* IoT Navigation */}
      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto py-4",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {!collapsed && (
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("nav.iot")}
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            title={t(item.titleKey)}
          />
        ))}
      </nav>
    </aside>
  );
}
