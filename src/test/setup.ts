import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 22+ define un `localStorage` experimental en globalThis (exige --localstorage-file).
// Como la clave ya existe, Vitest no copia la de jsdom y el almacenamiento queda undefined:
// aquí reinstalamos las de jsdom para que los tests puedan usarlas.
if (typeof window !== 'undefined' && window.localStorage) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    if (globalThis[key] !== window[key]) {
      Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
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
