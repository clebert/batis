import {
  AnyHook,
  Service,
  ServiceEvent,
  ServiceListener,
  SetState,
  useEffect,
  useState,
} from '..';
import {queueMacrotasks} from '../internals/queue-macrotasks';

const error = new Error('Oops!');

describe('useState()', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('an initial state can be set once', () => {
    const hook = jest.fn((arg) => {
      const [state] = useState(arg);

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
    const createInitialState = jest.fn(() => 'a');

    const hook = jest.fn(() => {
      const [state] = useState(createInitialState);

      return state;
    });

    const service = new Service(hook, [], listener);

    service.update([]);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'a'},
    ]);

    expect(hook).toBeCalledTimes(2);
    expect(createInitialState).toBeCalledTimes(1);
  });

  test('synchronously setting a new state invokes the hook again', () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      setState('b');
      setState('c');

      return state;
    });

    new Service(hook, [], listener);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'c'},
    ]);

    expect(hook).toBeCalledTimes(2);
  });

  test('asynchronously setting a new state invokes the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1)
          .then(() => {
            setState('b');
            setState('c');
          })
          .catch();
      }, []);

      return state;
    });

    new Service(hook, [], listener);

    await queueMacrotasks(1);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'c'},
    ]);

    expect(hook).toBeCalledTimes(2);
  });

  test('synchronously setting the same state does not invoke the hook again', () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      setState('b');
      setState('a');

      return state;
    });

    new Service(hook, [], listener);

    expect(events).toEqual([{type: 'value', value: 'a'}]);
    expect(hook).toBeCalledTimes(1);
  });

  test('asynchronously setting the same state does not invoke the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1)
          .then(() => {
            setState('b');
            setState('a');
          })
          .catch();
      }, []);

      return state;
    });

    new Service(hook, [], listener);

    await queueMacrotasks(1);

    expect(events).toEqual([{type: 'value', value: 'a'}]);
    expect(hook).toBeCalledTimes(1);
  });

  test('creating a new state invokes the hook again', () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      if (state === 'a') {
        setState((previousState) => previousState + 'b');
        setState((previousState) => previousState + 'c');
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

  test('creating the same state does not invoke the hook again', () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      setState((previousState) => previousState);

      return state;
    });

    new Service(hook, [], listener);

    expect(events).toEqual([{type: 'value', value: 'a'}]);
    expect(hook).toBeCalledTimes(1);
  });

  test('state initialization error', () => {
    const hook = jest.fn(() => {
      useState(() => {
        throw error;
      });
    });

    new Service(hook, [], listener);

    expect(events).toEqual([{type: 'error', error}]);
    expect(hook).toBeCalledTimes(1);
  });

  test('state change error', () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      setState(() => {
        throw error;
      });

      return state;
    });

    new Service(hook, [], listener);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'error', error},
    ]);

    expect(hook).toBeCalledTimes(1);
  });

  test('state change error triggered by an update', () => {
    const hook = jest.fn((arg) => {
      const [state, setState] = useState(arg);

      if (arg === 'b') {
        setState(() => {
          throw error;
        });
      }

      return state;
    });

    const service = new Service(hook, ['a'], listener);

    service.update(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'a'},
      {type: 'error', error},
    ]);

    expect(hook).toBeCalledTimes(2);
  });

  test('state change error triggered by an asynchronous effect', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1)
          .then(() =>
            setState(() => {
              throw error;
            })
          )
          .catch();
      }, []);

      return state;
    });

    new Service(hook, [], listener);

    await queueMacrotasks(1);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'error', error},
    ]);

    expect(hook).toBeCalledTimes(1);
  });

  test('direct state changes are applied before those triggered by synchronous effects', () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      if (state === 'a') {
        setState((previousState) => previousState + 'b');
      }

      useEffect(() => {
        setState((previousState) => previousState + 'e');
      }, []);

      if (state === 'a') {
        setState((previousState) => previousState + 'c');
      }

      if (state === 'abc') {
        setState((previousState) => previousState + 'd');
      }

      return state;
    });

    new Service(hook, [], listener);

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'abc'},
      {type: 'value', value: 'abcd'},
      {type: 'value', value: 'abcde'},
    ]);

    expect(hook).toBeCalledTimes(4);
  });

  test('the identity of the returned setState function is stable', async () => {
    let initialSetState: SetState<string> | undefined;

    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      if (!initialSetState) {
        initialSetState = setState;
      } else {
        expect(setState).toBe(initialSetState);
      }

      return state;
    });

    new Service(hook, [], listener);

    initialSetState!((previousState) => previousState + 'b');
    initialSetState!((previousState) => previousState + 'c');

    await Promise.resolve();

    expect(events).toEqual([
      {type: 'value', value: 'a'},
      {type: 'value', value: 'abc'},
    ]);

    expect(hook).toBeCalledTimes(2);
  });
});
