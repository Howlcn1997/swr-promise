import type { SwrPromiseCacheNode as CacheNode } from "./index";

type Storage<A, T> = Map<A, T>;

const Storage = Map;

interface Store< A extends any[] = any[], T extends CacheNode = CacheNode> {
  set(key: A, value: T): void;
  get(key: A): T | undefined;
  entries(): IterableIterator<[A, T]>;
  delete(key: A): boolean;
  size(): number;
}

// V: Value of data, A: Agreement, T: CacheNode
class Store< A extends any[], T extends CacheNode> {
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

  size() {
    return this.store.size;
  }
}

export default Store