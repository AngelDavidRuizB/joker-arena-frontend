import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Storage en memoria para los tests.
 *
 * En esta combinación (jsdom + Node 22+) `window.localStorage` no está disponible y Node
 * define un `localStorage` experimental en globalThis que devuelve `undefined` (avisa de
 * `--localstorage-file`). Zustand persist y los tests necesitan un Storage real, así que lo
 * instalamos en `globalThis` y en `window`; si jsdom sí lo expone, se respeta el original.
 */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key: string) => items.get(String(key)) ?? null,
    key: (index: number) => Array.from(items.keys())[index] ?? null,
    removeItem: (key: string) => {
      items.delete(String(key));
    },
    setItem: (key: string, value: string) => {
      items.set(String(key), String(value));
    },
  } as Storage;
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  const existing = typeof window !== 'undefined' ? window[key] : undefined;
  const storage = existing ?? memoryStorage();
  for (const target of [globalThis, window]) {
    if (target[key] === storage) continue;
    try {
      Object.defineProperty(target, key, { value: storage, configurable: true, writable: true });
    } catch {
      // propiedad no configurable: se deja como está
    }
  }
}

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
});

// jsdom does not implement PointerEvent (framer-motion fires synthetic ones on keyboard "press")
if (!('PointerEvent' in window)) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
}

// jsdom does not implement matchMedia (used by framer-motion for reduced motion)
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
