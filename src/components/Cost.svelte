<script lang="ts">
  import type { ClassValue } from "svelte/elements";
  import { costImages, formatCost } from "../lib/cards";
  import type { Card } from "../lib/types";

  let { card, class: className }: { card: Card; class?: ClassValue } = $props();

  const label = $derived(formatCost(card));
  // the wiki's images, or shapes like them if one fails to load
  let failedCost = $state<string | null>(null);
  const showImages = $derived(import.meta.env.VITE_CARD_IMAGES !== "false" && failedCost !== label);
</script>

<span
  class={["inline-flex items-center gap-0.5 align-middle", className]}
  aria-label="Cost {label}"
>
  {#if showImages}
    {#each costImages(card.cost) as url (url)}
      <img src={url} alt="" class="h-[1.7em] w-auto" onerror={() => (failedCost = label)} />
    {/each}
  {:else}
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
    {#if card.cost.extra}<span class="self-start leading-none font-extrabold"
        >{card.cost.extra}</span
      >{/if}
  {/if}
</span>
