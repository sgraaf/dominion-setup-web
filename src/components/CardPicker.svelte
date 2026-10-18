<!-- Pick cards by name, with suggestions as you type. -->
<script lang="ts">
  import type { Card } from "../lib/types";
  import Icon from "./Icon.svelte";

  let {
    label,
    cards,
    selected = $bindable(),
    hideLabel = false,
  }: {
    label: string;
    cards: Card[];
    selected: string[];
    /** Keep the label for screen readers only, as when a row above already shows it. */
    hideLabel?: boolean;
  } = $props();

  const id = $props.id();
  let query = $state("");

  function add() {
    const name = query.trim().toLowerCase();
    const card = cards.find((card) => card.name.toLowerCase() === name);
    if (!card) return;
    if (!selected.includes(card.name)) selected = [...selected, card.name];
    query = "";
  }
</script>

<div>
  <label
    for="{id}-input"
    class={hideLabel ? "sr-only" : "mb-2 block px-0.5 text-sm font-semibold text-muted"}
  >
    {label}
  </label>
  {#if selected.length}
    <ul class="mb-2.5 flex flex-wrap gap-1.5">
      {#each selected as name (name)}
        <li
          class="inline-flex h-8.5 items-center gap-1 rounded-full bg-surface-2 pr-1 pl-3.5 text-[15px]"
        >
          {name}
          <button
            type="button"
            class="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"
            onclick={() => (selected = selected.filter((other) => other !== name))}
            aria-label="Remove {name}"
          >
            <Icon name="close" class="size-3.5" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <input
    id="{id}-input"
    list="{id}-cards"
    bind:value={query}
    onchange={add}
    onkeydown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        add();
      }
    }}
    placeholder="Type a card name…"
    autocomplete="off"
    class="h-11 w-full rounded-xl bg-track px-3.5 text-ink placeholder:text-muted focus:outline-2 focus:outline-accent"
  />
  <datalist id="{id}-cards">
    {#each cards as card (card.name)}
      <option value={card.name}>{card.set}</option>
    {/each}
  </datalist>
</div>
