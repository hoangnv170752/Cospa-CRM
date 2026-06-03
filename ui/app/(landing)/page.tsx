"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/contexts/locale-context";
import {
  Building2,
  Users,
  FileSpreadsheet,
  Shield,
  Globe,
  MessageSquare,
  BarChart3,
  FileText,
  CheckCircle2,
  ArrowRight,
  Layers,
  Lock,
  Palette,
  Smartphone,
  Languages,
} from "lucide-react";

const languages = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "vi", name: "Tiếng Việt" },
];

const testimonials = [
  {
    nameKey: "landing.testimonials.items.0.name",
    roleKey: "landing.testimonials.items.0.role",
    quoteKey: "landing.testimonials.items.0.quote",
    avatar: "NT",
  },
  {
    nameKey: "landing.testimonials.items.1.name",
    roleKey: "landing.testimonials.items.1.role",
    quoteKey: "landing.testimonials.items.1.quote",
    avatar: "TH",
  },
  {
    nameKey: "landing.testimonials.items.2.name",
    roleKey: "landing.testimonials.items.2.role",
    quoteKey: "landing.testimonials.items.2.quote",
    avatar: "LV",
  },
];

const features = [
  {
    icon: FileSpreadsheet,
    titleKey: "landing.features.excelImport.title",
    descKey: "landing.features.excelImport.description",
  },
  {
    icon: MessageSquare,
    titleKey: "landing.features.messaging.title",
    descKey: "landing.features.messaging.description",
  },
  {
    icon: Users,
    titleKey: "landing.features.profileManagement.title",
    descKey: "landing.features.profileManagement.description",
  },
  {
    icon: Shield,
    titleKey: "landing.features.selfService.title",
    descKey: "landing.features.selfService.description",
  },
  {
    icon: FileText,
    titleKey: "landing.features.auditLog.title",
    descKey: "landing.features.auditLog.description",
  },
  {
    icon: Smartphone,
    titleKey: "landing.features.mobileReady.title",
    descKey: "landing.features.mobileReady.description",
  },
];

const benefits = [
  {
    icon: Layers,
    titleKey: "landing.benefits.multiTenant.title",
    descKey: "landing.benefits.multiTenant.description",
  },
  {
    icon: Palette,
    titleKey: "landing.benefits.whiteLabel.title",
    descKey: "landing.benefits.whiteLabel.description",
  },
  {
    icon: Lock,
    titleKey: "landing.benefits.rbac.title",
    descKey: "landing.benefits.rbac.description",
  },
  {
    icon: Globe,
    titleKey: "landing.benefits.i18n.title",
    descKey: "landing.benefits.i18n.description",
  },
];

const targetUsers = [
  "landing.targetUsers.hardware",
  "landing.targetUsers.integrators",
  "landing.targetUsers.facilities",
  "landing.targetUsers.resellers",
];

export default function LandingPage() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();

  const currentLanguage = languages.find((l) => l.code === locale) || languages[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground">Cospa CRM</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Languages className="h-4 w-4" />
                  <span className="hidden sm:inline">{currentLanguage.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLocale(lang.code as "en" | "zh" | "fr" | "es" | "vi")}
                    className={locale === lang.code ? "bg-accent" : ""}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/crm-signin">
              <Button size="sm">
                {t("landing.nav.crmLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("landing.hero.title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/crm-register">
                <Button size="lg" className="gap-2">
                  {t("landing.hero.getStarted")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/crm-signin">
                <Button variant="outline" size="lg">
                  {t("landing.hero.signInCrm")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("landing.features.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-indigo-200 hover:shadow-lg dark:hover:border-indigo-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("landing.benefits.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("landing.benefits.subtitle")}
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.titleKey}
                  className="text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {t(benefit.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(benefit.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Target Users Section */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t("landing.targetUsers.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("landing.targetUsers.subtitle")}
              </p>
              <ul className="mt-8 space-y-4">
                {targetUsers.map((userKey) => (
                  <li key={userKey} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-foreground">{t(userKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white">
                  <BarChart3 className="h-8 w-8" />
                  <p className="mt-4 text-2xl font-bold">{t("landing.stats.companies")}</p>
                  <p className="text-sm opacity-80">{t("landing.stats.companiesLabel")}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
                  <Users className="h-8 w-8" />
                  <p className="mt-4 text-2xl font-bold">{t("landing.stats.contacts")}</p>
                  <p className="text-sm opacity-80">{t("landing.stats.contactsLabel")}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white">
                  <FileText className="h-8 w-8" />
                  <p className="mt-4 text-2xl font-bold">{t("landing.stats.deals")}</p>
                  <p className="text-sm opacity-80">{t("landing.stats.dealsLabel")}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-6 text-white">
                  <Shield className="h-8 w-8" />
                  <p className="mt-4 text-2xl font-bold">{t("landing.stats.security")}</p>
                  <p className="text-sm opacity-80">{t("landing.stats.securityLabel")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-muted/30 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("landing.testimonials.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("landing.testimonials.subtitle")}
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="relative rounded-2xl border border-border bg-card p-8 shadow-sm"
              >
                <div className="absolute -top-4 left-8">
                  <span className="text-6xl text-indigo-200 dark:text-indigo-800">&ldquo;</span>
                </div>
                <p className="relative z-10 mt-4 text-muted-foreground italic">
                  {t(testimonial.quoteKey)}
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold dark:bg-indigo-900/50 dark:text-indigo-400">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t(testimonial.nameKey)}</p>
                    <p className="text-sm text-muted-foreground">{t(testimonial.roleKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("landing.cta.title")}
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              {t("landing.cta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/crm-register">
                <Button size="lg" variant="secondary" className="gap-2">
                  {t("landing.cta.register")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/crm-signin">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-indigo-600"
                >
                  {t("landing.cta.existingUser")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">Cospa CRM</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">
                {t("landing.footer.terms")}
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                {t("landing.footer.privacy")}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("landing.footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
