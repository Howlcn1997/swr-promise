const swrPromise = require("../dist/cjs/index.js").default;

let count = 0;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


describe("concurrent", () => {
  describe("resolve", () => {
    const successMockApi = async () => {
      await delay(100);
      return ++count;
    };
    const successMockApiCache = swrPromise(successMockApi);

    test("no cache", () => {
      expect(successMockApi()).resolves.toBe(1);
      expect(successMockApi()).resolves.toBe(2);
    });

    test("cache", () => {
      expect(successMockApiCache()).resolves.toBe(3);
      expect(successMockApiCache()).resolves.toBe(3);
    });
  });

  describe("reject", () => {
    const errorMockApi = async () => {
      await delay(100);
      throw ++count;
    };
    const errorMockApiCache = swrPromise(errorMockApi);

    test("no cache", () => {
      expect(errorMockApi()).rejects.toBe(4);
      expect(errorMockApi()).rejects.toBe(5);
    });
    test("cache", () => {
      expect(errorMockApiCache()).rejects.toBe(6);
      expect(errorMockApiCache()).rejects.toBe(6);
    });
  });
});
