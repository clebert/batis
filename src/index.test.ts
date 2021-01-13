import {AnyAgent, Host, HostEvent, HostListener} from '.';

const {useCallback, useEffect, useMemo, useRef, useState} = Host;

describe('Host', () => {
  let events: HostEvent<AnyAgent>[];
  let listener: HostListener<AnyAgent>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('an initial state is set only once', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const agent = jest.fn((arg: string) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('an initial state is reset after a reset event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const agent = jest.fn((arg: string) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');
    host.reset();
    host.render('c');

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: ['c', 2], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(agent).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after a synchronous error event', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const agent = jest.fn((arg: string) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return [state1, state2];
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');
    host.render('c');

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: ['c', 2], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(agent).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after an asynchronous error event', async () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const agent = jest.fn((arg: string) => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    await new Promise((resolve) => setTimeout(resolve));

    host.render('c');

    expect(events).toEqual([
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: true},
      {type: 'value', value: ['c', 2], async: false, intermediate: false},
    ]);

    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(agent).toHaveBeenCalledTimes(3);
  });

  test('setting a new state triggers a rendering', async () => {
    const agent = jest.fn(() => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render();

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'value', value: ['a', 0], async: false, intermediate: true},
      {type: 'value', value: ['b', 2], async: false, intermediate: true},
      {type: 'value', value: ['c', 4], async: false, intermediate: false},
      {type: 'value', value: ['d', 6], async: true, intermediate: true},
      {type: 'value', value: ['e', 8], async: true, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(5);
  });

  test('setting the same state does not trigger a rendering', async () => {
    const agent = jest.fn(() => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render();

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'value', value: ['a', 0], async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(1);
  });

  test('setting an outdated state does not trigger a rendering', async () => {
    const agent = jest.fn((arg: string) => {
      const [state, setState] = useState(arg);

      setTimeout(() => {
        setState('b');
      });

      return state;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.reset();

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'reset'},
    ]);

    expect(agent).toHaveBeenCalledTimes(1);
  });

  test('a failed setting of a state causes an error event', async () => {
    const agent = jest.fn((arg: string) => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');
    host.render('c');

    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      {type: 'error', error: new Error('a'), async: false},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'error', error: new Error('c'), async: true},
    ]);

    expect(agent).toHaveBeenCalledTimes(3);
  });

  test('the identity of a setState function is stable until a reset event occurs', () => {
    const setStateIdentities = new Set();

    const agent = jest.fn((arg: string) => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('c');
    host.reset();
    host.render('c');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: true},
      {type: 'value', value: 'b', async: false, intermediate: false},
      {type: 'value', value: 'b', async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: 'c', async: false, intermediate: true},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(setStateIdentities.size).toBe(2);
    expect(agent).toHaveBeenCalledTimes(5);
  });

  test('the identity of a setState function is stable until an error event occurs', () => {
    const setStateIdentities = new Set();

    const agent = jest.fn((arg: string) => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('c');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: true},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: 'c', async: false, intermediate: true},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(setStateIdentities.size).toBe(2);
    expect(agent).toHaveBeenCalledTimes(4);
  });

  test('an effect triggers if one of its dependencies changes', () => {
    const disposeEffect1 = jest.fn(() => {
      throw new Error('oops');
    });

    const disposeEffect3 = jest.fn();
    const effect1 = jest.fn(() => disposeEffect1);
    const effect2 = jest.fn();
    const effect3 = jest.fn(() => disposeEffect3);

    const agent = jest.fn((arg1: string, arg2: number) => {
      useEffect(effect1);
      useEffect(effect2, []);
      useEffect(effect3, [arg1, arg2]);

      return [arg1, arg2];
    });

    const consoleError = jest.spyOn(console, 'error');
    const host = new Host<typeof agent>(agent, listener);

    host.render('a', 0);
    host.render('a', 0);
    host.render('a', 1);
    host.render('b', 1);
    host.render('b', 1);

    expect(disposeEffect1).toHaveBeenCalledTimes(4);
    expect(disposeEffect3).toHaveBeenCalledTimes(2);
    expect(effect1).toHaveBeenCalledTimes(5);
    expect(effect2).toHaveBeenCalledTimes(1);
    expect(effect3).toHaveBeenCalledTimes(3);

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to dispose an effect.',
      new Error('oops')
    );

    expect(events).toEqual([
      {type: 'value', value: ['a', 0], async: false, intermediate: false},
      {type: 'value', value: ['a', 0], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['b', 1], async: false, intermediate: false},
      {type: 'value', value: ['b', 1], async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(5);
  });

  test('an effect retriggers after a reset event', () => {
    const disposeEffect = jest.fn();
    const effect = jest.fn(() => disposeEffect);

    const agent = jest.fn(() => {
      useEffect(effect, []);
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render();
    host.render();
    host.reset();
    host.render();
    host.render();

    expect(disposeEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'value', value: undefined, async: false, intermediate: false},
      {type: 'value', value: undefined, async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: undefined, async: false, intermediate: false},
      {type: 'value', value: undefined, async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after a synchronous error event', () => {
    const disposeEffect = jest.fn();
    const effect = jest.fn(() => disposeEffect);

    const agent = jest.fn((arg: string) => {
      useEffect(effect, []);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');
    host.render('c');
    host.render('d');

    expect(disposeEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(4);
  });

  test('an effect retriggers after an asynchronous error event', async () => {
    const disposeEffect = jest.fn();
    const effect = jest.fn(() => disposeEffect);

    const agent = jest.fn((arg: string) => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    await new Promise((resolve) => setTimeout(resolve));

    host.render('c');
    host.render('d');

    expect(disposeEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'b', async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: true},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(4);
  });

  test('a failed triggering of an effect causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      useEffect(() => {
        throw new Error(arg);
      }, []);

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');

    expect(events).toEqual([
      {type: 'error', error: new Error('a'), async: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(1);
  });

  test('a memoized value is recomputed if one of its dependencies changes', () => {
    const createValue1 = jest.fn();
    const createValue2 = jest.fn();

    const agent = jest.fn((arg1: string, arg2: number) => {
      useMemo(createValue1, []);
      useMemo(createValue2, [arg1, arg2]);

      return [arg1, arg2];
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a', 0);
    host.render('a', 0);
    host.render('a', 1);
    host.render('b', 1);
    host.render('b', 1);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);

    expect(events).toEqual([
      {type: 'value', value: ['a', 0], async: false, intermediate: false},
      {type: 'value', value: ['a', 0], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['b', 1], async: false, intermediate: false},
      {type: 'value', value: ['b', 1], async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after a reset event', () => {
    const agent = jest.fn((arg: string) => {
      return useMemo(() => arg, []);
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');
    host.reset();
    host.render('c');
    host.render('d');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(4);
  });

  test('a memoized value is recomputed after a synchronous error event', () => {
    const agent = jest.fn((arg: string) => {
      const value = useMemo(() => arg, []);

      if (arg === 'c') {
        throw new Error(arg);
      }

      return value;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');
    host.render('c');
    host.render('d');
    host.render('e');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'error', error: new Error('c'), async: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
      {type: 'value', value: 'd', async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(5);
  });

  test('a memoized value is recomputed after an asynchronous error event', async () => {
    const agent = jest.fn((arg: string) => {
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

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    await new Promise((resolve) => setTimeout(resolve));

    host.render('c');
    host.render('d');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'error', error: new Error('b'), async: true},
      {type: 'value', value: 'c', async: false, intermediate: false},
      {type: 'value', value: 'c', async: false, intermediate: false},
    ]);

    expect(agent).toHaveBeenCalledTimes(4);
  });

  test('a memoized callback changes if one of its dependencies changes', () => {
    const agent = jest.fn(
      (
        callback1: jest.Mock,
        callback2: jest.Mock,
        arg1: string,
        arg2: number
      ) => [useCallback(callback1, []), useCallback(callback2, [arg1, arg2])]
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

    const host = new Host<typeof agent>(agent, listener);

    host.render(callbackA, callbackB, 'a', 0);
    host.render(callbackC, callbackD, 'a', 0);
    host.render(callbackE, callbackF, 'a', 1);
    host.render(callbackG, callbackH, 'b', 1);
    host.render(callbackI, callbackJ, 'b', 1);

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

    expect(agent).toHaveBeenCalledTimes(5);
  });

  test('a ref object is stable and mutable', () => {
    const agent = jest.fn(() => {
      const ref1 = useRef('a');
      const ref2 = useRef(0);

      useEffect(() => {
        ref2.current = 1;
      }, []);

      return [ref1.current, ref2.current];
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render();
    host.render();
    host.render();

    expect(events).toEqual([
      {type: 'value', value: ['a', 0], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
      {type: 'value', value: ['a', 1], async: false, intermediate: false},
    ]);

    expect(agent).toBeCalledTimes(3);
  });

  test('using fewer subagents causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      if (arg === 'a') {
        useState('a');
        useState('b');
      } else {
        useState('a');
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The number of subagents used must not change.'),
        async: false,
      },
    ]);

    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('using more subagents causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      if (arg === 'a') {
        useState('a');
      } else {
        useState('a');
        useState('b');
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The number of subagents used must not change.'),
        async: false,
      },
    ]);

    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('changing the order of the subagents used causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      if (arg === 'a') {
        useState('a');
      } else {
        useEffect(jest.fn());
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error('The order of the subagents used must not change.'),
        async: false,
      },
    ]);

    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('removing the dependencies of a subagent causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      if (arg === 'a') {
        useEffect(jest.fn(), []);
      } else {
        useEffect(jest.fn());
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error(
          'The existence of dependencies of a subagent must not change.'
        ),
        async: false,
      },
    ]);

    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('adding the dependencies of a subagent causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      if (arg === 'a') {
        useEffect(jest.fn());
      } else {
        useEffect(jest.fn(), []);
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error(
          'The existence of dependencies of a subagent must not change.'
        ),
        async: false,
      },
    ]);

    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('removing a single dependency of a subagent causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      if (arg === 'a') {
        useEffect(jest.fn(), [1, 0]);
      } else {
        useEffect(jest.fn(), [1]);
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error(
          'The order and number of dependencies of a subagent must not change.'
        ),
        async: false,
      },
    ]);

    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('adding a single dependency of a subagent causes an error event', () => {
    const agent = jest.fn((arg: string) => {
      if (arg === 'a') {
        useEffect(jest.fn(), [1]);
      } else {
        useEffect(jest.fn(), [1, 0]);
      }

      return arg;
    });

    const host = new Host<typeof agent>(agent, listener);

    host.render('a');
    host.render('b');

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {
        type: 'error',
        error: new Error(
          'The order and number of dependencies of a subagent must not change.'
        ),
        async: false,
      },
    ]);

    expect(agent).toHaveBeenCalledTimes(2);
  });

  test('using two hosts at the same time', () => {
    const agent1 = (arg: string) => {
      const [state] = useState(arg);

      return state;
    };

    const agent2 = (arg: number) => {
      const [state] = useState(arg);

      return state;
    };

    const host1 = new Host<typeof agent1>(agent1, listener);
    const host2 = new Host<typeof agent2>(agent2, listener);

    host1.render('a');
    host2.render(0);
    host1.reset();
    host1.render('b');
    host2.render(1);

    expect(events).toEqual([
      {type: 'value', value: 'a', async: false, intermediate: false},
      {type: 'value', value: 0, async: false, intermediate: false},
      {type: 'reset'},
      {type: 'value', value: 'b', async: false, intermediate: false},
      {type: 'value', value: 0, async: false, intermediate: false},
    ]);
  });
});
