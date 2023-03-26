import {describe, expect, jest, test} from '@jest/globals';
import {Host} from '../host.js';
import {useCallback} from './use-callback.js';

describe(`useCallback()`, () => {
  test(`a memoized callback changes if one of its dependencies changes`, () => {
    const hook = jest.fn(
      (
        callback1: jest.Mock,
        callback2: jest.Mock,
        arg1: string,
        arg2: number,
      ) => [useCallback(callback1, []), useCallback(callback2, [arg1, arg2])],
    );

    const callbackA = jest.fn();
    const callbackB = jest.fn();
    const callbackC = jest.fn();
    const callbackD = jest.fn();
    const callbackE = jest.fn();
    const callbackF = jest.fn();
    const callbackG = jest.fn();
    const callbackH = jest.fn();
    const callbackI = jest.fn();
    const callbackJ = jest.fn();

    const host = new Host(hook);

    expect(host.run(callbackA, callbackB, `a`, 0)).toEqual([
      [callbackA, callbackB],
    ]);

    expect(host.run(callbackC, callbackD, `a`, 0)).toEqual([
      [callbackA, callbackB],
    ]);

    expect(host.run(callbackE, callbackF, `a`, 1)).toEqual([
      [callbackA, callbackF],
    ]);

    expect(host.run(callbackG, callbackH, `b`, 1)).toEqual([
      [callbackA, callbackH],
    ]);

    expect(host.run(callbackI, callbackJ, `b`, 1)).toEqual([
      [callbackA, callbackH],
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });
});
