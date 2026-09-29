import { useSyncExternalStore } from "react";

// Nothing to subscribe to: the snapshot only differs between server and client.
const subscribe = () => () => {};

/**
 * Returns false during server rendering and hydration, true afterwards.
 * Use it to render browser-only values (localStorage, theme, ...) without a
 * hydration mismatch — and without calling setState inside an effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
