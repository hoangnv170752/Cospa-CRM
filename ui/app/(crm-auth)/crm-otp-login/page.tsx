"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/otp-input";
import { Loader2, Building2, ArrowLeft, Mail, Shield } from "lucide-react";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import { toast } from "sonner";

type Step = "email" | "otp";

export default function CrmOtpLoginPage() {
  const router = useRouter();
  const { isLoggedIn, requestOtp, verifyOtp } = useCrmAuth();
  const t = useTranslations();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/crm");
    }
  }, [isLoggedIn, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestOtp(email, "login");
      setStep("otp");
      setCountdown(60); // 60 second cooldown for resend
      toast.success("Verification code sent to your email");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      await verifyOtp(email, code, "login");
      toast.success("Welcome to CRM!");
      router.push("/crm");
    } catch (err) {
      console.error(err);
      setOtp(""); // Clear OTP on error
      toast.error(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  }, [email, verifyOtp, router]);

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    try {
      await requestOtp(email, "login");
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

  const handleBack = () => {
    setStep("email");
    setOtp("");
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
            {step === "email" ? (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4 mx-auto">
                    <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground text-center">
                    Sign in with OTP
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    We&apos;ll send a verification code to your email
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                      disabled={isLoading}
                      required
                      autoFocus
                    />
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      "Send verification code"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4 mx-auto">
                    <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground text-center">
                    Enter verification code
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    We sent a 6-digit code to <strong>{email}</strong>
                  </p>
                </div>

                <div className="space-y-6">
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    onComplete={handleVerifyOtp}
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
                      onClick={handleResendOtp}
                      disabled={countdown > 0 || isLoading}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Use different email
                  </Button>
                </div>
              </>
            )}

            {/* Link to password login */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Prefer password login?{" "}
                <Link
                  href="/crm-signin"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Sign in with password
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
          {/* Info card */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-indigo-500" />
              <span className="font-semibold text-foreground">Passwordless Sign In</span>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">1.</span>
                Enter your email address
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">2.</span>
                Check your inbox for the code
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">3.</span>
                Enter the 6-digit code to sign in
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              No password needed - secure and convenient!
            </p>
          </div>

          {/* Background decorative elements */}
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-indigo-200/50 dark:bg-indigo-900/30 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-purple-200/50 dark:bg-purple-900/30 blur-3xl animate-float-slower" />
        </div>
      </div>
    </div>
  );
}
