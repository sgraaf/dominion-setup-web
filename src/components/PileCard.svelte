<!-- A card on the table, with its set's icon and its pile's marks and size; tap it for the details. -->
<script lang="ts">
  import { isLandscape, isTraitMark, setIconUrl } from "../lib/cards";
  import { deal } from "../lib/transitions";
  import type { Card } from "../lib/types";
  import CardImage from "./CardImage.svelte";

  let {
    card,
    onopen,
    index = 0,
    sizes,
    small = false,
    icon = true,
    size = false,
  }: {
    card: Card;
    onopen: (card: Card) => void;
    /** The card's position in the deal, to stagger the animation. */
    index?: number;
    sizes?: string;
    /** Show less of the card on a phone, as for the piles outside the Kingdom. */
    small?: boolean;
    /** Show the icon of the card's set on its art. */
    icon?: boolean;
    /** Show the pile's size even if it is the usual 10. */
    size?: boolean;
  } = $props();

  let iconFailed = $state(false);
  // a sideways card among the small piles is turned upright, like the cards next to it
  const rotated = $derived(small && isLandscape(card));
  const landscape = $derived(!small && isLandscape(card));
  const showIcon = $derived(icon && !iconFailed && import.meta.env.VITE_CARD_IMAGES !== "false");
  const showSize = $derived(card.size !== null && (size || card.size !== 10));
</script>

<!-- on a phone the top of the card (its name and art), on a larger screen all of it -->
<button
  type="button"
  class={[
    "relative block w-full overflow-hidden rounded-xl bg-black text-left transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    small && !landscape && "md:rounded-lg",
  ]}
  onclick={() => onopen(card)}
  aria-label={card.name}
  in:deal|global={{ delay: index * 60 }}
>
  <div
    class={[
      "overflow-hidden",
      landscape
        ? "aspect-[4] md:aspect-[8/5]"
        : small
          ? "aspect-[1.3] md:aspect-[5/8]"
          : "aspect-[1.45] md:aspect-[5/8]",
    ]}
  >
    {#if rotated}
      <!-- the middle of it on a phone, where its name is -->
      <div class="relative top-1/2 aspect-[5/8] -translate-y-1/2">
        <div class="absolute top-1/2 left-1/2 w-[160%] -translate-1/2 -rotate-90">
          <CardImage {card} {sizes} />
        </div>
      </div>
    {:else}
      <CardImage {card} {sizes} />
    {/if}
  </div>
  {#if showIcon}
    <!-- centred on the art that is shown -->
    <img
      src={setIconUrl(card.set)}
      alt=""
      class={[
        "pointer-events-none absolute object-contain opacity-75 brightness-0 drop-shadow-[0_1px_3px_rgb(0_0_0/0.55)] invert",
        landscape
          ? "top-[37.25%] left-[16.25%] h-[53.5%] w-[67.5%] md:top-[22%] md:left-[23%] md:h-[33.5%] md:w-[54%]"
          : "top-[32.75%] left-[16.25%] h-[57.5%] w-[67.5%] md:top-[18.25%] md:left-[23%] md:h-[25.5%] md:w-[54%]",
      ]}
      onerror={() => (iconFailed = true)}
    />
  {/if}
  {#if card.marks.length || showSize}
    <div
      class={[
        "pointer-events-none absolute inset-x-1.5 flex items-end justify-between gap-1",
        landscape ? "bottom-1.5" : "bottom-1.5 md:bottom-1/2",
      ]}
    >
      <span class="flex flex-col items-start gap-1">
        {#each card.marks as mark (mark)}
          <span
            class={[
              "rounded-full px-2 py-0.5 text-[11px] font-bold",
              isTraitMark(mark) ? "bg-trait text-on-trait" : "bg-accent text-on-accent",
            ]}
          >
            {mark}
          </span>
        {/each}
      </span>
      {#if showSize}
        <span
          class="rounded-full bg-bar/85 px-2 py-0.5 text-[13px] font-bold text-ink tabular-nums"
          title="{card.size} cards in the pile"
        >
          ×{card.size}
        </span>
      {/if}
    </div>
  {/if}
</button>
