const swrPromise = require("../dist/cjs/index.js").default;

let count = 0;
const successMockApi = async () => Promise.resolve(++count);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => (count = 0));

describe('max-age', () => {
  const successMockApiCache = swrPromise(successMockApi, { maxAge: 1000, swr: 0, sie: 0, gcThrottle: 0 });

  test('in max-age cache', async () => {
    const data = await successMockApiCache();
    expect(data).toBe(1);
    // 0 --- max-age --- 1000 --- no-cache
    await delay(500);
    expect(successMockApiCache()).resolves.toBe(1);
    await delay(1100);
    expect(successMockApiCache()).resolves.toBe(2);
  });
});
