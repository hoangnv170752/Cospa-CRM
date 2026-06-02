"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowUp, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

const suggestions = [
  "Manage customer relationships effectively",
  "Track deals and sales pipeline",
  "Organize contacts and companies",
  "Monitor business performance",
  "Generate insightful reports",
  "Streamline vendor management",
  "Handle support tickets efficiently",
  "Manage contracts seamlessly",
];

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Rotate suggestions every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSuggestion((prev) => (prev + 1) % suggestions.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ username: email, password });
      router.push("/");
    } catch (err) {
      console.error(err);
      toast.error("Login failed. Please try again.");
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
          <Image
            src="/iot-icon.png"
            alt="Cospa CRM"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-xl font-semibold text-foreground">Cospa CRM</span>
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {t("auth.signInTitle")}
              </h1>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
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
                    {t("auth.signingIn")}
                  </>
                ) : (
                  t("auth.signIn")
                )}
              </Button>
            </form>

            {/* Contact Admin */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("common.dontHaveAccount")}{" "}
              <a
                href={`mailto:admin@${process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '').replace(/\/api$/, '') || 'example.com'}`}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                {t("common.contactAdmin")}
              </a>
            </p>

            {/* CRM Login Link */}
            <div className="mt-6 pt-6 border-t border-border">
              <Link
                href="/crm-signin"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span>{t("auth.crmLogin") || "CRM Admin Login"}</span>
              </Link>
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
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-blue-50 via-sky-100 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-10 rounded-l-3xl m-4 overflow-hidden">
        <div className="relative w-full max-w-md">
          {/* Floating decorative card */}
          <div className="animate-float rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl p-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 overflow-hidden">
                <p
                  className={`text-lg text-muted-foreground transition-all duration-300 ${
                    isAnimating
                      ? "opacity-0 translate-y-4"
                      : "opacity-100 translate-y-0"
                  }`}
                >
                  {suggestions[currentSuggestion]}
                </p>
              </div>
              <Button size="icon" className="rounded-xl h-10 w-10 shrink-0">
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {suggestions.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentSuggestion
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Background decorative elements with floating animation */}
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-200/50 dark:bg-blue-900/30 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-200/50 dark:bg-cyan-900/30 blur-3xl animate-float-slower" />
          <div className="absolute top-1/2 -right-10 h-24 w-24 rounded-full bg-purple-200/40 dark:bg-purple-900/20 blur-2xl animate-float" />
        </div>
      </div>
    </div>
  );
}
