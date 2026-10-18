/// <reference types="svelte" />
/// <reference types="vite/client" />

/** The file name of the dominion-setup wheel in public/wheels/. */
declare const __WHEEL_FILE__: string;

interface ImportMetaEnv {
  /** "false" to show styled tiles instead of the card images. */
  readonly VITE_CARD_IMAGES?: string;
}
