<!-- Things to do at the table, ticked off one by one. -->
<script lang="ts">
  import type { SvelteSet } from "svelte/reactivity";
  import { materialUrl } from "../lib/cards";
  import type { SetupInstruction } from "../lib/types";

  let {
    title,
    items,
    done,
    images = false,
  }: {
    title: string;
    items: (string | SetupInstruction)[];
    /** The items ticked off, by title, label and text (e.g. "Get out::Tavern mat"). */
    done: SvelteSet<string>;
    /** Show a picture of each item, a mat or a token. */
    images?: boolean;
  } = $props();

  const showImages = $derived(images && import.meta.env.VITE_CARD_IMAGES !== "false");
</script>

<!-- a card of its own on a phone, part of the setup panel on a larger screen -->
<section
  class="rounded-2xl bg-surface px-4 py-1.5 ring-1 ring-edge lg:bg-transparent lg:p-0 lg:ring-0"
>
  <h4 class="mt-2.5 mb-0.5 text-[15px] font-semibold text-muted">{title}</h4>
  <ul>
    {#each items as item, i (i)}
      {@const { label, text } = typeof item === "string" ? { label: "", text: item } : item}
      {@const key = `${title}:${label}:${text}`}
      <li>
        <label
          class={[
            "flex cursor-pointer gap-3.5 text-[17px] leading-snug lg:text-base",
            showImages ? "min-h-14 items-center py-1.5" : "items-start py-3",
          ]}
        >
          <input
            type="checkbox"
            class="size-6 shrink-0 accent-(--accent) lg:size-5.5"
            checked={done.has(key)}
            onchange={(event) => (event.currentTarget.checked ? done.add(key) : done.delete(key))}
          />
          {#if showImages}
            <img
              src={materialUrl(text)}
              alt=""
              class={["h-10 w-11 shrink-0 object-contain", done.has(key) && "opacity-45"]}
              onerror={(event) => event.currentTarget.classList.add("invisible")}
            />
          {/if}
          <span class={done.has(key) ? "text-muted line-through" : ""}>
            {#if label}<strong class="font-semibold">{label}:</strong>{/if}
            {text}
          </span>
        </label>
      </li>
    {/each}
  </ul>
</section>
