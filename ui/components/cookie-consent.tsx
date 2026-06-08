/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import Link from "next/link";

export function CookieConsent() {
  const t = useTranslations("landing.cookie");
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (consent === null) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    document.cookie = "locale=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("title")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("description")}{" "}
                <Link href="/privacy" className="text-indigo-600 hover:underline dark:text-indigo-400">
                  {t("learnMore")}
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="min-w-[80px]"
            >
              {t("reject")}
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="min-w-[80px]"
            >
              {t("accept")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
