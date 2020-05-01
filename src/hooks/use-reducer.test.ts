import {Dispatch, HookProcess, useReducer} from '..';

describe('useReducer()', () => {
  test('an initial state can be set once', () => {
    const hook = jest.fn((arg) => {
      const [state] = useReducer(jest.fn(), arg);

      return state;
    });

    const {result, update} = HookProcess.start(hook, ['a']);

    expect(result.getCurrent()).toBe('a');
    expect(update(['b'])).toBe('a');
    expect(hook).toBeCalledTimes(2);
  });

  test('an initial state can be created lazily once', () => {
    const init = jest.fn((initialArg: string) => initialArg);

    const hook = jest.fn((arg) => {
      const [state] = useReducer(jest.fn(), arg, init);

      return state;
    });

    const {result, update} = HookProcess.start(hook, ['a']);

    expect(result.getCurrent()).toBe('a');
    expect(update(['a'])).toBe('a');
    expect(update(['b'])).toBe('a');
    expect(hook).toBeCalledTimes(3);
    expect(init).toBeCalledTimes(1);
  });

  test('dispatching an action that leads to a new state, executes the hook again', () => {
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

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('abc');
    expect(hook).toBeCalledTimes(2);
  });

  test('dispatching an action that leads to the same state, does not execute the hook again', () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (previousState: string) => previousState,
        'a'
      );

      dispatch('b');

      return state;
    });

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('a');
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

    const {result} = HookProcess.start(hook, []);

    initialDispatch!('b');
    initialDispatch!('c');

    await expect(result.getNextAsync()).resolves.toBe('abc');
    expect(hook).toBeCalledTimes(2);
  });
});
