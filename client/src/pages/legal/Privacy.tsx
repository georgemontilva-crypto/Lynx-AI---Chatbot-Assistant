import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-2">Last updated: July 18, 2026</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground leading-relaxed">
            Lynx AI ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly, information we collect automatically, and information from third parties. Information you provide includes: account registration data (name, email address), payment information processed by PayPal (we do not store card numbers), website URLs you submit for scanning, chatbot configuration settings, and communications you send us.</p>
            <p className="mt-3">Information collected automatically includes: IP addresses, browser type and version, pages visited and time spent, referring URLs, device identifiers, and usage patterns within the dashboard. We use cookies and similar tracking technologies as described in our Cookie Policy.</p>
            <p className="mt-3">When you install our chat widget on your website, we collect visitor interaction data including messages exchanged with the chatbot, session timestamps, and any contact information (such as email addresses) that visitors voluntarily provide through the widget's lead capture feature.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to: provide, operate, and improve the Service; process payments and manage your subscription; send transactional emails (account confirmation, payment receipts, usage alerts); respond to your support requests; analyze usage patterns to improve performance and features; detect and prevent fraud or abuse; and comply with legal obligations.</p>
            <p className="mt-3">We do not sell your personal data to third parties. We do not use your website content or visitor conversation data to train general AI models shared across customers. Each customer's data is processed in isolation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Sharing and Disclosure</h2>
            <p>We share your information only in the following circumstances: with service providers who assist us in operating the Service (including cloud infrastructure providers, email delivery services, and payment processors), all of whom are contractually bound to protect your data; when required by law, regulation, or valid legal process; to protect the rights, property, or safety of Lynx AI, our users, or the public; or in connection with a merger, acquisition, or sale of assets, in which case we will notify you before your data is transferred.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. White-Label and Reseller Data</h2>
            <p>If you are a White-Label subscriber, you act as a data controller for the end-user data collected through chatbots you deploy for your clients. You are responsible for ensuring your clients are informed about data collection practices and that appropriate consents are obtained. Lynx AI acts as a data processor on your behalf for such data and will process it only according to your instructions and these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p>We retain your account data for as long as your account is active or as needed to provide the Service. Conversation logs and analytics data are retained for 12 months by default. Upon account cancellation, we will delete your personal data within 90 days, except where retention is required by law or for legitimate business purposes such as resolving disputes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Security</h2>
            <p>We implement industry-standard security measures to protect your information, including TLS encryption for data in transit, encryption at rest for sensitive data, access controls limiting who can access your data within our organization, and regular security assessments. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security and encourage you to use strong passwords and keep your credentials confidential.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; object to or restrict certain processing; and request a portable copy of your data. To exercise these rights, contact us at <a href="mailto:privacy@lynxaiassistant.com" className="text-blue-500 hover:underline">privacy@lynxaiassistant.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p>We use cookies and similar technologies to operate the Service and analyze usage. For detailed information about the cookies we use and how to manage them, please see our <Link href="/legal/cookies" className="text-blue-500 hover:underline">Cookie Policy</Link>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
            <p>The Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. International Transfers</h2>
            <p>Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. We take appropriate safeguards to ensure your data receives adequate protection regardless of where it is processed.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or a notice on the Service. The "Last updated" date at the top of this page reflects the most recent revision. We encourage you to review this policy regularly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
            <p>For privacy-related questions or to exercise your rights, contact our Privacy team at <a href="mailto:privacy@lynxaiassistant.com" className="text-blue-500 hover:underline">privacy@lynxaiassistant.com</a>.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/legal/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
          <Link href="/legal/refunds" className="hover:text-foreground transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
