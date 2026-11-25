/**
 * Questions people actually ask before signing up. Native <details> so it
 * works without JavaScript and is keyboard-accessible for free.
 */
import { Reveal } from "./fx";

export const faqs = [
  {
    q: "Do I need to be technical to install it?",
    a: "No. You paste one line of code into your site, or into the custom-code box that Shopify, WordPress, Webflow and Wix all have. The dashboard shows the exact steps for each platform.",
  },
  {
    q: "What happens when my site changes?",
    a: "Lynx re-reads your site on its own: every day on Embedded and White-Label, every week on Cloud. You can also start a scan yourself whenever you like, for example right after adding products.",
  },
  {
    q: "What counts as a message?",
    a: "One visitor question and the answer to it. You get an email when you reach 80% of your monthly allowance. If it runs out, the assistant stops answering until the next month or until you move to a larger plan.",
  },
  {
    q: "Could it tell my visitors something that isn't true?",
    a: "It is built not to. Products, prices and links come only from what it read on your site, and a product card is shown only if that product exists in your catalog. When your site doesn't cover a question, it says so.",
  },
  {
    q: "Is my content mixed with other customers'?",
    a: "Never. Every site has its own separate knowledge, and conversations are visible only to the account that owns the site.",
  },
  {
    q: "Can I change how it looks and sounds?",
    a: "Yes: its name, colours, avatar, welcome message, where it sits on the page, and the tone it uses. On White-Label you can also replace or remove the “Powered by” line.",
  },
];

export default function Faq() {
  return (
    <section className="py-20 sm:py-28 border-t border-border">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-x-16 gap-y-8">
          <Reveal>
            <h2 className="lx-heading text-[clamp(1.875rem,3.6vw,2.75rem)]">Before you try it.</h2>
          </Reveal>
          <div className="border-t border-border">
            {faqs.map((f, i) => (
              <Reveal key={f.q} order={i % 4}>
              <details className="group border-b border-border transition-colors open:bg-card/40 hover:bg-card/30 px-0 sm:px-4 sm:-mx-4 rounded-sm">
                <summary className="flex items-center justify-between gap-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm">
                  <span className="lx-heading text-lg">{f.q}</span>
                  <span
                    aria-hidden="true"
                    className="relative w-4 h-4 shrink-0 text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-current after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-current after:transition-transform group-open:after:scale-y-0"
                  />
                </summary>
                <p className="lx-in lx-prose pb-6 pr-10 text-[0.9375rem] leading-relaxed text-muted-foreground max-w-[42rem]">{f.a}</p>
              </details>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
