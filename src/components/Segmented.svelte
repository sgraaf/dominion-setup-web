<!-- A row of mutually exclusive choices. -->
<script lang="ts" generics="T">
  let {
    label,
    choices,
    value = $bindable(),
    hideLabel = false,
  }: {
    label: string;
    choices: { value: T; label: string }[];
    value: T;
    /** Keep the label for screen readers only, as when a row above already shows it. */
    hideLabel?: boolean;
  } = $props();

  const name = $props.id();
</script>

<fieldset>
  <legend class={hideLabel ? "sr-only" : "mb-2 px-0.5 text-sm font-semibold text-muted"}>
    {label}
  </legend>
  <div class="grid auto-cols-fr grid-flow-col gap-1 rounded-[14px] bg-track p-1">
    {#each choices as choice (choice.label)}
      <label
        class={[
          "grid h-11 cursor-pointer place-items-center rounded-[10px] px-2 text-[15px] font-semibold whitespace-nowrap transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent",
          value === choice.value
            ? "bg-surface-3 text-ink shadow-raised"
            : "text-muted hover:text-ink",
        ]}
      >
        <input
          type="radio"
          class="sr-only"
          {name}
          checked={value === choice.value}
          onchange={() => (value = choice.value)}
        />
        {choice.label}
      </label>
    {/each}
  </div>
</fieldset>
