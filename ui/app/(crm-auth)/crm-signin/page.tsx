"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/otp-input";
import { Eye, EyeOff, Loader2, Building2, ArrowLeft, Shield } from "lucide-react";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import { toast } from "sonner";

type AuthStep = "credentials" | "two_factor";

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
  const { login, isLoggedIn, requestOtp, verifyOtp } = useCrmAuth();
  const t = useTranslations();
  const [step, setStep] = useState<AuthStep>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for 2FA resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
      const result = await login(email, password);

      // Check if 2FA is required
      if (result?.requiresTwoFactor) {
        // Request OTP for 2FA
        await requestOtp(email, "two_factor");
        setStep("two_factor");
        setCountdown(60);
        toast.info("Two-factor authentication required. Check your email for the code.");
        return;
      }

      toast.success("Welcome to CRM!");
      router.push("/crm");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = useCallback(async (code: string) => {
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      await verifyOtp(email, code, "two_factor");
      toast.success("Welcome to CRM!");
      router.push("/crm");
    } catch (err) {
      console.error(err);
      setOtp("");
      toast.error(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  }, [email, verifyOtp, router]);

  const handleResend2FA = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    try {
      await requestOtp(email, "two_factor");
      setOtp("");
      setCountdown(60);
      toast.success("New verification code sent");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setPassword("");
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
            {step === "credentials" ? (
              <>
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

                {/* OTP Login option */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Or{" "}
                    <Link
                      href="/crm-otp-login"
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      sign in with OTP
                    </Link>
                  </p>
                </div>

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
              </>
            ) : (
              <>
                {/* 2FA Step */}
                <div className="mb-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4 mx-auto">
                    <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground text-center">
                    Two-factor authentication
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    Enter the 6-digit code sent to <strong>{email}</strong>
                  </p>
                </div>

                <div className="space-y-6">
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    onComplete={handleVerify2FA}
                    disabled={isLoading}
                  />

                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Didn&apos;t receive the code?
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResend2FA}
                      disabled={countdown > 0 || isLoading}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToCredentials}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Button>
                </div>
              </>
            )}
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
