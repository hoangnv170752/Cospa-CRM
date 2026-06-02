import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/signin"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-foreground">
          Terms of Service
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: January 2025</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using the Cospa CRM service, you agree to be
              bound by these Terms of Service. If you do not agree to these
              terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p>
              Cospa CRM provides a platform for customer relationship management,
              including but not limited to contact management, deal tracking, data
              visualization, and business asset management.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              3. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You agree to notify us immediately of any unauthorized
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the service</li>
              <li>Interfere with the proper operation of the service</li>
              <li>Upload malicious code or content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              5. Data and Privacy
            </h2>
            <p>
              Your use of the service is also governed by our Privacy Policy.
              Please review our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              to understand how we collect, use, and protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              6. Service Availability
            </h2>
            <p>
              We strive to maintain high availability of our service but do not
              guarantee uninterrupted access. We may perform maintenance or
              updates that temporarily affect service availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              7. Limitation of Liability
            </h2>
            <p>
              The service is provided &quot;as is&quot; without warranties of any kind.
              We are not liable for any damages arising from your use of the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              8. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Continued
              use of the service after changes constitutes acceptance of the new
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              9. Contact
            </h2>
            <p>
              If you have questions about these Terms of Service, please contact
              your system administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
