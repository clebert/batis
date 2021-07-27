import {Host} from './host';

const {Hooks} = Host;

function macrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

describe('Host', () => {
  let listener: (error: unknown) => void;

  beforeEach(() => {
    listener = jest.fn();
  });

  test('an initial state is set only once', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Hooks.useState(arg);
      const [state2] = Hooks.useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual([['a', 1]]);
    expect(host.render('b')).toEqual([['a', 1]]);

    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('an initial state is reset after a reset', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Hooks.useState(arg);
      const [state2] = Hooks.useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual([['a', 1]]);
    expect(host.render('b')).toEqual([['a', 1]]);
    host.reset();
    expect(host.render('c')).toEqual([['c', 2]]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after a synchronous error', () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual([['a', 1]]);
    expect(() => host.render('b')).toThrow(new Error('b'));
    expect(host.render('c')).toEqual([['c', 2]]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after an asynchronous error', async () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual([['a', 1]]);
    expect(host.render('b')).toEqual([['a', 1]]);

    expect(listener).toHaveBeenCalledTimes(0);
    await macrotask();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(new Error('b'));

    expect(host.render('c')).toEqual([['c', 2]]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('setting a new state notifies the listener', async () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render()).toEqual([
      ['c', 4],
      ['b', 2],
      ['a', 0],
    ]);

    expect(listener).toHaveBeenCalledTimes(0);
    await macrotask();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();

    expect(host.render()).toEqual([
      ['e', 8],
      ['d', 6],
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('setting the same state does not notify the listener', async () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render()).toEqual([['a', 0]]);

    await macrotask();
    expect(listener).toHaveBeenCalledTimes(0);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('setting an outdated state does not notify the listener', async () => {
    const hook = jest.fn((arg: string) => {
      const [state, setState] = Hooks.useState(arg);

      setTimeout(() => {
        setState('b');
      });

      return state;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);
    host.reset();

    await macrotask();
    expect(listener).toHaveBeenCalledTimes(0);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a failed setting of a state causes an error', async () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(() => host.render('a')).toThrow(new Error('a'));
    expect(() => host.render('b')).toThrow(new Error('b'));
    expect(host.render('c')).toEqual(['c']);

    expect(listener).toHaveBeenCalledTimes(0);
    await macrotask();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(new Error('c'));

    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('the identity of a setState function is stable until a reset', () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['b', 'a']);
    expect(host.render('c')).toEqual(['b']);
    host.reset();
    expect(host.render('c')).toEqual(['d', 'c']);

    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('the identity of a setState function is stable until an error occurs', () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(() => host.render('a')).toThrow(new Error('b'));
    expect(host.render('c')).toEqual(['d', 'c']);

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
    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a', 0)).toEqual([['a', 0]]);
    expect(host.render('a', 0)).toEqual([['a', 0]]);
    expect(host.render('a', 1)).toEqual([['a', 1]]);
    expect(host.render('b', 1)).toEqual([['b', 1]]);
    expect(host.render('b', 1)).toEqual([['b', 1]]);

    expect(cleanUpEffect1).toHaveBeenCalledTimes(4);
    expect(cleanUpEffect3).toHaveBeenCalledTimes(2);
    expect(effect1).toHaveBeenCalledTimes(5);
    expect(effect2).toHaveBeenCalledTimes(1);
    expect(effect3).toHaveBeenCalledTimes(3);

    expect(consoleError).toHaveBeenCalledWith(
      'An effect could not be cleaned up.',
      new Error('oops')
    );

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('an effect retriggers after a reset', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn(() => {
      Hooks.useEffect(effect, []);
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render()).toEqual([undefined]);
    expect(host.render()).toEqual([undefined]);
    host.reset();
    expect(host.render()).toEqual([undefined]);
    expect(host.render()).toEqual([undefined]);

    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after a synchronous error', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn((arg: string) => {
      Hooks.useEffect(effect, []);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);
    expect(() => host.render('b')).toThrow(new Error('b'));
    expect(host.render('c')).toEqual(['c']);
    expect(host.render('d')).toEqual(['d']);

    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after an asynchronous error', async () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);
    expect(host.render('b')).toEqual(['b']);

    expect(listener).toHaveBeenCalledTimes(0);
    await macrotask();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(new Error('b'));

    expect(host.render('c')).toEqual(['c']);
    expect(host.render('d')).toEqual(['d']);

    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a failed triggering of an effect causes an error', () => {
    const hook = jest.fn((arg: string) => {
      Hooks.useEffect(() => {
        throw new Error(arg);
      }, []);

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(() => host.render('a')).toThrow(new Error('a'));

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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a', 0)).toEqual([['a', 0]]);
    expect(host.render('a', 0)).toEqual([['a', 0]]);
    expect(host.render('a', 1)).toEqual([['a', 1]]);
    expect(host.render('b', 1)).toEqual([['b', 1]]);
    expect(host.render('b', 1)).toEqual([['b', 1]]);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after a reset', () => {
    const hook = jest.fn((arg: string) => {
      return Hooks.useMemo(() => arg, []);
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);
    expect(host.render('b')).toEqual(['a']);
    host.reset();
    expect(host.render('c')).toEqual(['c']);
    expect(host.render('d')).toEqual(['c']);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a memoized value is recomputed after a synchronous error', () => {
    const hook = jest.fn((arg: string) => {
      const value = Hooks.useMemo(() => arg, []);

      if (arg === 'c') {
        throw new Error(arg);
      }

      return value;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);
    expect(host.render('b')).toEqual(['a']);
    expect(() => host.render('c')).toThrow(new Error('c'));
    expect(host.render('d')).toEqual(['d']);
    expect(host.render('e')).toEqual(['d']);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after an asynchronous error', async () => {
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);
    expect(host.render('b')).toEqual(['a']);

    expect(listener).toHaveBeenCalledTimes(0);
    await macrotask();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(new Error('b'));

    expect(host.render('c')).toEqual(['c']);
    expect(host.render('d')).toEqual(['c']);

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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render(callbackA, callbackB, 'a', 0)).toEqual([
      [callbackA, callbackB],
    ]);

    expect(host.render(callbackC, callbackD, 'a', 0)).toEqual([
      [callbackA, callbackB],
    ]);

    expect(host.render(callbackE, callbackF, 'a', 1)).toEqual([
      [callbackA, callbackF],
    ]);

    expect(host.render(callbackG, callbackH, 'b', 1)).toEqual([
      [callbackA, callbackH],
    ]);

    expect(host.render(callbackI, callbackJ, 'b', 1)).toEqual([
      [callbackA, callbackH],
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

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render()).toEqual([['a', 0]]);
    expect(host.render()).toEqual([['a', 1]]);
    expect(host.render()).toEqual([['a', 1]]);

    expect(hook).toBeCalledTimes(3);
  });

  test('an initial reducer state is set only once', () => {
    let i = 0;

    const init = jest.fn((initialArg: string) => initialArg + (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = Hooks.useReducer(jest.fn(), arg);
      const [state2] = Hooks.useReducer(jest.fn(), arg, init);

      return [state1, state2];
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual([['a', 'a1']]);
    expect(host.render('b')).toEqual([['a', 'a1']]);

    expect(init).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('reducing a new state notifies the listener', () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = Hooks.useReducer(
        (previousState: string, action: string) => previousState + action,
        'a'
      );

      if (state === 'a') {
        dispatch('b');
        dispatch('c');
      }

      return state;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render()).toEqual(['abc', 'a']);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('reducing the same state does not notify the listener', () => {
    const hook = jest.fn(() => {
      const [state, dispatch] = Hooks.useReducer(
        (previousState: string) => previousState,
        'a'
      );

      if (state === 'a') {
        dispatch('b');
        dispatch('c');
      }

      return state;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render()).toEqual(['a']);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('the identity of a dispatch function is stable', () => {
    const dispatchIdentities = new Set();

    const hook = jest.fn(() => {
      const [state, dispatch] = Hooks.useReducer(
        (previousState: string, action: string) => previousState + action,
        'a'
      );

      dispatchIdentities.add(dispatch);

      if (state === 'a') {
        dispatch('b');
      }

      return state;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render()).toEqual(['ab', 'a']);
    expect(host.render()).toEqual(['ab']);

    expect(dispatchIdentities.size).toBe(1);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('using fewer Hooks causes an error', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useState('a');
        Hooks.useState('b');
      } else {
        Hooks.useState('a');
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);

    expect(() => host.render('b')).toThrow(
      new Error('The number of Hooks used must not change.')
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('using more Hooks causes an error', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useState('a');
      } else {
        Hooks.useState('a');
        Hooks.useState('b');
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);

    expect(() => host.render('b')).toThrow(
      new Error('The number of Hooks used must not change.')
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('changing the order of the Hooks used causes an error', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useState('a');
      } else {
        Hooks.useEffect(jest.fn());
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);

    expect(() => host.render('b')).toThrow(
      new Error('The order of the Hooks used must not change.')
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing the dependencies of a Hook causes an error', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn(), []);
      } else {
        Hooks.useEffect(jest.fn());
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);

    expect(() => host.render('b')).toThrow(
      new Error('The existence of dependencies of a Hook must not change.')
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding the dependencies of a Hook causes an error', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn());
      } else {
        Hooks.useEffect(jest.fn(), []);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);

    expect(() => host.render('b')).toThrow(
      new Error('The existence of dependencies of a Hook must not change.')
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing a single dependency of a Hook causes an error', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn(), [1, 0]);
      } else {
        Hooks.useEffect(jest.fn(), [1]);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);

    expect(() => host.render('b')).toThrow(
      new Error(
        'The order and number of dependencies of a Hook must not change.'
      )
    );

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding a single dependency of a Hook causes an error', () => {
    const hook = jest.fn((arg: string) => {
      if (arg === 'a') {
        Hooks.useEffect(jest.fn(), [1]);
      } else {
        Hooks.useEffect(jest.fn(), [1, 0]);
      }

      return arg;
    });

    const host = new Host<typeof hook>(hook, listener);

    expect(host.render('a')).toEqual(['a']);

    expect(() => host.render('b')).toThrow(
      new Error(
        'The order and number of dependencies of a Hook must not change.'
      )
    );

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

    const host1 = new Host<typeof hook1>(hook1, listener);
    const host2 = new Host<typeof hook2>(hook2, listener);

    expect(host1.render('a')).toEqual(['a']);
    expect(host2.render(0)).toEqual([0]);
    host1.reset();
    expect(host1.render('b')).toEqual(['b']);
    expect(host2.render(1)).toEqual([0]);
  });

  test('using a Hook without an active host causes an error', () => {
    const error = new Error('A Hook cannot be used without an active host.');

    expect(() => Hooks.useState('a')).toThrow(error);
    expect(() => Hooks.useEffect(jest.fn())).toThrow(error);
    expect(() => Hooks.useMemo(jest.fn(), [])).toThrow(error);

    expect(() =>
      new Host(
        () => Hooks.useEffect(() => void Hooks.useState('a')),
        listener
      ).render()
    ).toThrow(error);

    expect(() =>
      new Host(
        () => Hooks.useEffect(() => void Hooks.useEffect(jest.fn())),
        listener
      ).render()
    ).toThrow(error);

    expect(() =>
      new Host(
        () => Hooks.useEffect(() => void Hooks.useMemo(jest.fn(), [])),
        listener
      ).render()
    ).toThrow(error);
  });
});
