import {describe, expect, jest, test} from '@jest/globals';
import {type Effect, useEffect, useLayoutEffect} from './hooks/use-effect.js';
import {useMemo} from './hooks/use-memo.js';
import {useState} from './hooks/use-state.js';
import {Host} from './host.js';

describe(`Host`, () => {
  test(`using fewer Hooks causes an error`, () => {
    const hook = jest.fn((arg: string) => {
      if (arg === `a`) {
        useState(`a`);
        useState(`b`);
      } else {
        useState(`a`);
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);

    expect(() => host.run(`b`)).toThrow(
      new Error(`The number of Hooks used must not change.`),
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`using more Hooks causes an error`, () => {
    const hook = jest.fn((arg: string) => {
      if (arg === `a`) {
        useState(`a`);
      } else {
        useState(`a`);
        useState(`b`);
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);

    expect(() => host.run(`b`)).toThrow(
      new Error(`The number of Hooks used must not change.`),
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`changing the order of the Hooks used causes an error`, () => {
    const hook = jest.fn((arg: string) => {
      if (arg === `a`) {
        useEffect(jest.fn<Effect>());
      } else if (arg === `b`) {
        useLayoutEffect(jest.fn<Effect>());
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);

    expect(() => host.run(`b`)).toThrow(
      new Error(`The order of the Hooks used must not change.`),
    );

    expect(host.run(`b`)).toEqual([`b`]);

    expect(() => host.run(`a`)).toThrow(
      new Error(`The order of the Hooks used must not change.`),
    );

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test(`removing the dependencies of a Hook causes an error`, () => {
    const hook = jest.fn((arg: string) => {
      if (arg === `a`) {
        useLayoutEffect(jest.fn<Effect>(), []);
      } else {
        useLayoutEffect(jest.fn<Effect>());
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);

    expect(() => host.run(`b`)).toThrow(
      new Error(`The existence of dependencies of a Hook must not change.`),
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`adding the dependencies of a Hook causes an error`, () => {
    const hook = jest.fn((arg: string) => {
      if (arg === `a`) {
        useLayoutEffect(jest.fn<Effect>());
      } else {
        useLayoutEffect(jest.fn<Effect>(), []);
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);

    expect(() => host.run(`b`)).toThrow(
      new Error(`The existence of dependencies of a Hook must not change.`),
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`removing a single dependency of a Hook causes an error`, () => {
    const hook = jest.fn((arg: string) => {
      if (arg === `a`) {
        useLayoutEffect(jest.fn<Effect>(), [1, 0]);
      } else {
        useLayoutEffect(jest.fn<Effect>(), [1]);
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);

    expect(() => host.run(`b`)).toThrow(
      new Error(
        `The order and number of dependencies of a Hook must not change.`,
      ),
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`adding a single dependency of a Hook causes an error`, () => {
    const hook = jest.fn((arg: string) => {
      if (arg === `a`) {
        useLayoutEffect(jest.fn<Effect>(), [1]);
      } else {
        useLayoutEffect(jest.fn<Effect>(), [1, 0]);
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([`a`]);

    expect(() => host.run(`b`)).toThrow(
      new Error(
        `The order and number of dependencies of a Hook must not change.`,
      ),
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`using two hosts at the same time`, () => {
    const hook1 = (arg: string) => {
      const [state] = useState(arg);

      return state;
    };

    const hook2 = (arg: number) => {
      const [state] = useState(arg);

      return state;
    };

    const host1 = new Host(hook1);
    const host2 = new Host(hook2);

    expect(host1.run(`a`)).toEqual([`a`]);
    expect(host2.run(0)).toEqual([0]);

    host1.reset();

    expect(host1.run(`b`)).toEqual([`b`]);
    expect(host2.run(1)).toEqual([0]);
  });

  test(`using a Hook without an active host causes an error`, () => {
    const error = new Error(`A Hook cannot be used without an active host.`);

    expect(() => useState(`a`)).toThrow(error);
    expect(() => useLayoutEffect(jest.fn<Effect>())).toThrow(error);
    expect(() => useMemo(jest.fn(), [])).toThrow(error);

    expect(() =>
      new Host(() => useLayoutEffect(() => void useState(`a`))).run(),
    ).toThrow(error);

    expect(() =>
      new Host(() =>
        useLayoutEffect(() => void useLayoutEffect(jest.fn<Effect>())),
      ).run(),
    ).toThrow(error);

    expect(() =>
      new Host(() => useLayoutEffect(() => void useMemo(jest.fn(), []))).run(),
    ).toThrow(error);
  });

  test(`rerunning a Hook that has never been run causes an error`, () => {
    const host = new Host((arg: string) => arg);

    expect(() => host.rerun()).toThrow(
      new Error(`A Hook that has never been run cannot be rerun.`),
    );
  });

  test(`rerunning a Hook after resetting the host`, () => {
    const host = new Host((arg: string) => arg);

    expect(host.run(`a`)).toEqual([`a`]);
    expect(host.rerun()).toEqual([`a`]);

    host.reset();

    expect(host.rerun()).toEqual([`a`]);
    expect(host.run(`b`)).toEqual([`b`]);
    expect(host.rerun()).toEqual([`b`]);

    host.reset();

    expect(host.rerun()).toEqual([`b`]);
  });
});
