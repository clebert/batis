import {describe, expect, jest, test} from '@jest/globals';
import {Host} from '../host.js';
import {useMemo} from './use-memo.js';
import {useState} from './use-state.js';

describe(`useMemo()`, () => {
  test(`a memoized value is recomputed if one of its dependencies changes`, () => {
    const createValue1 = jest.fn();
    const createValue2 = jest.fn();

    const hook = jest.fn((arg1: string, arg2: number) => {
      useMemo(createValue1, []);
      useMemo(createValue2, [arg1, arg2]);

      return [arg1, arg2];
    });

    const host = new Host(hook);

    expect(host.run(`a`, 0)).toEqual([[`a`, 0]]);
    expect(host.rerun()).toEqual([[`a`, 0]]);
    expect(host.run(`a`, 1)).toEqual([[`a`, 1]]);
    expect(host.run(`b`, 1)).toEqual([[`b`, 1]]);
    expect(host.rerun()).toEqual([[`b`, 1]]);
    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test(`a memoized value is recomputed after a reset`, () => {
    const hook = jest.fn((arg: string) => {
      return useMemo(() => arg, []);
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);
    expect(host.run(`b`)).toEqual([`a`]);

    host.reset();

    expect(host.run(`c`)).toEqual([`c`]);
    expect(host.run(`d`)).toEqual([`c`]);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test(`a memoized value is recomputed after a synchronous error`, () => {
    const hook = jest.fn((arg: string) => {
      const value = useMemo(() => arg, []);

      if (arg === `c`) {
        throw new Error(arg);
      }

      return value;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);
    expect(host.run(`b`)).toEqual([`a`]);
    expect(() => host.run(`c`)).toThrow(new Error(`c`));
    expect(host.run(`d`)).toEqual([`d`]);
    expect(host.run(`e`)).toEqual([`d`]);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test(`a memoized value is recomputed after an asynchronous error`, async () => {
    const hook = jest.fn((arg: string) => {
      const value = useMemo(() => arg, []);
      const [, setState] = useState(arg);

      if (arg === `b`) {
        setTimeout(
          () =>
            setState(() => {
              throw new Error(arg);
            }),
          0,
        );
      }

      return value;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);
    expect(host.run(`b`)).toEqual([`a`]);

    await host.nextAsyncStateChange;

    expect(() => host.run(`c`)).toThrow(new Error(`b`));
    expect(host.run(`d`)).toEqual([`d`]);
    expect(host.run(`e`)).toEqual([`d`]);
    expect(hook).toHaveBeenCalledTimes(4);
  });
});
