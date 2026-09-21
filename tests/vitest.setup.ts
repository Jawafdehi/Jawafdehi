class TestStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(String(key), String(value));
  }
}

// Newer Node versions expose an experimental, unconfigured `localStorage`
// global. It shadows jsdom's browser storage with `undefined` in Vitest worker
// processes, so browser-facing tests need an explicit test implementation.
//
// Runs for every suite, including the `environment: "node"` SSR ones, which have
// no `window` — those must not get a storage global either, so skip them rather
// than throwing on the missing `window`.
if (typeof window !== "undefined") {
  const storage = new TestStorage();

  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
}
