import {HookProcess, useCallback} from '..';
import {queueMacrotasks} from '../internals/queue-macrotasks';

describe('useCallback()', () => {
  test('a memoized callback changes only if one of its dependencies changes', async () => {
    let memoizedCallback1: (() => void) | undefined;
    let memoizedCallback2: (() => void) | undefined;

    const hook = jest.fn(
      (
        callback1: () => void,
        callback2: () => void,
        arg1: string,
        arg2: string
      ) => {
        memoizedCallback1 = useCallback(callback1, []);
        memoizedCallback2 = useCallback(callback2, [arg1, arg2]);
      }
    );

    const callbackA = jest.fn();
    const callbackB = jest.fn();
    const {update} = HookProcess.start(hook, [callbackA, callbackB, 'a', 'x']);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackB);

    const callbackC = jest.fn();
    const callbackD = jest.fn();

    update([callbackC, callbackD, 'a', 'x']);

    expect(hook).toHaveBeenCalledTimes(2);
    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackB);

    const callbackE = jest.fn();
    const callbackF = jest.fn();

    update([callbackE, callbackF, 'a', 'y']);

    expect(hook).toHaveBeenCalledTimes(3);
    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackF);

    const callbackG = jest.fn();
    const callbackH = jest.fn();

    update([callbackG, callbackH, 'b', 'y']);

    expect(hook).toHaveBeenCalledTimes(4);
    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackH);

    const callbackI = jest.fn();
    const callbackJ = jest.fn();

    update([callbackI, callbackJ, 'b', 'y']);

    expect(hook).toHaveBeenCalledTimes(5);
    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackH);

    await queueMacrotasks(10);
    expect(hook).toHaveBeenCalledTimes(5);
  });
});
