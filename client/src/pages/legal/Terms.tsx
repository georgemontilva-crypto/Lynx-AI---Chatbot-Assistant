import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-2">Last updated: July 18, 2026</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-muted-foreground leading-relaxed">
            These Terms of Service ("Terms") govern your access to and use of the Lynx AI platform, including our website, dashboard, embeddable chat widget, and all related services (collectively, the "Service"), operated by Lynx AI ("we," "us," or "our"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, you may not use the Service.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Eligibility and Account Registration</h2>
            <p>You must be at least 18 years old and capable of entering into a legally binding agreement to use the Service. By creating an account, you represent that all information you provide is accurate, current, and complete. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at <a href="mailto:support@lynxaiassistant.com" className="text-blue-500 hover:underline">support@lynxaiassistant.com</a> if you suspect unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p>Lynx AI provides an AI-powered chatbot platform that scans your website, learns its content, and deploys an embeddable chat widget to serve your visitors with accurate, context-aware responses. The Service also includes SEO analysis tools, lead capture functionality, conversation analytics, and White-Label reseller capabilities. Features available to you depend on your active subscription plan.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Subscription Plans and Billing</h2>
            <p>The Service is offered under three subscription tiers: Cloud AI ($199/month), Embedded AI ($399/month), and White-Label ($499/month). Subscriptions are billed monthly in advance via PayPal. Your subscription renews automatically at the end of each billing cycle unless cancelled prior to the renewal date. We reserve the right to modify pricing with at least 30 days' notice. Continued use of the Service after a price change constitutes acceptance of the new pricing.</p>
            <p className="mt-3">White-Label subscribers may purchase additional client slot packs (Starter +15 at $99/month, Growth +30 at $179/month, Agency +60 at $299/month, Enterprise +100 at $449/month). These add-ons are billed alongside the base subscription and subject to the same renewal terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not use the Service to: (a) violate any applicable law or regulation; (b) transmit harmful, offensive, defamatory, or fraudulent content; (c) attempt to gain unauthorized access to our systems or other users' accounts; (d) reverse-engineer, decompile, or disassemble any part of the Service; (e) use automated tools to scrape or extract data from the Service beyond what is permitted by the API; or (f) resell or sublicense the Service except as expressly permitted under the White-Label plan.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. White-Label Reseller Terms</h2>
            <p>White-Label subscribers ("Resellers") may deploy Lynx AI-powered chatbots under their own brand for their end clients. Resellers are solely responsible for their clients' use of the Service, including compliance with these Terms and applicable law. Resellers must not represent themselves as Lynx AI or imply any affiliation beyond the use of the underlying technology. Each client chatbot is subject to the per-chatbot message limits specified in the Reseller's plan. Lynx AI reserves the right to terminate the White-Label plan if a Reseller's clients engage in prohibited conduct.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p>The Service, including its software, design, trademarks, and content, is owned by Lynx AI and protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable license to use the Service during your active subscription. You retain ownership of all content you provide to the Service (your website data, configurations, and uploaded materials). By using the Service, you grant Lynx AI a limited license to process your content solely to provide the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by applicable law, Lynx AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service. Our total aggregate liability for any claim arising from these Terms shall not exceed the amount you paid us in the three months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that AI-generated responses will be accurate or complete. AI outputs are for informational purposes only and should not be relied upon as professional advice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
            <p>You may cancel your subscription at any time from your dashboard's Billing section. Cancellation takes effect at the end of the current billing period; you will retain access to the Service until that date. We reserve the right to suspend or terminate your account immediately, without notice, if you violate these Terms or engage in conduct that we determine, in our sole discretion, is harmful to the Service or other users.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Governing Law and Disputes</h2>
            <p>These Terms are governed by the laws of the jurisdiction in which Lynx AI operates, without regard to conflict of law principles. Any dispute arising from these Terms shall first be submitted to good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration. Nothing in this section prevents either party from seeking injunctive relief in a court of competent jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of material changes via email or a prominent notice on the Service at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p>For questions about these Terms, please contact us at <a href="mailto:legal@lynxaiassistant.com" className="text-blue-500 hover:underline">legal@lynxaiassistant.com</a> or write to Lynx AI, support team, at <a href="mailto:support@lynxaiassistant.com" className="text-blue-500 hover:underline">support@lynxaiassistant.com</a>.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/legal/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
          <Link href="/legal/refunds" className="hover:text-foreground transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
