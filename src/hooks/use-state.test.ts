// tslint:disable: no-floating-promises

import {HookProcess, SetState, useEffect, useState} from '..';
import {queueMacrotasks} from '../internals/queue-macrotasks';

describe('useState()', () => {
  test('an initial state can be set once', async () => {
    const hook = jest.fn((arg) => {
      const [state] = useState(arg);

      return state;
    });

    const {result, update} = HookProcess.start(hook, ['a']);

    expect(result.getCurrent()).toBe('a');
    expect(update(['b'])).toBe('a');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
  });

  test('an initial state can be created lazily once', async () => {
    const createInitialState = jest.fn(() => 'a');

    const hook = jest.fn(() => {
      const [state] = useState(createInitialState);

      return state;
    });

    const {result, update} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('a');
    expect(update([])).toBe('a');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
    expect(createInitialState).toBeCalledTimes(1);
  });

  test('synchronously setting a new state executes the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      setState('b');
      setState('c');

      return state;
    });

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('c');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
  });

  test('asynchronously setting a new state executes the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => {
          setState('b');
          setState('c');
        });
      }, []);

      return state;
    });

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('a');
    expect(hook).toBeCalledTimes(1);
    await expect(result.getNextAsync()).resolves.toBe('c');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
  });

  test('synchronously setting the same state does not execute the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      setState('b');
      setState('a');

      return state;
    });

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('a');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(1);
  });

  test('asynchronously setting the same state does not execute the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => {
          setState('b');
          setState('a');
        });
      }, []);

      return state;
    });

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('a');
    expect(hook).toBeCalledTimes(1);

    await queueMacrotasks(10);
    expect(result.getCurrent()).toBe('a');
    expect(hook).toBeCalledTimes(1);
  });

  test('creating a new state executes the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      if (state === 'a') {
        setState((previousState) => previousState + 'b');
        setState((previousState) => previousState + 'c');
      }

      return state;
    });

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('abc');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
  });

  test('creating the same state does not execute the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      setState((previousState) => previousState);

      return state;
    });

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('a');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(1);
  });

  test('an error caused by a state initialization prevents the hook process from being started', async () => {
    const hook = jest.fn(() => {
      useState(() => {
        throw new Error('oops');
      });
    });

    expect(() => HookProcess.start(hook, [])).toThrow(new Error('oops'));

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(1);
  });

  test('an error caused by a state change prevents the hook process from being started', async () => {
    const hook = jest.fn(() => {
      const [, setState] = useState('a');

      setState(() => {
        throw new Error('oops');
      });
    });

    expect(() => HookProcess.start(hook, [])).toThrow(new Error('oops'));

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(1);
  });

  test('an error caused by a state change triggered by an update stops the hook process', async () => {
    const hook = jest.fn((arg) => {
      const [state, setState] = useState(arg);

      if (arg === 'b') {
        setState(() => {
          throw new Error('oops');
        });
      }

      return state;
    });

    const {result, isStopped, update} = HookProcess.start(hook, ['a']);

    expect(result.getCurrent()).toBe('a');
    expect(isStopped()).toBe(false);
    expect(() => update(['b'])).toThrow(new Error('oops'));
    expect(isStopped()).toBe(true);

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
  });

  test('an error caused by a state change triggered by an asynchronous effect stops the hook process', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => {
          setState(() => {
            throw new Error('oops');
          });
        });
      }, []);

      return state;
    });

    const {result, isStopped} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('a');
    expect(isStopped()).toBe(false);
    await expect(result.getNextAsync()).rejects.toEqual(new Error('oops'));
    expect(isStopped()).toBe(true);

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(1);
  });

  test('direct state changes are applied before those triggered by synchronous effects', async () => {
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

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('abcde');

    await queueMacrotasks(10);
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

    const {result} = HookProcess.start(hook, []);

    initialSetState!((previousState) => previousState + 'b');
    initialSetState!((previousState) => previousState + 'c');

    await expect(result.getNextAsync()).resolves.toBe('abc');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
  });
});
