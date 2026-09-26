import type { Component, Snippet } from 'svelte'

/** Marks markup for translation. The Vite plugin replaces it at build
 * time, at runtime it just renders its children. */
declare const T: Component<{ children?: Snippet }>

export default T
