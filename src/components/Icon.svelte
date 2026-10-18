<script lang="ts" module>
  // 24×24 stroke icons
  const PATHS = {
    back: "M15 18l-6-6 6-6",
    next: "M9 6l6 6-6 6",
    check: "M5 12.5l4.5 4.5L19 7.5",
    close: "M6 6l12 12M18 6L6 18",
    collection:
      "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM9 5v14M4 10h5M4 14.5h5",
    share: "M12 15V4M8 8l4-4 4 4M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13",
    copy: "M9 9.5A1.5 1.5 0 0 1 10.5 8h8A1.5 1.5 0 0 1 20 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 9 18.5zM15 8V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H9",
    shuffle:
      "M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.5 0 2.5-1 3.3-2.5M13.2 9.5C14 8 15 7 16.5 7H20M17 4l3 3-3 3M17 14l3 3-3 3",
    options: "M5 7h9M18 7h1M5 17h1M10 17h9M14 4.5v5M6 14.5v5",
    external:
      "M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10",
    bookmark: "M6.5 4h11A1.5 1.5 0 0 1 19 5.5V20l-7-4.5L5 20V5.5A1.5 1.5 0 0 1 6.5 4z",
    bookmarked:
      "M6.5 4h11A1.5 1.5 0 0 1 19 5.5V20l-7-4.5L5 20V5.5A1.5 1.5 0 0 1 6.5 4zM9 10l2 2 4-4",
    ban: "M5.6 5.6l12.8 12.8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  } as const;

  export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
  let { name, class: className = "size-5" }: { name: IconName; class?: string } = $props();
</script>

<svg
  class={className}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>
