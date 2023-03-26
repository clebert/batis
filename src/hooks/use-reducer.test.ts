import {useReducer} from './use-reducer.js';
import {Host} from '../host.js';
import {describe, expect, jest, test} from '@jest/globals';

describe(`useReducer()`, () => {
  test(`an initial reducer state is set only once`, () => {
    let i = 0;

    const init = jest.fn((initialArg: string) => initialArg + (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = useReducer(jest.fn(), arg);
      const [state2] = useReducer(jest.fn(), arg, init);

      return [state1, state2];
    });

    const host = new Host(hook);

    expect(host.run(`a`)).toEqual([[`a`, `a1`]]);
    expect(host.run(`b`)).toEqual([[`a`, `a1`]]);
    expect(init).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`reducing a new state resolves the promise`, () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (prevState: string, action: string) => prevState + action,
        `a`,
      );

      if (state === `a`) {
        dispatch(`b`);
        dispatch(`c`);
      }

      return state;
    });

    const host = new Host(hook);

    expect(host.run()).toEqual([`abc`, `a`]);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test(`reducing the same state does not resolve the promise`, () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (prevState: string) => prevState,
        `a`,
      );

      if (state === `a`) {
        dispatch(`b`);
        dispatch(`c`);
      }

      return state;
    });

    const host = new Host(hook);

    expect(host.run()).toEqual([`a`]);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  test(`the identity of a dispatch function is stable`, () => {
    const dispatchIdentities = new Set();

    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (prevState: string, action: string) => prevState + action,
        `a`,
      );

      dispatchIdentities.add(dispatch);

      if (state === `a`) {
        dispatch(`b`);
      }

      return state;
    });

    const host = new Host(hook);

    expect(host.run()).toEqual([`ab`, `a`]);
    expect(host.rerun()).toEqual([`ab`]);
    expect(dispatchIdentities.size).toBe(1);
    expect(hook).toHaveBeenCalledTimes(3);
  });
});
