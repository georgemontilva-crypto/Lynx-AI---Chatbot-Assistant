/**
 * Three steps, shown with the real artifact of each one (the address field,
 * the actual snippet, an answer) instead of icons. The numbers are there
 * because this genuinely is a sequence.
 */
const steps = [
  {
    title: "Give Lynx your address",
    body: "It reads the whole site the way a careful new employee would: every product, every policy page, the FAQ. It takes about a minute.",
  },
  {
    title: "Paste one line into your site",
    body: "The same line works on Shopify, WordPress, Webflow or a site you built yourself. It loads after your page, so it never slows it down.",
  },
  {
    title: "It starts answering",
    body: "From then on it re-reads your site on its own, so a new product or a changed price is picked up without you touching anything.",
  },
];

function Artifact({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center h-10 rounded-md border border-border bg-background px-3 font-mono text-xs text-foreground">
          https://yourstore.com
        </div>
        <div className="text-xs text-sight">18 pages read, 12 products learned</div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <pre className="rounded-md border border-border bg-background p-3 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground overflow-x-auto">
        <code>
          {'<script src="https://www.lynxaiassistant.com/api/widget.js"\n        data-api-key="lx_…" defer></script>'}
        </code>
      </pre>
    );
  }
  return (
    <div className="space-y-2">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-action text-white px-3 py-2 text-xs">
        Is the 28L pack carry-on size?
      </div>
      <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs leading-relaxed">
        It is. At 50 × 30 × 20 cm it fits most airline cabin limits.
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 border-t border-border scroll-mt-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <h2 className="lx-heading text-[clamp(2rem,4.4vw,3.25rem)] max-w-[22ch]">
          Three steps, and one of them is copy and paste.
        </h2>

        <ol className="mt-12 sm:mt-16 grid md:grid-cols-3 gap-x-8 gap-y-12">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col">
              <div className="flex items-baseline gap-4 border-t border-border pt-5">
                <span className="lx-display text-5xl text-muted-foreground/50" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="lx-heading text-xl">{s.title}</h3>
              </div>
              <p className="lx-prose mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{s.body}</p>
              <div className="mt-5">
                <Artifact step={i} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
