import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Refunds() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-2">Last updated: July 18, 2026</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Refund Policy</h1>
          <p className="text-muted-foreground leading-relaxed">
            We want every Lynx AI customer to have a great experience. This policy explains how we handle billing disputes and service issues. Please read it carefully before subscribing.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. No Cash Refunds</h2>
            <p>All subscription payments made to Lynx AI are <strong>non-refundable</strong>. We do not issue cash refunds, credit card reversals, or PayPal refunds for any reason, including but not limited to: cancellation before the end of a billing period, partial use of the Service during a billing cycle, dissatisfaction with AI response quality, or accidental subscription renewals.</p>
            <p className="mt-3">By subscribing to any Lynx AI plan, you acknowledge and agree to this no-cash-refund policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Resolve Disputes</h2>
            <p>While we do not offer cash refunds, we are committed to resolving legitimate service issues fairly. Depending on the nature of the problem, we may offer one or both of the following remedies at our sole discretion:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-muted-foreground">
              <li><strong className="text-foreground">Usage Credits</strong> — Additional message credits applied to your account, equivalent in value to the affected period or usage lost due to a verified service disruption.</li>
              <li><strong className="text-foreground">Service Time Extension</strong> — An extension of your current billing period by the number of days the Service was materially unavailable or degraded, at no additional charge.</li>
            </ul>
            <p className="mt-3">These remedies are offered as goodwill gestures and do not constitute an admission of liability. Acceptance of a remedy resolves the dispute in full.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Eligible Situations</h2>
            <p>We consider remedy requests for the following situations:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-muted-foreground">
              <li>Verified platform outages lasting more than 4 consecutive hours that prevented use of the core chatbot functionality.</li>
              <li>Billing errors resulting in a duplicate charge for the same subscription period.</li>
              <li>Technical failures on our end that caused significant loss of conversation data or chatbot configuration.</li>
              <li>Failure to deliver a feature that was explicitly promised in writing by a Lynx AI representative.</li>
            </ul>
            <p className="mt-3">The following situations are <strong>not eligible</strong> for any remedy: dissatisfaction with AI response quality or accuracy, changes to pricing or plan features with proper advance notice, service limitations due to exceeding plan message quotas, issues caused by incorrect widget installation or third-party website configurations, or requests submitted more than 30 days after the billing date in question.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Credit Validity</h2>
            <p>Usage credits issued as part of a dispute resolution are valid for <strong>3 months</strong> from the date of issuance. Credits are non-transferable, have no cash value, and cannot be applied to future subscription payments — they are applied exclusively as additional message quota on your account. Unused credits expire at the end of the 3-month validity period.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. How to Request a Remedy</h2>
            <p>To submit a dispute or request a remedy, please follow these steps:</p>
            <ol className="mt-3 space-y-3 list-decimal list-inside text-muted-foreground">
              <li>Email us at <a href="mailto:support@lynxaiassistant.com" className="text-blue-500 hover:underline">support@lynxaiassistant.com</a> with the subject line <strong className="text-foreground">"Billing Dispute — [Your Account Email]"</strong>.</li>
              <li>Include your account email address, the date of the charge in question, a description of the issue, and any supporting evidence (screenshots, error messages, etc.).</li>
              <li>Our support team will acknowledge your request within 2 business days and provide a resolution within 7 business days.</li>
            </ol>
            <p className="mt-3">Requests submitted via social media, chat widgets, or other channels may not be processed. Email is the only supported channel for billing disputes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Chargebacks and Payment Disputes</h2>
            <p>If you initiate a chargeback or payment dispute with PayPal or your bank without first contacting us, we reserve the right to immediately suspend your account pending resolution of the dispute. We encourage you to reach out to us directly — we respond quickly and are committed to fair resolutions. Accounts with unresolved chargebacks may be permanently banned from the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cancellation</h2>
            <p>You may cancel your subscription at any time from your dashboard's Billing section. Cancellation stops future charges but does not entitle you to a refund for the current billing period. You will continue to have access to the Service until the end of your paid period. After cancellation, your data is retained for 90 days before deletion, giving you time to export any information you need.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
            <p>We may update this Refund Policy from time to time. Material changes will be communicated via email at least 14 days before taking effect. Continued use of the Service after the effective date constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
            <p>For billing questions or to submit a dispute, contact us at <a href="mailto:support@lynxaiassistant.com" className="text-blue-500 hover:underline">support@lynxaiassistant.com</a>. We aim to respond within 2 business days.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/legal/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
}
