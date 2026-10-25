<!-- The details of a card, in a modal dialog. -->
<script lang="ts">
  import { isLandscape, isTraitMark, setIconUrl, wikiUrl } from "../lib/cards";
  import type { Card } from "../lib/types";
  import CardImage from "./CardImage.svelte";
  import Cost from "./Cost.svelte";
  import Icon from "./Icon.svelte";
  import SwapPicker from "./SwapPicker.svelte";

  let {
    card,
    onclose,
    excluded = false,
    ontoggleexclude,
    replacements = [],
    setOrder = [],
    onswap,
  }: {
    card: Card | null;
    onclose: () => void;
    excluded?: boolean;
    /** Exclude the card from (or include it in) future games, if it can be excluded. */
    ontoggleexclude?: () => void;
    /** The cards to suggest for a swap. */
    replacements?: Card[];
    /** The names of the sets, in order, to sort the replacements by set. */
    setOrder?: string[];
    /** Swap the card for *replacement*, or for a random one if `null`; returns the error, if any. */
    onswap?: (replacement: string | null) => Promise<string | null>;
  } = $props();

  let dialog: HTMLDialogElement;
  // whether the cards to swap for are shown, instead of the card
  let picking = $state(false);
  let swapping = $state(false);
  let swapError = $state<string | null>(null);

  $effect(() => {
    if (card && !dialog.open) dialog.showModal();
    if (!card && dialog.open) dialog.close();
    if (!card) {
      picking = false;
      swapError = null;
    }
  });

  async function swap(replacement: string | null) {
    if (!onswap) return;
    swapping = true;
    swapError = await onswap(replacement);
    swapping = false;
  }

  /** Show the cards to swap for, or the card again, from the top. */
  function showPicker(show: boolean) {
    picking = show;
    swapError = null;
    dialog.scrollTop = 0;
  }
</script>

<dialog
  bind:this={dialog}
  {onclose}
  onclick={(event) => event.target === dialog && dialog.close()}
  class={[
    "m-auto max-h-[92dvh] w-[min(94vw,46rem)] overflow-y-auto rounded-2xl bg-surface p-0 text-ink shadow-2xl ring-1 ring-edge",
    // as high as it can be, so that it keeps its size as the search narrows down the cards
    picking && "h-[92dvh]",
  ]}
  aria-labelledby="card-sheet-title"
>
  {#if card && picking}
    <SwapPicker
      {card}
      cards={replacements}
      {setOrder}
      error={swapError}
      disabled={swapping}
      onpick={swap}
      onback={() => showPicker(false)}
      onclose={() => dialog.close()}
    />
  {:else if card}
    {@const landscape = isLandscape(card)}
    <div
      class={["grid gap-5 p-5", landscape ? "grid-cols-1" : "sm:grid-cols-[minmax(0,17rem)_1fr]"]}
    >
      <div
        class={[
          "overflow-hidden rounded-xl bg-black shadow-lg",
          !landscape && "mx-auto w-full max-w-64 sm:max-w-none",
        ]}
      >
        <CardImage {card} sizes="(min-width: 640px) 34rem, 90vw" />
      </div>
      <div class="flex flex-col">
        <div class="flex items-start justify-between gap-3">
          <h2 id="card-sheet-title" class="text-2xl leading-tight font-extrabold">{card.name}</h2>
          <button
            type="button"
            class="-mt-1.5 -mr-1.5 grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
            onclick={() => dialog.close()}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted">
          <Cost {card} />
          <span>{card.types.join(" – ")}</span>
          <span class="inline-flex items-center gap-1.5">
            {#if import.meta.env.VITE_CARD_IMAGES !== "false"}
              <img
                src={setIconUrl(card.set)}
                alt=""
                class="size-4 object-contain brightness-0 dark:invert"
                onerror={(event) => event.currentTarget.classList.add("hidden")}
              />
            {/if}
            {card.set}
          </span>
        </div>
        {#if card.marks.length || card.size !== null}
          <div class="mt-3 flex flex-wrap gap-1.5">
            {#each card.marks as mark (mark)}
              <span
                class={[
                  "rounded-full px-2.5 py-0.5 text-xs font-bold",
                  isTraitMark(mark) ? "bg-trait text-on-trait" : "bg-accent text-on-accent",
                ]}
              >
                {mark}
              </span>
            {/each}
            {#if card.size !== null}
              <span class="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold">
                {card.size} cards in the pile
              </span>
            {/if}
          </div>
        {/if}
        <p class="mt-4 leading-relaxed whitespace-pre-line">{card.instructions}</p>
        <a
          href={wikiUrl(card.name)}
          target="_blank"
          rel="noopener"
          class="mt-4 inline-flex items-center gap-1.5 self-start font-semibold text-muted underline underline-offset-4 hover:text-ink"
        >
          Read more on the wiki
          <Icon name="external" class="size-4" />
        </a>
        {#if onswap}
          <div class="mt-6 flex flex-col gap-2.5">
            <!-- as wide as each other, with "or" between them -->
            <div class="grid gap-1.5 self-start">
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 font-semibold hover:bg-surface-3 disabled:opacity-50"
                onclick={() => swap(null)}
                disabled={swapping}
              >
                <Icon name="shuffle" class="size-4" />
                Swap for a random card
              </button>
              <div class="flex items-center gap-3 text-sm text-muted">
                <span aria-hidden="true" class="h-px flex-1 bg-muted/25"></span>
                or
                <span aria-hidden="true" class="h-px flex-1 bg-muted/25"></span>
              </div>
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 font-semibold hover:bg-surface-3 disabled:opacity-50"
                onclick={() => showPicker(true)}
                disabled={swapping}
              >
                Swap for a card you pick
                <Icon name="next" class="size-4" />
              </button>
            </div>
            {#if swapError}
              <p class="text-sm text-danger" role="alert">{swapError}</p>
            {/if}
          </div>
        {/if}
        {#if ontoggleexclude}
          <button
            type="button"
            class="mt-6 inline-flex h-11 items-center gap-2 self-start rounded-xl bg-surface-2 px-4 font-semibold hover:bg-surface-3"
            onclick={ontoggleexclude}
            aria-pressed={excluded}
          >
            <Icon name={excluded ? "check" : "ban"} class="size-4" />
            {excluded ? "Excluded from future games" : "Exclude from future games"}
          </button>
        {/if}
      </div>
    </div>
  {/if}
</dialog>
