<!-- Choose the sets and Promos you own. -->
<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { setIconUrl } from "../lib/cards";
  import type { Collection } from "../lib/settings.svelte";
  import type { Catalog, SetEdition } from "../lib/types";
  import Icon from "./Icon.svelte";

  let {
    catalog,
    initial,
    onsave,
    oncancel,
  }: {
    catalog: Catalog;
    initial: Collection | null;
    onsave: (collection: Collection) => void;
    oncancel?: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const sets = new SvelteSet(initial?.sets ?? []);
  // svelte-ignore state_referenced_locally
  const promos = new SvelteSet(initial?.promos ?? []);

  // the editions of each set (but Promo), in set order
  const groups = $derived.by(() => {
    const groups = new Map<string, SetEdition[]>();
    for (const set of catalog.sets) {
      if (set.key !== "promo") groups.set(set.name, [...(groups.get(set.name) ?? []), set]);
    }
    return [...groups.entries()];
  });
  const promoCards = $derived(catalog.cards.filter((card) => card.promo));
  const allPromos = $derived(sets.has("promo"));

  function toggle(collection: SvelteSet<string>, key: string) {
    if (collection.has(key)) collection.delete(key);
    else collection.add(key);
  }

  function save() {
    onsave({
      sets: catalog.sets.map((set) => set.key).filter((key) => sets.has(key)),
      promos: allPromos
        ? []
        : promoCards.map((card) => card.name).filter((name) => promos.has(name)),
    });
  }
</script>

<section class="pb-28">
  <h2 class="text-[30px] leading-tight font-extrabold">Your collection</h2>
  <p class="mt-2 max-w-prose text-muted">
    Pick the sets you own. Kingdoms are dealt from these, and you can change them at any time.
  </p>

  <div class="mt-4 flex gap-2 text-sm">
    <button
      type="button"
      class="h-9 rounded-full bg-surface-2 px-3.5 font-semibold hover:bg-surface-3"
      onclick={() => catalog.sets.forEach((set) => set.edition !== 1 && sets.add(set.key))}
    >
      Select all
    </button>
    <button
      type="button"
      class="h-9 rounded-full bg-surface-2 px-3.5 font-semibold hover:bg-surface-3"
      onclick={() => {
        sets.clear();
        promos.clear();
      }}
    >
      Clear
    </button>
  </div>

  <ul class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {#each groups as [name, editions] (name)}
      {@const owned = editions.some((set) => sets.has(set.key))}
      <li
        class={[
          "relative flex flex-col rounded-2xl bg-surface p-4 transition-shadow",
          owned ? "ring-2 ring-accent" : "ring-1 ring-edge",
        ]}
      >
        {#if editions.length === 1 && editions[0]}
          {@const set = editions[0]}
          <button
            type="button"
            class="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-pressed={sets.has(set.key)}
            aria-label={name}
            onclick={() => toggle(sets, set.key)}
          ></button>
        {/if}
        <div class="flex items-start justify-between gap-2">
          <h3 class="flex items-center gap-2 text-[17px] leading-tight font-bold">
            {#if import.meta.env.VITE_CARD_IMAGES !== "false"}
              <img
                src={setIconUrl(name)}
                alt=""
                class="size-5 shrink-0 object-contain brightness-0 dark:invert"
                onerror={(event) => event.currentTarget.classList.add("hidden")}
              />
            {/if}
            {name}
          </h3>
          {#if owned}
            <span class="rounded-full bg-accent p-0.5 text-on-accent">
              <Icon name="check" class="size-4" />
            </span>
          {/if}
        </div>
        <p class="mt-1 text-sm text-muted">
          {Math.max(...editions.map((set) => set.kingdom_card_count))} Kingdom cards
        </p>
        {#if editions.length > 1}
          <div class="mt-3 flex gap-1.5">
            {#each editions as set (set.key)}
              <button
                type="button"
                class={[
                  "h-9 flex-1 rounded-full px-2 text-sm font-semibold transition-colors",
                  sets.has(set.key)
                    ? "bg-accent text-on-accent"
                    : "bg-track text-muted hover:text-ink",
                ]}
                aria-pressed={sets.has(set.key)}
                aria-label="{name}, {set.edition === 1 ? '1st' : '2nd'} edition"
                onclick={() => toggle(sets, set.key)}
              >
                {set.edition === 1 ? "1st ed." : "2nd ed."}
              </button>
            {/each}
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <h3 class="mt-8 text-xl font-extrabold">Promos</h3>
  <p class="mt-1 text-sm text-muted">Promo cards are sold one by one: pick the ones you own.</p>
  <ul class="mt-3 flex flex-wrap gap-2">
    <li>
      <button
        type="button"
        class={[
          "h-9 rounded-full px-3.5 text-sm font-bold transition-colors",
          allPromos ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
        ]}
        aria-pressed={allPromos}
        onclick={() => toggle(sets, "promo")}
      >
        All Promos
      </button>
    </li>
    {#each promoCards as card (card.name)}
      {@const owned = allPromos || promos.has(card.name)}
      <li>
        <button
          type="button"
          class={[
            "h-9 rounded-full px-3.5 text-sm transition-colors disabled:opacity-60",
            owned
              ? "bg-accent font-semibold text-on-accent"
              : "bg-surface ring-1 ring-edge hover:bg-surface-2",
          ]}
          aria-pressed={owned}
          disabled={allPromos}
          onclick={() => toggle(promos, card.name)}
        >
          {card.name}
        </button>
      </li>
    {/each}
  </ul>
</section>

<div class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bar">
  <div
    class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6"
  >
    <span class="text-sm text-muted">
      {sets.size - (allPromos ? 1 : 0)} sets{allPromos
        ? " and all Promos"
        : promos.size
          ? ` and ${promos.size} Promos`
          : ""}
    </span>
    <div class="flex gap-2">
      {#if oncancel}
        <button
          type="button"
          class="h-12 rounded-2xl px-4 font-semibold text-muted hover:text-ink"
          onclick={oncancel}
        >
          Cancel
        </button>
      {/if}
      <button
        type="button"
        class="h-12 rounded-2xl bg-accent px-6 font-extrabold text-on-accent ring-1 ring-accent-edge ring-inset hover:bg-accent-strong disabled:opacity-50"
        disabled={sets.size === 0 && promos.size === 0}
        onclick={save}
      >
        Save collection
      </button>
    </div>
  </div>
</div>
