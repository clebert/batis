import {AnyHook, Service, ServiceEvent, ServiceListener} from '.';

const {useCallback, useEffect, useMemo, useRef, useState} = Service;

describe('Service', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('an initial state is set only once', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      return [state1, state2];
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('an initial state is reset after a reset event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      return [state1, state2];
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);
    service.reset();
    service.invoke(['c']);

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: ['c', 2], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after a synchronous error event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return [state1, state2];
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);
    service.invoke(['c']);

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: ['c', 2], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after an asynchronous error event', async () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg) => {
      const [state1, setState1] = useState(arg);
      const [state2] = useState(createInitialState);

      if (arg === 'b') {
        setTimeout(() =>
          setState1(() => {
            throw new Error(arg);
          })
        );
      }

      return [state1, state2];
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    await new Promise((resolve) => setTimeout(resolve));

    service.invoke(['c']);

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: true},
      {type: 'value', value: ['c', 2], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('setting a new state triggers a reinvocation', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = useState('a');
      const [state2, setState2] = useState(0);

      useEffect(() => {
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

    const service = new Service(hook, listener);

    service.invoke([]);

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'value', value: ['a', 0], async: false, intermediate: true},
      {type: 'value', value: ['b', 2], async: false, intermediate: true},
      {type: 'value', value: ['c', 4], async: false, intermediate: false},
      {type: 'value', value: ['d', 6], async: true, intermediate: true},
      {type: 'value', value: ['e', 8], async: true, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('setting the same state does not trigger a reinvocation', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = useState('a');
      const [state2, setState2] = useState(0);

      useEffect(() => {
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

    const service = new Service(hook, listener);

    service.invoke([]);

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'value', value: ['a', 0], async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('setting an outdated state does not trigger a reinvocation', async () => {
    const hook = jest.fn((arg) => {
      const [state, setState] = useState(arg);

      setTimeout(() => {
        setState('b');
      });

      return state;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.reset();

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'reset'},
    ]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a failed setting of a state causes an error event', async () => {
    const hook = jest.fn((arg) => {
      const [state, setState] = useState(() => {
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

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);
    service.invoke(['c']);

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'error', error: new Error('a'), async: false},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'error', error: new Error('c'), async: true},
    ]);

    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('the identity of a setState function is stable until a reset event occurs', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg) => {
      const [state, setState] = useState(arg);

      setStateIdentities.add(setState);

      if (state === 'a') {
        setState('b');
      }

      if (state === 'c') {
        setState('d');
      }

      return state;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['c']);
    service.reset();
    service.invoke(['c']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: true},
      {type: 'value', value: 'b', async: false, intermediate: false},
      {type: 'value', value: 'b', async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: 'c', async: false, intermediate: true},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('the identity of a setState function is stable until an error event occurs', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg) => {
      const [state, setState] = useState(arg);

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

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['c']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: true},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: 'c', async: false, intermediate: true},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect triggers if one of its dependencies changes', () => {
    const disposeEffect1 = jest.fn(() => {
      throw new Error('1');
    });

    const disposeEffect3 = jest.fn();
    const effect1 = jest.fn(() => disposeEffect1);
    const effect2 = jest.fn();
    const effect3 = jest.fn(() => disposeEffect3);

    const hook = jest.fn((arg1, arg2) => {
      useEffect(effect1);
      useEffect(effect2, []);
      useEffect(effect3, [arg1, arg2]);

      return [arg1, arg2];
    });

    const consoleError = jest.spyOn(console, 'error');
    const service = new Service(hook, listener);

    service.invoke(['a', 'x']);
    service.invoke(['a', 'x']);
    service.invoke(['a', 'y']);
    service.invoke(['b', 'y']);
    service.invoke(['b', 'y']);

    expect(disposeEffect1).toHaveBeenCalledTimes(4);
    expect(disposeEffect3).toHaveBeenCalledTimes(2);
    expect(effect1).toHaveBeenCalledTimes(5);
    expect(effect2).toHaveBeenCalledTimes(1);
    expect(effect3).toHaveBeenCalledTimes(3);

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to dispose an effect.',
      new Error('1')
    );

    expect(events).toEqual([
      {type: 'value', value: ['a', 'x'], async: false, intermediate: false},
      {type: 'value', value: ['a', 'x'], async: false, intermediate: false},
      {type: 'value', value: ['a', 'y'], async: false, intermediate: false},
      {type: 'value', value: ['b', 'y'], async: false, intermediate: false},
      {type: 'value', value: ['b', 'y'], async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('an effect retriggers after a reset event', () => {
    const disposeEffect = jest.fn();
    const effect = jest.fn(() => disposeEffect);

    const hook = jest.fn(() => {
      useEffect(effect, []);
    });

    const service = new Service(hook, listener);

    service.invoke([]);
    service.invoke([]);
    service.reset();
    service.invoke([]);
    service.invoke([]);

    expect(disposeEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'value', value: undefined, async: false, intermediate: false},
      {type: 'value', value: undefined, async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: undefined, async: false, intermediate: false},
      {type: 'value', value: undefined, async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after a synchronous error event', () => {
    const disposeEffect = jest.fn();
    const effect = jest.fn(() => disposeEffect);

    const hook = jest.fn((arg) => {
      useEffect(effect, []);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);
    service.invoke(['c']);
    service.invoke(['d']);

    expect(disposeEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after an asynchronous error event', async () => {
    const disposeEffect = jest.fn();
    const effect = jest.fn(() => disposeEffect);

    const hook = jest.fn((arg) => {
      const [, setState] = useState(arg);

      useEffect(effect, []);

      if (arg === 'b') {
        setTimeout(() =>
          setState(() => {
            throw new Error(arg);
          })
        );
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    await new Promise((resolve) => setTimeout(resolve));

    service.invoke(['c']);
    service.invoke(['d']);

    expect(disposeEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'b', async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: true},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a failed triggering of an effect causes an error event', () => {
    const hook = jest.fn((arg) => {
      useEffect(() => {
        throw new Error(arg);
      }, []);

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);

    expect(events).toEqual([
      {type: 'error', error: new Error('a'), async: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a memoized value is recomputed if one of its dependencies changes', () => {
    const createValue1 = jest.fn();
    const createValue2 = jest.fn();

    const hook = jest.fn((arg1, arg2) => {
      useMemo(createValue1, []);
      useMemo(createValue2, [arg1, arg2]);

      return [arg1, arg2];
    });

    const service = new Service(hook, listener);

    service.invoke(['a', 'x']);
    service.invoke(['a', 'x']);
    service.invoke(['a', 'y']);
    service.invoke(['b', 'y']);
    service.invoke(['b', 'y']);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);

    expect(events).toEqual([
      {type: 'value', value: ['a', 'x'], async: false, intermediate: false},
      {type: 'value', value: ['a', 'x'], async: false, intermediate: false},
      {type: 'value', value: ['a', 'y'], async: false, intermediate: false},
      {type: 'value', value: ['b', 'y'], async: false, intermediate: false},
      {type: 'value', value: ['b', 'y'], async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after a reset event', () => {
    const hook = jest.fn((arg) => {
      return useMemo(() => arg, []);
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);
    service.reset();
    service.invoke(['c']);
    service.invoke(['d']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a memoized value is recomputed after a synchronous error event', () => {
    const hook = jest.fn((arg) => {
      const value = useMemo(() => arg, []);

      if (arg === 'c') {
        throw new Error(arg);
      }

      return value;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);
    service.invoke(['c']);
    service.invoke(['d']);
    service.invoke(['e']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'error', error: new Error('c'), async: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after an asynchronous error event', async () => {
    const hook = jest.fn((arg) => {
      const value = useMemo(() => arg, []);
      const [, setState] = useState(arg);

      if (arg === 'b') {
        setTimeout(() =>
          setState(() => {
            throw new Error(arg);
          })
        );
      }

      return value;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    await new Promise((resolve) => setTimeout(resolve));

    service.invoke(['c']);
    service.invoke(['d']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: true},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
    ]);

    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a memoized callback changes if one of its dependencies changes', () => {
    const hook = jest.fn((callback1, callback2, arg1, arg2) => [
      useCallback(callback1, []),
      useCallback(callback2, [arg1, arg2]),
    ]);

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

    const service = new Service(hook, listener);

    service.invoke([callbackA, callbackB, 'a', 'x']);
    service.invoke([callbackC, callbackD, 'a', 'x']);
    service.invoke([callbackE, callbackF, 'a', 'y']);
    service.invoke([callbackG, callbackH, 'b', 'y']);
    service.invoke([callbackI, callbackJ, 'b', 'y']);

    expect(events).toEqual([
      {
        type: 'value',
        value: [callbackA, callbackB],
        async: false,
        intermediate: false,
      },
      {
        type: 'value',
        value: [callbackA, callbackB],
        async: false,
        intermediate: false,
      },
      {
        type: 'value',
        value: [callbackA, callbackF],
        async: false,
        intermediate: false,
      },
      {
        type: 'value',
        value: [callbackA, callbackH],
        async: false,
        intermediate: false,
      },
      {
        type: 'value',
        value: [callbackA, callbackH],
        async: false,
        intermediate: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a ref object is stable and mutable', () => {
    const hook = jest.fn(() => {
      const ref1 = useRef('a');
      const ref2 = useRef('x');

      useEffect(() => {
        ref2.current = 'y';
      }, []);

      return [ref1.current, ref2.current];
    });

    const service = new Service(hook, listener);

    service.invoke([]);
    service.invoke([]);
    service.invoke([]);

    expect(events).toEqual([
      {type: 'value', value: ['a', 'x'], async: false, intermediate: false},
      {type: 'value', value: ['a', 'y'], async: false, intermediate: false},
      {type: 'value', value: ['a', 'y'], async: false, intermediate: false},
    ]);

    expect(hook).toBeCalledTimes(3);
  });

  test('using fewer hooks causes an error event', () => {
    const hook = jest.fn((arg) => {
      if (arg === 'a') {
        useState('a');
        useState('b');
      } else {
        useState('a');
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The number of hooks used must not change.'),
        async: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('using more hooks causes an error event', () => {
    const hook = jest.fn((arg) => {
      if (arg === 'a') {
        useState('a');
      } else {
        useState('a');
        useState('b');
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The number of hooks used must not change.'),
        async: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('changing the order of the hooks used causes an error event', () => {
    const hook = jest.fn((arg) => {
      if (arg === 'a') {
        useState('a');
      } else {
        useEffect(jest.fn());
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The order of the hooks used must not change.'),
        async: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing hook dependencies causes an error event', () => {
    const hook = jest.fn((arg) => {
      if (arg === 'a') {
        useEffect(jest.fn(), []);
      } else {
        useEffect(jest.fn());
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The existence of hook dependencies must not change.'),
        async: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding hook dependencies causes an error event', () => {
    const hook = jest.fn((arg) => {
      if (arg === 'a') {
        useEffect(jest.fn());
      } else {
        useEffect(jest.fn(), []);
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The existence of hook dependencies must not change.'),
        async: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing a single hook dependency causes an error event', () => {
    const hook = jest.fn((arg) => {
      if (arg === 'a') {
        useEffect(jest.fn(), [1, 0]);
      } else {
        useEffect(jest.fn(), [1]);
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error(
          'The order and number of hook dependencies must not change.'
        ),
        async: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding a single hook dependency causes an error event', () => {
    const hook = jest.fn((arg) => {
      if (arg === 'a') {
        useEffect(jest.fn(), [1]);
      } else {
        useEffect(jest.fn(), [1, 0]);
      }

      return arg;
    });

    const service = new Service(hook, listener);

    service.invoke(['a']);
    service.invoke(['b']);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error(
          'The order and number of hook dependencies must not change.'
        ),
        async: false,
      },
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('using two services at the same time', () => {
    const hook1 = (arg: string) => {
      const [state] = useState(arg);

      return state;
    };

    const hook2 = (arg: string) => {
      const [state] = useState(arg);

      return state;
    };

    const service1 = new Service(hook1, listener);
    const service2 = new Service(hook2, listener);

    service1.invoke(['a1']);
    service2.invoke(['a2']);
    service1.reset();
    service1.invoke(['b1']);
    service2.invoke(['b2']);

    expect(events).toEqual([
      {type: 'value', value: 'a1', async: false, intermediate: false},
      {type: 'value', value: 'a2', async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: 'b1', async: false, intermediate: false},
      {type: 'value', value: 'a2', async: false, intermediate: false},
    ]);
  });
});
