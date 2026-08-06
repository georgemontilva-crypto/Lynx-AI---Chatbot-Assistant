import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Cookies() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-2">Last updated: July 18, 2026</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground leading-relaxed">
            This Cookie Policy explains how Lynx AI uses cookies and similar tracking technologies when you visit our website or use our Service. It explains what these technologies are, why we use them, and your rights to control their use.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. What Are Cookies?</h2>
            <p>Cookies are small text files placed on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work efficiently, remember your preferences, and provide information to site owners. Cookies set by the website owner (in this case, Lynx AI) are called "first-party cookies." Cookies set by parties other than the website owner are called "third-party cookies."</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Types of Cookies We Use</h2>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold">Category</th>
                    <th className="text-left py-3 pr-4 font-semibold">Purpose</th>
                    <th className="text-left py-3 font-semibold">Can be disabled?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-3 pr-4 font-medium">Strictly Necessary</td>
                    <td className="py-3 pr-4 text-muted-foreground">Session authentication, security tokens, CSRF protection. Required for the Service to function.</td>
                    <td className="py-3 text-muted-foreground">No — essential for operation</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium">Functional</td>
                    <td className="py-3 pr-4 text-muted-foreground">Remembering your language preference, dashboard layout, and theme (light/dark mode).</td>
                    <td className="py-3 text-muted-foreground">Yes — affects experience</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium">Analytics</td>
                    <td className="py-3 pr-4 text-muted-foreground">Understanding how users navigate the platform to improve features and performance. Data is aggregated and anonymized.</td>
                    <td className="py-3 text-muted-foreground">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium">Marketing</td>
                    <td className="py-3 pr-4 text-muted-foreground">Currently not used. We do not place advertising or retargeting cookies.</td>
                    <td className="py-3 text-muted-foreground">N/A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Specific Cookies We Set</h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold">Cookie Name</th>
                    <th className="text-left py-3 pr-4 font-semibold">Type</th>
                    <th className="text-left py-3 pr-4 font-semibold">Duration</th>
                    <th className="text-left py-3 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-3 pr-4 font-mono">lynx_session</td>
                    <td className="py-3 pr-4 text-muted-foreground">Strictly Necessary</td>
                    <td className="py-3 pr-4 text-muted-foreground">Session</td>
                    <td className="py-3 text-muted-foreground">Maintains your authenticated session in the dashboard</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono">lynx_theme</td>
                    <td className="py-3 pr-4 text-muted-foreground">Functional</td>
                    <td className="py-3 pr-4 text-muted-foreground">1 year</td>
                    <td className="py-3 text-muted-foreground">Stores your light/dark theme preference</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono">lynx_analytics</td>
                    <td className="py-3 pr-4 text-muted-foreground">Analytics</td>
                    <td className="py-3 pr-4 text-muted-foreground">90 days</td>
                    <td className="py-3 text-muted-foreground">Anonymized usage tracking to improve the platform</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cookies in the Embeddable Widget</h2>
            <p>When you install the Lynx AI chat widget on your website, the widget may set a cookie on your visitors' browsers to maintain conversation context within a single session. This cookie does not track visitors across different websites and expires at the end of the browser session. As the website owner, you are responsible for disclosing the use of this cookie in your own privacy and cookie notices.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. How to Control Cookies</h2>
            <p>You can control and manage cookies in several ways. Most browsers allow you to refuse or delete cookies through their settings. The steps vary by browser; refer to your browser's help documentation for instructions. Please note that disabling strictly necessary cookies will prevent you from logging in and using the Service.</p>
            <p className="mt-3">You can also opt out of analytics cookies by contacting us at <a href="mailto:privacy@lynxaiassistant.com" className="text-blue-500 hover:underline">privacy@lynxaiassistant.com</a>. We will honor your request within 5 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Changes to This Policy</h2>
            <p>We may update this Cookie Policy as our practices change or as required by law. We will notify you of material changes by updating the "Last updated" date and, where appropriate, by providing additional notice through the Service or via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p>For questions about our use of cookies, contact us at <a href="mailto:privacy@lynxaiassistant.com" className="text-blue-500 hover:underline">privacy@lynxaiassistant.com</a>.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/legal/refunds" className="hover:text-foreground transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
