import {Dispatch, HookService, useReducer} from '..';
import {queueMacrotasks} from '../internals/queue-macrotasks';

describe('useReducer()', () => {
  test('an initial state can be set once', async () => {
    const hook = jest.fn((arg) => {
      const [state] = useReducer(jest.fn(), arg);

      return state;
    });

    const service = HookService.start(hook, ['a']);

    expect(service.result.value).toBe('a');
    expect(service.update(['b'])).toBe('a');

    await queueMacrotasks(10);

    expect(hook).toBeCalledTimes(2);
  });

  test('an initial state can be created lazily once', async () => {
    const init = jest.fn((initialArg: string) => initialArg);

    const hook = jest.fn((arg) => {
      const [state] = useReducer(jest.fn(), arg, init);

      return state;
    });

    const service = HookService.start(hook, ['a']);

    expect(service.result.value).toBe('a');
    expect(service.update(['a'])).toBe('a');
    expect(service.update(['b'])).toBe('a');

    await queueMacrotasks(10);

    expect(hook).toBeCalledTimes(3);
    expect(init).toBeCalledTimes(1);
  });

  test('dispatching an action that leads to a new state, executes the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (previousState: string, action: string) => previousState + action,
        'a'
      );

      if (state === 'a') {
        dispatch('b');
        dispatch('c');
      }

      return state;
    });

    const service = HookService.start(hook, []);

    expect(service.result.value).toBe('abc');

    await queueMacrotasks(10);

    expect(hook).toBeCalledTimes(2);
  });

  test('dispatching an action that leads to the same state, does not execute the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (previousState: string) => previousState,
        'a'
      );

      dispatch('b');

      return state;
    });

    const service = HookService.start(hook, []);

    expect(service.result.value).toBe('a');

    await queueMacrotasks(10);

    expect(hook).toBeCalledTimes(1);
  });

  test('the identity of the returned dispatch function is stable', async () => {
    let initialDispatch: Dispatch<string> | undefined;

    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (previousState: string, action: string) => previousState + action,
        'a'
      );

      if (!initialDispatch) {
        initialDispatch = dispatch;
      } else {
        expect(dispatch).toBe(initialDispatch);
      }

      return state;
    });

    const service = HookService.start(hook, []);

    initialDispatch!('b');
    initialDispatch!('c');

    expect(await service.result.next).toEqual({done: false, value: 'abc'});

    await queueMacrotasks(10);

    expect(hook).toBeCalledTimes(2);
  });
});
