import {AnyHook, Host, HostEvent, HostEventListener} from './host';

const {Hooks} = Host;

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
      const [state1] = Hooks.useState(arg);
      const [state2] = Hooks.useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      Host.createRenderingEvent(['a', 1]),
      Host.createRenderingEvent(['a', 1]),
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('an initial state is reset after a reset event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Hooks.useState(arg);
      const [state2] = Hooks.useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.reset();
    host.render('c');

    expect(events).toEqual([
      Host.createRenderingEvent(['a', 1]),
      Host.createRenderingEvent(['a', 1]),
      Host.createResetEvent(),
      Host.createRenderingEvent(['c', 2]),
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after a synchronous error event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Hooks.useState(arg);
      const [state2] = Hooks.useState(createInitialState);

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
      Host.createRenderingEvent(['a', 1]),
      Host.createErrorEvent(new Error('b')),
      Host.createRenderingEvent(['c', 2]),
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after an asynchronous error event', async () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1, setState1] = Hooks.useState(arg);
      const [state2] = Hooks.useState(createInitialState);

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
      Host.createRenderingEvent(['a', 1]),
      Host.createRenderingEvent(['a', 1]),
      Host.createErrorEvent(new Error('b')),
      Host.createRenderingEvent(['c', 2]),
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('setting a new state triggers a rendering', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = Hooks.useState('a');
      const [state2, setState2] = Hooks.useState(0);

      Hooks.useEffect(() => {
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
      Host.createRenderingEvent(['c', 4], ['b', 2], ['a', 0]),
      Host.createRenderingEvent(['e', 8], ['d', 6]),
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('setting the same state does not trigger a rendering', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = Hooks.useState('a');
      const [state2, setState2] = Hooks.useState(0);

      Hooks.useEffect(() => {
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

    expect(events).toEqual([Host.createRenderingEvent(['a', 0])]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('setting an outdated state does not trigger a rendering', async () => {
    const hook = jest.fn((arg: string) => {
      const [state, setState] = Hooks.useState(arg);

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
      Host.createRenderingEvent('a'),
      Host.createResetEvent(),
    ]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a failed setting of a state causes an error event', async () => {
    const hook = jest.fn((arg: string) => {
      const [state, setState] = Hooks.useState(() => {
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
      Host.createErrorEvent(new Error('a')),
      Host.createErrorEvent(new Error('b')),
      Host.createRenderingEvent('c'),
      Host.createErrorEvent(new Error('c')),
    ]);

    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('the identity of a setState function is stable until a reset event occurs', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg: string) => {
      const [state, setState] = Hooks.useState(arg);

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
      Host.createRenderingEvent('b', 'a'),
      Host.createRenderingEvent('b'),
      Host.createResetEvent(),
      Host.createRenderingEvent('d', 'c'),
    ]);

    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('the identity of a setState function is stable until an error event occurs', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg: string) => {
      const [state, setState] = Hooks.useState(arg);

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
      Host.createErrorEvent(new Error('b')),
      Host.createRenderingEvent('d', 'c'),
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
      Hooks.useEffect(effect1);
      Hooks.useEffect(effect2, []);
      Hooks.useEffect(effect3, [arg1, arg2]);

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
      Host.createRenderingEvent(['a', 0]),
      Host.createRenderingEvent(['a', 0]),
      Host.createRenderingEvent(['a', 1]),
      Host.createRenderingEvent(['b', 1]),
      Host.createRenderingEvent(['b', 1]),
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('an effect retriggers after a reset event', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn(() => {
      Hooks.useEffect(effect, []);
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
      Host.createRenderingEvent(undefined),
      Host.createRenderingEvent(undefined),
      Host.createResetEvent(),
      Host.createRenderingEvent(undefined),
      Host.createRenderingEvent(undefined),
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after a synchronous error event', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn((arg: string) => {
      Hooks.useEffect(effect, []);

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
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(new Error('b')),
      Host.createRenderingEvent('c'),
      Host.createRenderingEvent('d'),
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after an asynchronous error event', async () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn((arg: string) => {
      const [, setState] = Hooks.useState(arg);

      Hooks.useEffect(effect, []);

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
      Host.createRenderingEvent('a'),
      Host.createRenderingEvent('b'),
      Host.createErrorEvent(new Error('b')),
      Host.createRenderingEvent('c'),
      Host.createRenderingEvent('d'),
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a failed triggering of an effect causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      Hooks.useEffect(() => {
        throw new Error(arg);
      }, []);

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');

    expect(events).toEqual([Host.createErrorEvent(new Error('a'))]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a memoized value is recomputed if one of its dependencies changes', () => {
    const createValue1 = jest.fn();
    const createValue2 = jest.fn();

    const hook = jest.fn((arg1: string, arg2: number) => {
      Hooks.useMemo(createValue1, []);
      Hooks.useMemo(createValue2, [arg1, arg2]);

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
      Host.createRenderingEvent(['a', 0]),
      Host.createRenderingEvent(['a', 0]),
      Host.createRenderingEvent(['a', 1]),
      Host.createRenderingEvent(['b', 1]),
      Host.createRenderingEvent(['b', 1]),
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after a reset event', () => {
    const hook = jest.fn((arg: string) => {
      return Hooks.useMemo(() => arg, []);
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');
    host.reset();
    host.render('c');
    host.render('d');

    expect(events).toEqual([
      Host.createRenderingEvent('a'),
      Host.createRenderingEvent('a'),
      Host.createResetEvent(),
      Host.createRenderingEvent('c'),
      Host.createRenderingEvent('c'),
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a memoized value is recomputed after a synchronous error event', () => {
    const hook = jest.fn((arg: string) => {
      const value = Hooks.useMemo(() => arg, []);

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
      Host.createRenderingEvent('a'),
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(new Error('c')),
      Host.createRenderingEvent('d'),
      Host.createRenderingEvent('d'),
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after an asynchronous error event', async () => {
    const hook = jest.fn((arg: string) => {
      const value = Hooks.useMemo(() => arg, []);
      const [, setState] = Hooks.useState(arg);

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
      Host.createRenderingEvent('a'),
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(new Error('b')),
      Host.createRenderingEvent('c'),
      Host.createRenderingEvent('c'),
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
        Hooks.useCallback(callback1, []),
        Hooks.useCallback(callback2, [arg1, arg2]),
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
      Host.createRenderingEvent([callbackA, callbackB]),
      Host.createRenderingEvent([callbackA, callbackB]),
      Host.createRenderingEvent([callbackA, callbackF]),
      Host.createRenderingEvent([callbackA, callbackH]),
      Host.createRenderingEvent([callbackA, callbackH]),
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a ref object is stable and mutable', () => {
    const hook = jest.fn(() => {
      const ref1 = Hooks.useRef('a');
      const ref2 = Hooks.useRef(0);

      Hooks.useEffect(() => {
        ref2.current = 1;
      }, []);

      return [ref1.current, ref2.current];
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render();
    host.render();
    host.render();

    expect(events).toEqual([
      Host.createRenderingEvent(['a', 0]),
      Host.createRenderingEvent(['a', 1]),
      Host.createRenderingEvent(['a', 1]),
    ]);

    expect(hook).toBeCalledTimes(3);
  });

  test('using fewer Hooks causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useState('a');
        Hooks.useState('b');
      } else {
        Hooks.useState('a');
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error('The number of Hooks used must not change.');

    expect(events).toEqual([
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(reason),
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('using more Hooks causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useState('a');
      } else {
        Hooks.useState('a');
        Hooks.useState('b');
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error('The number of Hooks used must not change.');

    expect(events).toEqual([
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(reason),
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('changing the order of the Hooks used causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useState('a');
      } else {
        Hooks.useEffect(jest.fn());
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, eventListener);

    host.render('a');
    host.render('b');

    const reason = new Error('The order of the Hooks used must not change.');

    expect(events).toEqual([
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(reason),
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing the dependencies of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn(), []);
      } else {
        Hooks.useEffect(jest.fn());
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
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(reason),
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding the dependencies of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn());
      } else {
        Hooks.useEffect(jest.fn(), []);
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
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(reason),
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing a single dependency of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn(), [1, 0]);
      } else {
        Hooks.useEffect(jest.fn(), [1]);
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
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(reason),
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding a single dependency of a Hook causes an error event', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn(), [1]);
      } else {
        Hooks.useEffect(jest.fn(), [1, 0]);
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
      Host.createRenderingEvent('a'),
      Host.createErrorEvent(reason),
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('using two hosts at the same time', () => {
    const hook1 = (arg: string) => {
      const [state] = Hooks.useState(arg);

      return state;
    };

    const hook2 = (arg: number) => {
      const [state] = Hooks.useState(arg);

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
      Host.createRenderingEvent('a'),
      Host.createRenderingEvent(0),
      Host.createResetEvent(),
      Host.createRenderingEvent('b'),
      Host.createRenderingEvent(0),
    ]);
  });

  test('using a Hook without a host causes an error event', () => {
    const reason = new Error('A Hook cannot be used without a host.');

    expect(() => Hooks.useState('a')).toThrow(reason);
    expect(() => Hooks.useEffect(jest.fn())).toThrow(reason);
    expect(() => Hooks.useMemo(jest.fn(), [])).toThrow(reason);

    new Host(
      () => Hooks.useEffect(() => void Hooks.useState('a')),
      eventListener
    ).render();

    new Host(
      () => Hooks.useEffect(() => void Hooks.useEffect(jest.fn())),
      eventListener
    ).render();

    new Host(
      () => Hooks.useEffect(() => void Hooks.useMemo(jest.fn(), [])),
      eventListener
    ).render();

    expect(events).toEqual([
      Host.createErrorEvent(reason),
      Host.createErrorEvent(reason),
      Host.createErrorEvent(reason),
    ]);
  });
});
