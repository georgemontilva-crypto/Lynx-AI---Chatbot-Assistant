import { Link } from "wouter";
import { Check, Minus } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { PlanPanel } from "@/components/landing/Pricing";

type Cell = boolean | string;

// Every row is something the product does today, and where a plan differs
// the difference is the real limit enforced by the server.
const comparison: Array<{ feature: string; cloud: Cell; embedded: Cell; whitelabel: Cell }> = [
  { feature: "Messages a month", cloud: "500", embedded: "2,000", whitelabel: "8,000" },
  { feature: "Websites", cloud: "1", embedded: "1", whitelabel: "1 + 15 client sites" },
  { feature: "Messages per client site", cloud: false, embedded: false, whitelabel: "6,000 each" },
  { feature: "Reads your whole site", cloud: true, embedded: true, whitelabel: true },
  { feature: "Re-reads it automatically", cloud: "Weekly", embedded: "Daily", whitelabel: "Daily" },
  { feature: "Product cards with photo, price and link", cloud: true, embedded: true, whitelabel: true },
  { feature: "Replies in the visitor's language", cloud: true, embedded: true, whitelabel: true },
  { feature: "Leads captured in conversation", cloud: true, embedded: true, whitelabel: true },
  { feature: "Your own tone and instructions", cloud: true, embedded: true, whitelabel: true },
  { feature: "Knowledge base for facts not on your site", cloud: false, embedded: "20 entries", whitelabel: "50 entries" },
  { feature: "Conversation history and ratings", cloud: false, embedded: true, whitelabel: true },
  { feature: "Alerts and weekly summary", cloud: false, embedded: true, whitelabel: true },
  { feature: "SEO report for your site", cloud: false, embedded: true, whitelabel: true },
  { feature: "Your own “Powered by” line", cloud: false, embedded: false, whitelabel: true },
  { feature: "Branding and instructions per client", cloud: false, embedded: false, whitelabel: true },
  { feature: "PDF report for each client", cloud: false, embedded: false, whitelabel: true },
];

const faqs = [
  {
    q: "How does the free trial work?",
    a: "Every new account gets 14 days, 50 messages and one scan of your site, with no card. It's enough to install it and watch it answer real visitors.",
  },
  {
    q: "What happens when I use up my messages?",
    a: "You get an email at 80% of your monthly allowance. At 100% the assistant stops answering until the count resets the following month, or until you move to a larger plan.",
  },
  {
    q: "Can I change plan or cancel?",
    a: "Yes, both from the Billing page of your dashboard. If you cancel, your plan stays active until the end of the period you already paid for.",
  },
  {
    q: "What if a payment fails?",
    a: "We email you and the assistant keeps working for three more days while you update your payment method. After that it is paused, and it comes back by itself as soon as the payment goes through. Nothing is deleted.",
  },
  {
    q: "How does White-Label work for my clients?",
    a: "Each client site gets its own assistant: its own key, its own knowledge of that site, its own branding and 6,000 messages a month. You manage all of them from one dashboard, under your brand.",
  },
  {
    q: "Can I have more than 15 client sites?",
    a: "Yes. Extra packs start at $99 a month for 15 more sites. Request one from the Billing page and we add the slots to your account.",
  },
  {
    q: "How do I show clients what it did for them?",
    a: "From My Clients you can download a PDF report per client with visits, conversations, leads and conversion for the period.",
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <>
        <Check className="w-4 h-4 text-primary" strokeWidth={2.25} aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span className="text-sm">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="pt-28 sm:pt-36 pb-16 sm:pb-20">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <h1 className="lx-display text-[clamp(2.5rem,5.5vw,4.6rem)] max-w-[18ch]">
            Free to try. Pay when it&rsquo;s earning its keep.
          </h1>
          <p className="lx-prose mt-6 max-w-[38rem] text-lg sm:text-xl leading-relaxed text-muted-foreground">
            The assistant is the same on every plan. What changes is how many messages you get, how
            often it re-reads your site, and how much you can see and brand.
          </p>

          <div className="mt-12 sm:mt-14">
            <PlanPanel />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            A message is one visitor question and its answer. Prices in US dollars, billed monthly through PayPal.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-28 border-t border-border">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <h2 className="lx-heading text-[clamp(2rem,4.4vw,3.25rem)]">Plan by plan.</h2>

          {/* Horizontal scroll on small screens so four columns never squash */}
          <div className="mt-10 overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-4 pr-4 text-sm font-medium text-muted-foreground w-[40%]">
                    <span className="sr-only">Feature</span>
                  </th>
                  {[
                    ["Cloud", "$199"],
                    ["Embedded", "$399"],
                    ["White-Label", "$499"],
                  ].map(([name, price]) => (
                    <th key={name} scope="col" className="py-4 px-4 align-bottom">
                      <div className="lx-heading text-lg">{name}</div>
                      <div className="text-sm font-normal text-muted-foreground">{price} a month</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-border">
                    <th scope="row" className="py-4 pr-4 text-[0.9375rem] font-normal">
                      {row.feature}
                    </th>
                    <td className="py-4 px-4"><CellValue value={row.cloud} /></td>
                    <td className="py-4 px-4"><CellValue value={row.embedded} /></td>
                    <td className="py-4 px-4"><CellValue value={row.whitelabel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 border-t border-border">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-x-16 gap-y-8">
            <div>
              <h2 className="lx-heading text-[clamp(2rem,4.4vw,3.25rem)]">About paying.</h2>
              <p className="mt-5 text-[0.9375rem] leading-relaxed text-muted-foreground max-w-[22rem]">
                Something else?{" "}
                <Link href="/contact" className="lx-link text-foreground">
                  Ask us directly
                </Link>
                .
              </p>
            </div>
            <div className="border-t border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group border-b border-border">
                  <summary className="flex items-center justify-between gap-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm">
                    <span className="lx-heading text-lg">{f.q}</span>
                    <span
                      aria-hidden="true"
                      className="relative w-4 h-4 shrink-0 text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-current after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-current after:transition-transform group-open:after:scale-y-0"
                    />
                  </summary>
                  <p className="lx-prose pb-6 pr-10 text-[0.9375rem] leading-relaxed text-muted-foreground max-w-[42rem]">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
