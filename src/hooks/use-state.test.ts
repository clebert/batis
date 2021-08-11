import {Host, useLayoutEffect, useState} from '..';

describe('useState()', () => {
  test('an initial state is set only once', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host(hook);

    expect(host.run('a')).toEqual([['a', 1]]);
    expect(host.run('b')).toEqual([['a', 1]]);
    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('an initial state is reset after a reset', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      return [state1, state2];
    });

    const host = new Host(hook);

    expect(host.run('a')).toEqual([['a', 1]]);
    expect(host.run('b')).toEqual([['a', 1]]);

    host.reset();

    expect(host.run('c')).toEqual([['c', 2]]);
    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after a synchronous error', () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
      const [state1] = useState(arg);
      const [state2] = useState(createInitialState);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return [state1, state2];
    });

    const host = new Host(hook);

    expect(host.run('a')).toEqual([['a', 1]]);
    expect(() => host.run('b')).toThrow(new Error('b'));
    expect(host.run('c')).toEqual([['c', 2]]);
    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('an initial state is reset after an asynchronous error', async () => {
    let i = 0;

    const createInitialState = jest.fn(() => (i += 1));

    const hook = jest.fn((arg: string) => {
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

    const host = new Host(hook);

    expect(host.run('a')).toEqual([['a', 1]]);
    expect(host.run('b')).toEqual([['a', 1]]);

    await host.nextAsyncStateChange;

    expect(() => host.run('c')).toThrow(new Error('b'));
    expect(host.run('d')).toEqual([['d', 2]]);
    expect(createInitialState).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('setting a new state resolves the promise', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = useState('a');
      const [state2, setState2] = useState(0);

      useLayoutEffect(() => {
        setState1('c');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 += 1));

        setTimeout(() => {
          setState1('d');
          setState2((prevState2) => (prevState2 += 1));
          setState2((prevState2) => (prevState2 += 1));

          setTimeout(() => {
            setState1('f');
            setState2((prevState2) => (prevState2 += 1));
            setState2((prevState2) => (prevState2 += 1));
          });
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

    const host = new Host(hook);

    expect(host.run()).toEqual([
      ['c', 4],
      ['b', 2],
      ['a', 0],
    ]);

    const nextAsyncStateChange1 = host.nextAsyncStateChange;

    expect(nextAsyncStateChange1).toBe(host.nextAsyncStateChange);

    await nextAsyncStateChange1;

    expect(host.rerun()).toEqual([
      ['e', 8],
      ['d', 6],
    ]);

    const nextAsyncStateChange2 = host.nextAsyncStateChange;

    expect(nextAsyncStateChange2).not.toBe(nextAsyncStateChange1);

    await nextAsyncStateChange2;

    expect(host.rerun()).toEqual([['f', 10]]);
    expect(hook).toHaveBeenCalledTimes(6);
  });

  test('setting the same state does not resolve the promise', async () => {
    const hook = jest.fn(() => {
      const [state1, setState1] = useState('a');
      const [state2, setState2] = useState(0);

      useLayoutEffect(() => {
        setState1('c');
        setState1('a');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 -= 1));
      }, []);

      if (state1 === 'a') {
        setState1('b');
        setState1('a');
        setState2((prevState2) => (prevState2 += 1));
        setState2((prevState2) => (prevState2 -= 1));
      }

      return [state1, state2];
    });

    const host = new Host(hook);

    expect(host.run()).toEqual([['a', 0]]);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('a failed setting of a state causes an error', async () => {
    const hook = jest.fn((arg: string) => {
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
          throw arg;
        });
      });

      return state;
    });

    const host = new Host(hook);

    expect(() => host.run('a')).toThrow(new Error('a'));
    expect(() => host.run('b')).toThrow(new Error('b'));
    expect(host.run('c')).toEqual(['c']);

    await host.nextAsyncStateChange;

    expect(() => host.run('d')).toThrow(new Error('c'));
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('synchronous external state changes are applied before another run', () => {
    const hook = jest.fn(() => useState('a'));
    const host = new Host(hook);
    const [[state1, setState]] = host.run();

    expect(state1).toBe('a');

    const createState = jest.fn(() => 'b');

    setState(createState);
    expect(createState).toHaveBeenCalledTimes(0);
    expect(host.run()).toEqual([['b', setState]]);
    expect(host.rerun()).toEqual([['b', setState]]);
    expect(createState).toHaveBeenCalledTimes(1);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('the identity of a setState function is stable until a reset', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg: string) => {
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

    const host = new Host(hook);

    expect(host.run('a')).toEqual(['b', 'a']);
    expect(host.run('c')).toEqual(['b']);

    host.reset();

    expect(host.rerun()).toEqual(['d', 'c']);
    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('the identity of a setState function is stable until an error occurs', () => {
    const setStateIdentities = new Set();

    const hook = jest.fn((arg: string) => {
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

    const host = new Host(hook);

    expect(() => host.run('a')).toThrow(new Error('b'));
    expect(host.run('c')).toEqual(['d', 'c']);
    expect(setStateIdentities.size).toBe(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });
});
