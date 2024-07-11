# swr-promise

[![NPM version](https://img.shields.io/npm/v/swr-promise.svg?style=flat)](https://npmjs.com/package/swr-promise)
[![NPM downloads](http://img.shields.io/npm/dm/swr-promise.svg?style=flat)](https://npmjs.com/package/swr-promise)

## Install

```bash
$ npm install swr-promise
```

## Usage

```typescript
import swrPromise from "swr-promise";

const fetchData = (url: string) => fetch(url);

const fetchDataSWR = swrPromise(fetchData);

fetchDataSWR("https://api.example.com/data")
  .then(console.log)
  .catch(console.error);
```

## API

### swrPromise(promiseFn, [options])

#### Parameters

- `promiseFn`: The Promise function to be wrapped.
- `options`(optional): An options object with the following properties:
  - `maxAge`: Cache validity period (ms), default is 0, when it is Infinity, it is cached permanently
  - `swr`: Cache expiration tolerance time (ms), default 0 (`stale-while-revalidate`)
  - `sie`: Update error tolerance time (ms), default is Infinity (`stale-if-error`)
  - `gcThrottle`: Garbage collection throttling time (ms), the default is 0, when it is 0, no garbage collection is performed
  - `cacheFulfilled`: Whether to cache the current normal result, the default is true (arguments, value) => boolean
  - `cacheRejected`: Whether to cache the current exception result, the default is false (arguments, error) => boolean
  - `argsEqual`(optional): Compares the two argument arrays for equality to ensure correct matching and lookup of cache entries in the cache
  - `storeCreator`(optional): creates a Map to store cached data, but you can use other media such as SQlite by passing a custom storeCreator function

#### Returns

- A new function that accepts the same arguments as `promiseFn` and returns a Promise.

## Example

```typescript
import swrPromise from "swr-promise";

const mock = () =>
  new Promise((resolve) => setTimeout(() => resolve(Math.random()), 1000));

const swrMock = swrPromise(mock, { maxAge: 1000, swr: 1000 });

await swrMock().then(console.log); // 0.9504613827463109
await swrMock().then(console.log); // 0.9504613827463109 same response

// simulate waiting for 1 second
await sleep(1000);

await swrMock().then(console.log); // 0.9504613827463109 same response, but mock function re-executes

```

## LICENSE

MIT
