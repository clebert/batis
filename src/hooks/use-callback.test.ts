import {AnyHook, Service, ServiceEvent, ServiceListener, useCallback} from '..';

describe('useCallback()', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('a memoized callback changes only if one of its dependencies changes', () => {
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

    const service = new Service(
      hook,
      [callbackA, callbackB, 'a', 'x'],
      listener
    );

    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackB);

    const callbackC = jest.fn();
    const callbackD = jest.fn();

    service.update([callbackC, callbackD, 'a', 'x']);

    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackB);

    const callbackE = jest.fn();
    const callbackF = jest.fn();

    service.update([callbackE, callbackF, 'a', 'y']);

    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackF);

    const callbackG = jest.fn();
    const callbackH = jest.fn();

    service.update([callbackG, callbackH, 'b', 'y']);

    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackH);

    const callbackI = jest.fn();
    const callbackJ = jest.fn();

    service.update([callbackI, callbackJ, 'b', 'y']);

    expect(memoizedCallback1).toBe(callbackA);
    expect(memoizedCallback2).toBe(callbackH);

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });
});
