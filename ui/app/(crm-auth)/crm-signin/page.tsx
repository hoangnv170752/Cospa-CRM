"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Building2 } from "lucide-react";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import { toast } from "sonner";

const crmFeatures = [
  "Manage companies and contacts",
  "Track deals and sales pipeline",
  "Handle vendor relationships",
  "Manage contracts and agreements",
  "Process support tickets",
  "View comprehensive CRM analytics",
];

export default function CrmSignInPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useCrmAuth();
  const t = useTranslations();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/crm");
    }
  }, [isLoggedIn, router]);

  // Rotate features every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentFeature((prev) => (prev + 1) % crmFeatures.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success("Welcome to CRM!");
      router.push("/crm");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-between p-6 md:p-10 lg:p-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-foreground">Cospa CRM</span>
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Sign in to CRM
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your admin credentials to access the CRM system
              </p>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in to CRM"
                )}
              </Button>
            </form>

            {/* Register new organization */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                New organization?{" "}
                <Link
                  href="/crm-register"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Register here
                </Link>
              </p>
            </div>

            {/* Link to main signin */}
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Looking for main dashboard?{" "}
                <Link
                  href="/signin"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground">
          {t("auth.termsText")}{" "}
          <Link href="/terms" className="underline underline-offset-2">
            {t("auth.termsOfService")}
          </Link>{" "}
          {t("auth.and")}{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            {t("auth.privacyPolicy")}
          </Link>
          .
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-indigo-50 via-purple-100 to-pink-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 p-10 rounded-l-3xl m-4 overflow-hidden">
        <div className="relative w-full max-w-md">
          {/* Floating decorative card */}
          <div className="animate-float rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-6 w-6 text-indigo-500" />
              <span className="font-semibold text-foreground">Cospa CRM Features</span>
            </div>
            <div className="overflow-hidden">
              <p
                className={`text-lg text-muted-foreground transition-all duration-300 ${
                  isAnimating
                    ? "opacity-0 translate-y-4"
                    : "opacity-100 translate-y-0"
                }`}
              >
                {crmFeatures[currentFeature]}
              </p>
            </div>
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {crmFeatures.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentFeature
                      ? "w-4 bg-indigo-500"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-indigo-200/50 dark:bg-indigo-900/30 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-purple-200/50 dark:bg-purple-900/30 blur-3xl animate-float-slower" />
          <div className="absolute top-1/2 -right-10 h-24 w-24 rounded-full bg-pink-200/40 dark:bg-pink-900/20 blur-2xl animate-float" />
        </div>
      </div>
    </div>
  );
}
