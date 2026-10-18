<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import { formatCost } from "../lib/cards";
  import type { Card } from "../lib/types";

  let { card, class: className }: { card: Card; class?: ClassValue } = $props();
</script>

<span
  class={["inline-flex items-center gap-0.5 align-middle", className]}
  aria-label="Cost {formatCost(card)}"
>
  {#if card.cost.coins !== undefined}
    <span
      class="grid size-[1.7em] place-items-center rounded-full bg-accent font-extrabold text-on-accent ring-1 ring-accent-edge ring-inset"
      >{card.cost.coins}</span
    >
  {/if}
  {#if card.cost.potion}
    <span
      title="Potion"
      class="ml-0.5 size-[1.05em] rotate-45 rounded-full rounded-tl-none bg-[#3d6fd0] ring-1 ring-black/25"
    ></span>
  {/if}
  {#if card.cost.debt}
    <span
      title="Debt"
      class="grid h-[1.6em] w-[1.85em] place-items-center bg-[#c98049] font-extrabold text-[#1e1606] [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]"
      >{card.cost.debt}</span
    >
  {/if}
  {#if card.cost.extra}<span class="self-start leading-none font-extrabold">{card.cost.extra}</span
    >{/if}
</span>
