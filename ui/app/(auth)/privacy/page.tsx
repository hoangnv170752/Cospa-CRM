import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: January 2025</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              1. Information We Collect
            </h2>
            <p>We collect information that you provide directly to us:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (email, name)</li>
              <li>CRM data including contacts, companies, and deals</li>
              <li>Usage data and interaction with our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              2. How We Use Your Information
            </h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our Cospa CRM service</li>
              <li>Manage and display your CRM data</li>
              <li>Send notifications and alerts about your activities</li>
              <li>Improve and optimize our service</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              3. Data Storage and Security
            </h2>
            <p>
              Your data is stored securely on our servers. We implement
              industry-standard security measures to protect your information,
              including encryption and secure authentication protocols.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              4. Data Sharing
            </h2>
            <p>
              We do not sell or share your personal information with third
              parties except:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent misuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              5. Data Retention
            </h2>
            <p>
              We retain your data for as long as your account is active or as
              needed to provide services. You may request deletion of your data
              by contacting your system administrator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              6. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              7. Cookies and Tracking
            </h2>
            <p>
              We use cookies and similar technologies to maintain your session
              and improve your experience. These are essential for the
              functioning of our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any significant changes by posting the new policy on
              this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              9. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact
              your system administrator.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            See also:{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
