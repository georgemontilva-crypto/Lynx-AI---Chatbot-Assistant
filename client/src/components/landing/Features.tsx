/**
 * A ledger, not a grid of cards: what Lynx takes from the site on the left,
 * what the visitor gets on the right. One row per fact, ruled like a table,
 * because these are parallel statements and should be read down a column.
 */
const rows = [
  {
    knows: "Your catalog",
    does: "Names, prices, photos and links. When it recommends something, the visitor gets a card they can tap straight through to the product, not a paragraph describing it.",
  },
  {
    knows: "Your policies",
    does: "Shipping, returns, FAQ and terms, answered the way your site states them. If your site doesn't say, Lynx says it doesn't know instead of inventing an answer.",
  },
  {
    knows: "What changed since yesterday",
    does: "It re-reads your site every day (weekly on the Cloud plan). If your site happens to be down when it checks, it keeps what it already knew rather than forgetting everything.",
  },
  {
    knows: "How you want it to sound",
    does: "Tell it your tone and what to recommend first, and add facts your site never mentions. Those instructions take priority over everything it read.",
  },
  {
    knows: "The visitor's language",
    does: "It replies in whatever language the visitor writes in, and switches with them if they change mid-conversation.",
  },
  {
    knows: "Only your site",
    does: "Each site has its own knowledge. Nothing is shared between customers, and it only ever links to pages that exist on your site.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 border-t border-border scroll-mt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-x-16 gap-y-10">
          <div className="lg:sticky lg:top-28 self-start">
            <h2 className="lx-heading text-[clamp(2rem,4.4vw,3.25rem)]">What Lynx knows, and what it does with it.</h2>
            <p className="lx-prose mt-5 text-[0.9375rem] leading-relaxed text-muted-foreground max-w-[26rem]">
              You don&rsquo;t write answers and you don&rsquo;t build conversation trees. Everything on
              the right comes from reading your site.
            </p>
          </div>

          <dl className="border-t border-border">
            {rows.map((r) => (
              <div
                key={r.knows}
                className="grid sm:grid-cols-[14rem_1fr] gap-x-8 gap-y-1.5 py-6 border-b border-border"
              >
                <dt className="lx-heading text-lg">{r.knows}</dt>
                <dd className="lx-prose text-[0.9375rem] leading-relaxed text-muted-foreground">{r.does}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
