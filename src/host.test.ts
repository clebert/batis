import {AnyHook, Host, HostEvent, HostEventListener} from './host';

describe('Host', () => {
  let events: HostEvent<AnyHook>[];
  let eventListener: HostEventListener<AnyHook>;

  beforeEach(() => {
    events = [];
    eventListener = events.push.bind(events);
  });

  test('an initial state is set only once', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Host.useState(arg);
      const [state2] = Host.useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'rendering', result: ['a', 1], interimResults: []},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('an initial state is reset after a reset event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Host.useState(arg);
      const [state2] = Host.useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.reset();
    host.render('c');

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'reset'},
      {type: 'rendering', result: ['c', 2], interimResults: []},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after a synchronous error event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Host.useState(arg);
      const [state2] = Host.useState(createInitialState);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.render('c');

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'error', reason: new Error('b')},
      {type: 'rendering', result: ['c', 2], interimResults: []},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after an asynchronous error event', async () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1, setState1] = Host.useState(arg);
      const [state2] = Host.useState(createInitialState);

      if (arg === 'b') {
        setTimeout(() =>
          setState1(() => {
            throw new Error(arg);
          })
        );
      }

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    await new Promise((resolve) => setTimeout(resolve));

    host.render('c');

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'error', reason: new Error('b')},
      {type: 'rendering', result: ['c', 2], interimResults: []},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('setting a new state triggers a rendering', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = Host.useState('a');
      const [state2, setState2] = Host.useState(0);

      Host.useEffect(() => {
        setState1('c');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 += 1));

        setTimeout(() => {
          setState1('d');
          setState2((prevState2) => (prevState2 += 1));
          setState2((prevState2) => (prevState2 += 1));
        });
      }, []);

      if (state1 === 'a') {
        setState1('b');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 += 1));
      }

      if (state1 === 'd') {
        setState1('e');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 += 1));
      }

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render();

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {
        type: 'rendering',
        result: ['c', 4],
        interimResults: [
          ['b', 2],
          ['a', 0],
        ],
      },
      {type: 'rendering', result: ['e', 8], interimResults: [['d', 6]]},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('setting the same state does not trigger a rendering', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = Host.useState('a');
      const [state2, setState2] = Host.useState(0);

      Host.useEffect(() => {
        setState1('c');
        setState1('a');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 -= 1));

        setTimeout(() => {
          setState1('d');
          setState1('a');
          setState2((prevState2) => (prevState2 += 1));
          setState2((prevState2) => (prevState2 -= 1));
        });
      }, []);

      if (state1 === 'a') {
        setState1('b');
        setState1('a');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 -= 1));
      }

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render();

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 0], interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('setting an outdated state does not trigger a rendering', async () => {
    const hook = jest.fn((arg: string) => {
      const [state, setState] = Host.useState(arg);

      setTimeout(() => {
        setState('b');
      });

      return state;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.reset();

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'reset'},
    ]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a failed setting of a state causes an error event', async () => {
    const hook = jest.fn((arg: string) => {
      const [state, setState] = Host.useState(() => {
        if (arg === 'a') {
          throw new Error(arg);
        }

        return arg;
      });

      if (state === 'b') {
        setState(() => {
          throw new Error(arg);
        });
      }

      setTimeout(() => {
        setState(() => {
          throw new Error(arg);
        });
      });

      return state;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.render('c');

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'error', reason: new Error('a')},
      {type: 'error', reason: new Error('b')},
      {type: 'rendering', result: 'c', interimResults: []},
      {type: 'error', reason: new Error('c')},
    ]);

    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('the identity of a setState function is stable until a reset event occurs', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg: string) => {
      const [state, setState] = Host.useState(arg);

      setStateIdentities.add(setState);

      if (state === 'a') {
        setState('b');
      }

      if (state === 'c') {
        setState('d');
      }

      return state;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('c');
    host.reset();
    host.render('c');

    expect(events).toEqual([
      {type: 'rendering', result: 'b', interimResults: ['a']},
      {type: 'rendering', result: 'b', interimResults: []},
      {type: 'reset'},
      {type: 'rendering', result: 'd', interimResults: ['c']},
    ]);

    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('the identity of a setState function is stable until an error event occurs', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg: string) => {
      const [state, setState] = Host.useState(arg);

      setStateIdentities.add(setState);

      if (state === 'a') {
        setState('b');
      }

      if (state === 'b') {
        throw new Error('b');
      }

      if (state === 'c') {
        setState('d');
      }

      return state;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('c');

    expect(events).toEqual([
      {type: 'error', reason: new Error('b')},
      {type: 'rendering', result: 'd', interimResults: ['c']},
    ]);

    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect triggers if one of its dependencies changes', () => {
    const cleanUpEffect1 = jest.fn(() => {
      throw new Error('oops');
    });

    const cleanUpEffect3 = jest.fn();
    const effect1 = jest.fn(() => cleanUpEffect1);
    const effect2 = jest.fn();
    const effect3 = jest.fn(() => cleanUpEffect3);

    const hook = jest.fn((arg1: string, arg2: number) => {
      Host.useEffect(effect1);
      Host.useEffect(effect2, []);
      Host.useEffect(effect3, [arg1, arg2]);

      return [arg1, arg2];
    });

    const consoleError = jest.spyOn(console, 'error');
    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a', 0);
    host.render('a', 0);
    host.render('a', 1);
    host.render('b', 1);
    host.render('b', 1);

    expect(cleanUpEffect1).toHaveBeenCalledTimes(4);
    expect(cleanUpEffect3).toHaveBeenCalledTimes(2);
    expect(effect1).toHaveBeenCalledTimes(5);
    expect(effect2).toHaveBeenCalledTimes(1);
    expect(effect3).toHaveBeenCalledTimes(3);

    expect(consoleError).toHaveBeenCalledWith(
      'An effect could not be cleaned up.',
      new Error('oops')
    );

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 0], interimResults: []},
      {type: 'rendering', result: ['a', 0], interimResults: []},
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'rendering', result: ['b', 1], interimResults: []},
      {type: 'rendering', result: ['b', 1], interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('an effect retriggers after a reset event', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn(() => {
      Host.useEffect(effect, []);
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render();
    host.render();
    host.reset();
    host.render();
    host.render();

    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'rendering', result: undefined, interimResults: []},
      {type: 'rendering', result: undefined, interimResults: []},
      {type: 'reset'},
      {type: 'rendering', result: undefined, interimResults: []},
      {type: 'rendering', result: undefined, interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after a synchronous error event', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn((arg: string) => {
      Host.useEffect(effect, []);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.render('c');
    host.render('d');

    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason: new Error('b')},
      {type: 'rendering', result: 'c', interimResults: []},
      {type: 'rendering', result: 'd', interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after an asynchronous error event', async () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn((arg: string) => {
      const [, setState] = Host.useState(arg);

      Host.useEffect(effect, []);

      if (arg === 'b') {
        setTimeout(() =>
          setState(() => {
            throw new Error(arg);
          })
        );
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    await new Promise((resolve) => setTimeout(resolve));

    host.render('c');
    host.render('d');

    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'rendering', result: 'b', interimResults: []},
      {type: 'error', reason: new Error('b')},
      {type: 'rendering', result: 'c', interimResults: []},
      {type: 'rendering', result: 'd', interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a failed triggering of an effect causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      Host.useEffect(() => {
        throw new Error(arg);
      }, []);

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');

    expect(events).toEqual([{type: 'error', reason: new Error('a')}]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a memoized value is recomputed if one of its dependencies changes', () => {
    const createValue1 = jest.fn();
    const createValue2 = jest.fn();

    const hook = jest.fn((arg1: string, arg2: number) => {
      Host.useMemo(createValue1, []);
      Host.useMemo(createValue2, [arg1, arg2]);

      return [arg1, arg2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a', 0);
    host.render('a', 0);
    host.render('a', 1);
    host.render('b', 1);
    host.render('b', 1);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 0], interimResults: []},
      {type: 'rendering', result: ['a', 0], interimResults: []},
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'rendering', result: ['b', 1], interimResults: []},
      {type: 'rendering', result: ['b', 1], interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after a reset event', () => {
    const hook = jest.fn((arg: string) => {
      return Host.useMemo(() => arg, []);
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.reset();
    host.render('c');
    host.render('d');

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'reset'},
      {type: 'rendering', result: 'c', interimResults: []},
      {type: 'rendering', result: 'c', interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a memoized value is recomputed after a synchronous error event', () => {
    const hook = jest.fn((arg: string) => {
      const value = Host.useMemo(() => arg, []);

      if (arg === 'c') {
        throw new Error(arg);
      }

      return value;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.render('c');
    host.render('d');
    host.render('e');

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason: new Error('c')},
      {type: 'rendering', result: 'd', interimResults: []},
      {type: 'rendering', result: 'd', interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after an asynchronous error event', async () => {
    const hook = jest.fn((arg: string) => {
      const value = Host.useMemo(() => arg, []);
      const [, setState] = Host.useState(arg);

      if (arg === 'b') {
        setTimeout(() =>
          setState(() => {
            throw new Error(arg);
          })
        );
      }

      return value;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    await new Promise((resolve) => setTimeout(resolve));

    host.render('c');
    host.render('d');

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason: new Error('b')},
      {type: 'rendering', result: 'c', interimResults: []},
      {type: 'rendering', result: 'c', interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a memoized callback changes if one of its dependencies changes', () => {
    const hook = jest.fn(
      (
        callback1: jest.Mock,
        callback2: jest.Mock,
        arg1: string,
        arg2: number
      ) => [
        Host.useCallback(callback1, []),
        Host.useCallback(callback2, [arg1, arg2]),
      ]
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

    const host = new Host<typeof hook>(hook, eventListener);

    host.render(callbackA, callbackB, 'a', 0);
    host.render(callbackC, callbackD, 'a', 0);
    host.render(callbackE, callbackF, 'a', 1);
    host.render(callbackG, callbackH, 'b', 1);
    host.render(callbackI, callbackJ, 'b', 1);

    expect(events).toEqual([
      {type: 'rendering', result: [callbackA, callbackB], interimResults: []},
      {type: 'rendering', result: [callbackA, callbackB], interimResults: []},
      {type: 'rendering', result: [callbackA, callbackF], interimResults: []},
      {type: 'rendering', result: [callbackA, callbackH], interimResults: []},
      {type: 'rendering', result: [callbackA, callbackH], interimResults: []},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a ref object is stable and mutable', () => {
    const hook = jest.fn(() => {
      const ref1 = Host.useRef('a');
      const ref2 = Host.useRef(0);

      Host.useEffect(() => {
        ref2.current = 1;
      }, []);

      return [ref1.current, ref2.current];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render();
    host.render();
    host.render();

    expect(events).toEqual([
      {type: 'rendering', result: ['a', 0], interimResults: []},
      {type: 'rendering', result: ['a', 1], interimResults: []},
      {type: 'rendering', result: ['a', 1], interimResults: []},
    ]);

    expect(hook).toBeCalledTimes(3);
  });

  test('using fewer Hooks causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Host.useState('a');
        Host.useState('b');
      } else {
        Host.useState('a');
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error('The number of Hooks used must not change.');

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('using more Hooks causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Host.useState('a');
      } else {
        Host.useState('a');
        Host.useState('b');
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error('The number of Hooks used must not change.');

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('changing the order of the Hooks used causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Host.useState('a');
      } else {
        Host.useEffect(jest.fn());
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error('The order of the Hooks used must not change.');

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing the dependencies of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Host.useEffect(jest.fn(), []);
      } else {
        Host.useEffect(jest.fn());
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error(
      'The existence of dependencies of a Hook must not change.'
    );

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding the dependencies of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Host.useEffect(jest.fn());
      } else {
        Host.useEffect(jest.fn(), []);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error(
      'The existence of dependencies of a Hook must not change.'
    );

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing a single dependency of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Host.useEffect(jest.fn(), [1, 0]);
      } else {
        Host.useEffect(jest.fn(), [1]);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error(
      'The order and number of dependencies of a Hook must not change.'
    );

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding a single dependency of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Host.useEffect(jest.fn(), [1]);
      } else {
        Host.useEffect(jest.fn(), [1, 0]);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error(
      'The order and number of dependencies of a Hook must not change.'
    );

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'error', reason},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('using two hosts at the same time', () => {
    const hook1 = (arg: string) => {
      const [state] = Host.useState(arg);

      return state;
    };

    const hook2 = (arg: number) => {
      const [state] = Host.useState(arg);

      return state;
    };

    const host1 = new Host<typeof hook1>(hook1, eventListener);
    const host2 = new Host<typeof hook2>(hook2, eventListener);

    host1.render('a');
    host2.render(0);
    host1.reset();
    host1.render('b');
    host2.render(1);

    expect(events).toEqual([
      {type: 'rendering', result: 'a', interimResults: []},
      {type: 'rendering', result: 0, interimResults: []},
      {type: 'reset'},
      {type: 'rendering', result: 'b', interimResults: []},
      {type: 'rendering', result: 0, interimResults: []},
    ]);
  });

  test('using a Hook without a host causes an error event', () => {
    const reason = new Error('A Hook cannot be used without a host.');

    expect(() => Host.useState('a')).toThrow(reason);
    expect(() => Host.useEffect(jest.fn())).toThrow(reason);
    expect(() => Host.useMemo(jest.fn(), [])).toThrow(reason);

    new Host(
      () => Host.useEffect(() => void Host.useState('a')),
      eventListener
    ).render();

    new Host(
      () => Host.useEffect(() => void Host.useEffect(jest.fn())),
      eventListener
    ).render();

    new Host(
      () => Host.useEffect(() => void Host.useMemo(jest.fn(), [])),
      eventListener
    ).render();

    expect(events).toEqual([
      {type: 'error', reason},
      {type: 'error', reason},
      {type: 'error', reason},
    ]);
  });
});
