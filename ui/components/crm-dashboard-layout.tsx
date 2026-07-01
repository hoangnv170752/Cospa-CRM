"use client";

import { useState } from "react";
import { CrmSidebar } from "@/components/crm-sidebar";
import { CrmHeader } from "@/components/crm-header";
import { SupportChatFloatingButton } from "@/components/support-chat-floating-button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface CrmDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function CrmDashboardLayout({ children, title }: CrmDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <CrmSidebar collapsed={!sidebarOpen} />
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="!w-56 !max-w-56 p-0">
          <CrmSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader
          title={title}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onMobileMenuClick={() => setMobileOpen(true)}
        />
        {/* Main content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          {children}
        </main>
      </div>

      {/* Support Chat Floating Button */}
      <SupportChatFloatingButton />
    </div>
  );
}
