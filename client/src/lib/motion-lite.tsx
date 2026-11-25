/**
 * A stand-in for the few framer-motion features the PUBLIC pages used
 * (fade/slide-in wrappers). The real library is ~120 KB of JavaScript that
 * every phone had to download and parse before the landing became usable,
 * for entrances the page does not need. `motion.div` here renders a plain
 * element and ignores the animation props; the dashboard still uses the real
 * library, loaded only when someone opens it.
 */
import { createElement, forwardRef } from "react";
import type { ComponentType } from "react";
import type { motion as FramerMotion } from "framer-motion";

const ANIMATION_PROPS = new Set([
  "initial", "animate", "exit", "whileInView", "whileHover", "whileTap", "whileFocus",
  "viewport", "transition", "variants", "layout", "layoutId", "custom",
]);

const cache = new Map<string, ComponentType<Record<string, unknown>>>();

function plain(tag: string) {
  const Comp = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
    const clean: Record<string, unknown> = { ref };
    for (const key in props) if (!ANIMATION_PROPS.has(key)) clean[key] = props[key];
    return createElement(tag, clean);
  });
  Comp.displayName = `motion.${tag}`;
  return Comp as unknown as ComponentType<Record<string, unknown>>;
}

export const motion = new Proxy({} as Record<string, unknown>, {
  get(_target, tag: string) {
    if (!cache.has(tag)) cache.set(tag, plain(tag));
    return cache.get(tag);
  },
}) as unknown as typeof FramerMotion;

/** Everything is treated as in view: content is simply there. */
export function useInView(..._args: unknown[]): boolean {
  return true;
}
