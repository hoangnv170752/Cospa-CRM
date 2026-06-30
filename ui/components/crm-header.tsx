"use client";

import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeft, LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";

interface CrmHeaderProps {
  title?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onMobileMenuClick?: () => void;
}

const languages = [
  { code: "en", label: "English", flag: "EN" },
  { code: "zh", label: "Chinese", flag: "ZH" },
  { code: "fr", label: "French", flag: "FR" },
  { code: "es", label: "Spanish", flag: "ES" },
  { code: "vi", label: "Vietnamese", flag: "VI" },
  { code: "tr", label: "Turkish", flag: "TR" },
];

export function CrmHeader({ sidebarOpen, onToggleSidebar, onMobileMenuClick }: CrmHeaderProps) {
  const t = useTranslations();
  const { user, logout } = useCrmAuth();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/crm-signin");
  };

  const handleLanguageChange = (newLocale: string | null) => {
    if (!newLocale) return;
    // Use "locale" cookie name to match root layout
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    window.location.href = pathname;
  };

  const currentLanguage = languages.find((l) => l.code === locale) || languages[0];

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden md:flex"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Language Selector */}
        <Select value={locale} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <span>{currentLanguage.flag}</span>
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User info */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {user.firstName} {user.lastName}
            </span>
          </div>
        )}

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t("nav.signOut")}</span>
        </Button>
      </div>
    </header>
  );
}
