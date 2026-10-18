<!-- An option, with its value; tap it to change it. Only one is open at a time. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  let { label, value, children }: { label: string; value: string; children: Snippet } = $props();
</script>

<details name="option" class="group border-t border-line first:border-t-0">
  <summary
    class="flex min-h-13 items-center justify-between gap-3 py-2 pr-2.5 pl-4 hover:bg-surface-2/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
  >
    <span class="shrink-0">{label}</span>
    <span class="flex min-w-0 items-center gap-0.5 text-muted">
      <span class="truncate">{value}</span>
      <Icon name="next" class="size-4.5 shrink-0 transition-transform group-open:rotate-90" />
    </span>
  </summary>
  <div class="px-4 pt-1 pb-4">
    {@render children()}
  </div>
</details>
