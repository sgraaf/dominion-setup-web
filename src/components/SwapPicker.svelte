<!-- The cards that a card can be swapped for, to search and sort; tap one to swap for it. -->
<script lang="ts">
  import { groupKingdom, isLandscape, searchCards, setIconUrl, sortCards } from "../lib/cards";
  import { preferences } from "../lib/settings.svelte";
  import { SORT_ORDERS, type Card, type SortOrder } from "../lib/types";
  import CardImage from "./CardImage.svelte";
  import Cost from "./Cost.svelte";
  import Icon from "./Icon.svelte";
  import Segmented from "./Segmented.svelte";

  let {
    card,
    cards,
    setOrder,
    error,
    disabled,
    onpick,
    onback,
    onclose,
  }: {
    /** The card to swap. */
    card: Card;
    /** The cards to swap it for. */
    cards: Card[];
    /** The names of the sets, in order, to sort the cards by set. */
    setOrder: string[];
    error: string | null;
    disabled: boolean;
    onpick: (replacement: string) => void;
    onback: () => void;
    onclose: () => void;
  } = $props();

  const id = $props.id();
  let query = $state("");
  // as the Kingdom is sorted, to begin with
  let sortOrder = $state<SortOrder>(preferences.value.sort_order);

  const found = $derived(searchCards(cards, query));
  const groups = $derived(groupKingdom(sortCards(found, sortOrder, setOrder), sortOrder));
  const landscape = $derived(isLandscape(card));
  const showIcons = import.meta.env.VITE_CARD_IMAGES !== "false";
</script>

<div class="sticky top-0 z-10 flex flex-col gap-3 bg-surface px-5 pt-5 pb-4">
  <div class="flex items-center gap-1">
    <button
      type="button"
      class="-my-1.5 -ml-2.5 grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
      onclick={onback}
      aria-label="Back"
    >
      <Icon name="back" />
    </button>
    <h2 id="card-sheet-title" class="flex-1 text-xl leading-tight font-extrabold">
      Swap {card.name} for…
    </h2>
    <button
      type="button"
      class="-my-1.5 -mr-1.5 grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
      onclick={onclose}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  <label for="{id}-search" class="sr-only">Search the cards</label>
  <input
    id="{id}-search"
    type="search"
    bind:value={query}
    placeholder="Search by name…"
    autocomplete="off"
    class="h-11 w-full rounded-xl bg-track px-3.5 text-ink placeholder:text-muted focus:outline-2 focus:outline-accent"
    {@attach (input) => input.focus()}
  />
  <Segmented
    label="Sort the cards by"
    hideLabel
    choices={Object.entries(SORT_ORDERS).map(([value, label]) => ({
      value: value as SortOrder,
      label,
    }))}
    bind:value={sortOrder}
  />
  {#if error}
    <p class="text-sm text-danger" role="alert">{error}</p>
  {/if}
</div>

{#if found.length}
  <!-- grouped by cost or by set, like the Kingdom -->
  <ul aria-label="Cards to swap for" class="flex flex-col gap-5 px-5 pb-5">
    {#each groups as group (group.key)}
      <li>
        {#if group.key}
          <div class="mb-2.5 flex h-8 items-center gap-2.5">
            {#if sortOrder === "cost"}
              <Cost card={group.cards[0]!} class="text-[17px]" />
            {:else}
              {#if showIcons}
                <span class="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2">
                  <img
                    src={setIconUrl(group.cards[0]!.set)}
                    alt=""
                    class="size-5 object-contain brightness-0 dark:invert"
                    onerror={(event) => event.currentTarget.classList.add("hidden")}
                  />
                </span>
              {/if}
              <span class="text-[15px] font-semibold whitespace-nowrap">{group.key}</span>
            {/if}
            <span aria-hidden="true" class="h-px min-w-3 flex-1 bg-muted/25"></span>
          </div>
        {/if}
        <!-- on a phone the top of each card (its name and art), on a larger screen all of it -->
        <ul
          class={[
            "grid gap-2.5",
            landscape
              ? "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]"
              : "grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]",
          ]}
        >
          {#each group.cards as replacement (replacement.name)}
            <li>
              <button
                type="button"
                class="block w-full overflow-hidden rounded-lg bg-black transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                onclick={() => onpick(replacement.name)}
                {disabled}
                aria-label={replacement.name}
              >
                <div class={["overflow-hidden", !landscape && "aspect-[1.3] sm:aspect-auto"]}>
                  <CardImage
                    card={replacement}
                    sizes={landscape
                      ? "(min-width: 640px) 11rem, 45vw"
                      : "(min-width: 640px) 7rem, 30vw"}
                  />
                </div>
              </button>
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ul>
{:else}
  <p class="px-5 pb-5 text-muted">
    {query.trim() ? `No cards match “${query.trim()}”.` : "There are no cards to swap for."}
  </p>
{/if}
