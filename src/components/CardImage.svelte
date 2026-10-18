<!-- A card's image, or a tile in the colours of its types if there is no image. -->
<script lang="ts">
  import { COMPOSITE_IMAGES, imageUrl, isDark, isLandscape, tileBackground } from "../lib/cards";
  import type { Card } from "../lib/types";
  import Cost from "./Cost.svelte";

  let {
    card,
    sizes = "(min-width: 768px) 18vw, 45vw",
  }: {
    card: Card;
    /** The width the image is shown at, to choose between the 320 and 640 pixel images. */
    sizes?: string;
  } = $props();

  let failedImage = $state<string | null>(null);
  const showImage = $derived(
    import.meta.env.VITE_CARD_IMAGES !== "false" && failedImage !== card.image,
  );
  const composite = $derived(COMPOSITE_IMAGES[card.name]);
  const landscape = $derived(isLandscape(card));
  const dark = $derived(isDark(card));
</script>

<div
  class={[
    "@container relative overflow-hidden bg-surface-2",
    landscape ? "aspect-[8/5]" : "aspect-[5/8]",
  ]}
>
  {#if showImage && composite}
    <!-- the cards (e.g. the three Shelters), each one's name showing above the next -->
    {#each composite as image, i (image)}
      <img
        class="absolute w-[76%] rounded-[4%] shadow-[0_0_6px_rgb(0_0_0/0.6)]"
        style:left="{i * 12}%"
        style:top="{i * 12}%"
        src={imageUrl(image, 320)}
        srcset="{imageUrl(image, 320)} 320w, {imageUrl(image, 640)} 640w"
        {sizes}
        alt={image.replace(/\.[^.]+$/, "")}
        loading="lazy"
        decoding="async"
        onerror={() => (failedImage = card.image)}
      />
    {/each}
  {:else if showImage}
    <img
      class="size-full object-cover object-top"
      src={imageUrl(card.image, 320)}
      srcset="{imageUrl(card.image, 320)} 320w, {imageUrl(card.image, 640)} 640w"
      {sizes}
      alt={card.name}
      loading="lazy"
      decoding="async"
      onerror={() => (failedImage = card.image)}
    />
  {:else}
    <div
      class={[
        "flex size-full flex-col p-[6cqw] text-center",
        dark ? "text-[#eeebf5]" : "text-[#1c1a24]",
      ]}
      style:background={tileBackground(card)}
      data-testid="card-tile"
    >
      <div
        class={[
          "rounded-sm px-1 py-[1.5cqw] text-[9cqw] leading-tight font-extrabold",
          dark ? "bg-black/30" : "bg-white/45",
        ]}
      >
        {card.name}
      </div>
      <p
        class="mt-[4cqw] min-h-0 flex-1 overflow-hidden text-[6cqw] leading-snug whitespace-pre-line opacity-85"
      >
        {card.instructions}
      </p>
      <div class="flex items-end justify-between gap-1 text-[7cqw]">
        <Cost {card} />
        <span class="truncate text-[6cqw] font-semibold">{card.types.join(" – ")}</span>
      </div>
    </div>
  {/if}
</div>
