import { cubicOut } from "svelte/easing";
import { prefersReducedMotion } from "svelte/motion";

/** Deal a card onto the table: it flips over as it drops into place. */
export function deal(_node: Element, { delay = 0 }: { delay?: number } = {}) {
  return {
    delay,
    duration: prefersReducedMotion.current ? 0 : 520,
    easing: cubicOut,
    css: (t: number, u: number) =>
      `transform: perspective(900px) translateY(${u * -28}px) rotateY(${u * 75}deg); opacity: ${t};`,
  };
}
