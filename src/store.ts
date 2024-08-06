type Storage<A, T> = Map<A, T>;

const Storage = Map;

// A: Agreement, T: CacheNode
export default class Store<A, T> {
  store: Storage<A, T>;
  constructor() {
    this.store = new Storage<A, T>();
  }

  set(key: A, value: T) {
    return this.store.set(key, value);
  }

  get(key: A): T | undefined {
    const isExist = this.store.has(key);
    if (!isExist) return undefined;

    const value = this.store.get(key);
    // LRU
    this.store.delete(key);
    this.store.set(key, value as T);
    return value;
  }

  entries() {
    return this.store.entries();
  }

  delete(key: A) {
    return this.store.delete(key);
  }

  clear() {}

  size() {
    return this.store.size;
  }
}
