/**
 * A moving strip of the places the snippet can be pasted. It makes one true
 * claim — "it's a line of code, so it goes anywhere" — instead of a wall of
 * customer logos we don't have.
 */
const platforms = ["Shopify", "WordPress", "WooCommerce", "Webflow", "Wix", "Squarespace", "Framer", "BigCommerce", "Your own code"];

export default function Platforms() {
  const row = (hidden: boolean) => (
    <ul className="flex items-center shrink-0" aria-hidden={hidden || undefined}>
      {platforms.map((p) => (
        <li key={p} className="lx-heading text-2xl sm:text-3xl text-muted-foreground/60 px-7 sm:px-10 whitespace-nowrap">
          {p}
        </li>
      ))}
    </ul>
  );
  return (
    <section className="border-t border-border py-10 sm:py-12" aria-label="Works on any platform where you can paste a line of code">
      <p className="mx-auto max-w-[1240px] px-5 sm:px-8 text-sm text-muted-foreground">
        One line of code, so it runs wherever your site does.
      </p>
      <div className="lx-marquee mt-6">
        <div>
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
