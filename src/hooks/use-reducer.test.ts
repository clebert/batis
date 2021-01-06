import {
  AnyHook,
  Dispatch,
  Service,
  ServiceEvent,
  ServiceListener,
  useReducer,
} from '..';

describe('useReducer()', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('an initial state can be set once', () => {
    const hook = jest.fn((arg) => {
      const [state] = useReducer(jest.fn(), arg);

      return state;
    });

    const service = new Service(hook, ['a'], listener);

    service.update(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'a'},
    ]);

    expect(hook).toBeCalledTimes(2);
  });

  test('an initial state can be created lazily once', () => {
    const init = jest.fn((initialArg: string) => initialArg + 'x');

    const hook = jest.fn((arg) => {
      const [state] = useReducer(jest.fn(), arg, init);

      return state;
    });

    const service = new Service(hook, ['a'], listener);

    service.update(['a']);
    service.update(['b']);

    expect(init).toBeCalledTimes(1);

    expect(events).toEqual([
      {type: 'value', value: 'ax'},
      {type: 'value', value: 'ax'},
      {type: 'value', value: 'ax'},
    ]);

    expect(hook).toBeCalledTimes(3);
  });

  test('dispatching an action that leads to a new state, invokes the hook again', () => {
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

    new Service(hook, [], listener);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'abc'},
    ]);

    expect(hook).toBeCalledTimes(2);
  });

  test('dispatching an action that leads to the same state, does not invoke the hook again', () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = useReducer(
        (previousState: string) => previousState,
        'a'
      );

      dispatch('b');

      return state;
    });

    new Service(hook, [], listener);

    expect(events).toEqual([{type: 'value', value: 'a'}]);
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

    new Service(hook, [], listener);

    initialDispatch!('b');
    initialDispatch!('c');

    await Promise.resolve();

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'abc'},
    ]);

    expect(hook).toBeCalledTimes(2);
  });
});
