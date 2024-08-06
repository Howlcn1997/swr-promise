import concurPromise from "concur-promise";
import throttle from "lodash.throttle";
import isEqual from "lodash.isequal";
import Store from "./store";

const queueMacroTasks =
  typeof requestIdleCallback !== "undefined" ? requestIdleCallback : setTimeout;

enum Status {
  UNTERMINATED = 0,
  TERMINATED = 1,
  ERRORED = 2,
}

interface CacheNode {
  s: Status;
  v: any; // value
  e: number; // expire
  swr: number; // stale-while-revalidate
  sie: number; // stale-if-error

  _maxAge: number;
  _swr: number;
  _sie: number;
}

function createCacheNode(
  maxAge: number,
  swr: number = 0,
  sie: number = 0
): CacheNode {
  const now = Date.now();
  return {
    s: Status.UNTERMINATED, // status
    v: undefined,
    e: now + maxAge, // expire
    swr: 0,
    sie: 0,

    _maxAge: maxAge,
    _swr: swr,
    _sie: sie,
  };
}

"a".substr;

interface Options {
  maxAge?: number;
  swr?: number;
  sie?: number;
  maxCacheSize?: number;

  cacheFulfilled?: (args: any[], value: any) => boolean;
  cacheRejected?: (args: any[], error: any) => boolean;
  argsEqual?: (a: any[], b: any[]) => boolean;
  storeCreator?: (promiseFn: PromiseFn) => any;
  onEmitted?: (
    event: string,
    info: { cache: Store<any, CacheNode>; args?: any[]; gcCount?: number }
  ) => void;
}

type PromiseFn = (...args: any[]) => Promise<any>;

function createCacheStore(): Store<any, CacheNode> {
  return new Store<any, CacheNode>();
}

/**
 * @param {Function} promiseFn
 * @param {Number} options.maxAge Cache validity period (ms), default is 0, when it is Infinity, it is cached permanently
 * @param {Number} options.swr Cache expiration tolerance time (ms), default Infinity
 * @param {Number} options.sie Update error tolerance time (ms), default is Infinity
 * @param {maxCacheSize} options.maxCacheSize Maximum cache size
 *
 * @param {Function} options.cacheFulfilled Whether to cache the current normal result, the default is true (arguments, value) => boolean
 * @param {Function} options.cacheRejected Whether to cache the current exception result, the default is false (arguments, error) => boolean
 * @returns
 */
export default function swrPromise(
  promiseFn: PromiseFn,
  options: Options = {}
) {
  const {
    maxAge = 0,
    swr = Infinity,
    sie = Infinity,
    maxCacheSize,
    cacheFulfilled = () => true,
    cacheRejected = () => false,
    argsEqual = isEqual,
    storeCreator = createCacheStore,
    onEmitted = () => {},
  } = options;

  const cacheStore = storeCreator(promiseFn) as Store<any, CacheNode>;

  promiseFn = concurPromise(promiseFn);

  const callGC = throttle(() => {
    /**
     * TODO:
     *  - GC efficiency supporting large cache volumes: minHeap
     */
    const now = Date.now();
    let gcCount = 0;
    for (const [key, val] of cacheStore.entries()) {
      const needClear = val.swr < now && val.sie < now && val.e < now;
      if (needClear) {
        gcCount++;
        cacheStore.delete(key);
      }
    }

    /**
     * After clearing expired data,
     * if the cache size still exceeds the maximum cache size,
     * the cache is cleared according to the LRU strategy.
     */
    if (maxCacheSize && cacheStore.size() > maxCacheSize) {
      let overClearCount = 0;
      const safeSize = Math.floor(maxCacheSize * 0.7);
      const clearSize = cacheStore.size() - safeSize;

      for (const [key] of cacheStore.entries()) {
        if (overClearCount <= clearSize) {
          cacheStore.delete(key);
          overClearCount++;
        } else {
          break;
        }
      }

      gcCount += overClearCount;
    }

    onEmitted("gc", { cache: cacheStore, gcCount });
  }, 5000);

  return concurPromise(function (...args: any[]) {
    queueMacroTasks(callGC);

    const [currentArgs, result] = Array.from(cacheStore.entries()).find(([a]) =>
      argsEqual(a, args)
    ) || [args, createCacheNode(maxAge, swr, sie)];

    if (result.s === Status.UNTERMINATED) {
      onEmitted("no-cache", { cache: cacheStore, args });
      return update(currentArgs);
    }

    const now = Date.now();

    const isValid = result.e >= now;
    if (isValid) {
      onEmitted("max-age", { cache: cacheStore, args });
      return response(result);
    }

    const isInSWR = result.swr > now;
    const isInSIE = result.sie > now;

    if (isInSWR || isInSIE) {
      onEmitted(isInSWR ? "swr" : "sie", { cache: cacheStore, args });
      update(currentArgs);
      return response(result);
    }

    onEmitted("block", { cache: cacheStore, args });
    return update(currentArgs);

    function response(result: CacheNode): Promise<CacheNode["v"]> {
      if (result.s === Status.TERMINATED) return Promise.resolve(result.v);
      if (result.s === Status.ERRORED) return Promise.reject(result.v);
      throw new Error("unknown status");
    }

    async function update(selfArgs: any[]) {
      return promiseFn
        .apply(null, selfArgs)
        .then((value: any) => {
          result.s = Status.TERMINATED;
          result.v = value;
          result.e = Date.now() + result._maxAge;
          result.swr = result.e + result._swr;
          result.sie = 0;

          if (cacheFulfilled(selfArgs, value)) {
            cacheStore.delete(selfArgs);
            cacheStore.set(selfArgs, result);
          }

          onEmitted("update-success", { cache: cacheStore, args: selfArgs });
          return response(result);
        })
        .catch((error) => {
          const now = Date.now();
          const isInSWR = result.swr > now;
          if (isInSWR) {
            result.swr = 0;
            result.sie = now + result._sie;

            onEmitted("update-error-swr", {
              cache: cacheStore,
              args: selfArgs,
            });
            return response(result);
          }

          const isInSIE = result.sie > now;

          if (isInSIE) {
            result.swr = 0;

            onEmitted("update-error-sie", {
              cache: cacheStore,
              args: selfArgs,
            });
            return response(result);
          }

          // Now in the Block
          result.s = Status.ERRORED;
          result.v = error;
          result.e = now + result._maxAge;
          result.sie = result.e + result._sie;
          result.sie = 0;

          if (cacheRejected(selfArgs, error)) {
            cacheStore.set(selfArgs, result);
          } else {
            cacheStore.delete(selfArgs);
          }

          onEmitted("update-error-block", {
            cache: cacheStore,
            args: selfArgs,
          });
          return response(result);
        });
    }
  });
}
