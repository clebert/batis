// tslint:disable: no-floating-promises

import {HookProcess, useEffect, useRef, useState} from '.';
import {queueMacrotasks} from './internals/queue-macrotasks';

describe('HookProcess', () => {
  test('making fewer hook calls causes an error', async () => {
    const hook = jest.fn(() => {
      const [firstTime, setFirstTime] = useState(false);

      if (!firstTime) {
        setFirstTime(true);
      }

      if (firstTime) {
        useRef('a');
        useRef('b');
      } else {
        useRef('a');
      }
    });

    expect(() => HookProcess.start(hook, [])).toThrow(
      new Error('The number of hook calls must not change.')
    );

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('making more hook calls causes an error', async () => {
    const hook = jest.fn(() => {
      const [firstTime, setFirstTime] = useState(false);

      if (!firstTime) {
        setFirstTime(true);
      }

      if (firstTime) {
        useRef('a');
      } else {
        useRef('a');
        useRef('b');
      }
    });

    expect(() => HookProcess.start(hook, [])).toThrow(
      new Error('The number of hook calls must not change.')
    );

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('changing the order of hook calls causes an error', async () => {
    const hook = jest.fn(() => {
      const [firstTime, setFirstTime] = useState(false);

      if (!firstTime) {
        setFirstTime(true);
      }

      if (firstTime) {
        useRef('a');
        useEffect(jest.fn(), []);
      } else {
        useEffect(jest.fn(), []);
        useRef('a');
      }
    });

    expect(() => HookProcess.start(hook, [])).toThrow(
      new Error('The order of hook calls must not change.')
    );

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('changing the existence of hook dependencies causes an error', async () => {
    const hook1 = jest.fn(() => {
      const [firstTime, setFirstTime] = useState(false);

      if (!firstTime) {
        setFirstTime(true);
      }

      if (firstTime) {
        useEffect(jest.fn(), []);
      } else {
        useEffect(jest.fn());
      }
    });

    expect(() => HookProcess.start(hook1, [])).toThrow(
      new Error('The existence of hook dependencies must not change.')
    );

    await queueMacrotasks(10);

    expect(hook1).toHaveBeenCalledTimes(2);

    const hook2 = jest.fn(() => {
      const [firstTime, setFirstTime] = useState(false);

      if (!firstTime) {
        setFirstTime(true);
      }

      if (firstTime) {
        useEffect(jest.fn());
      } else {
        useEffect(jest.fn(), []);
      }
    });

    expect(() => HookProcess.start(hook2, [])).toThrow(
      new Error('The existence of hook dependencies must not change.')
    );

    await queueMacrotasks(10);

    expect(hook2).toHaveBeenCalledTimes(2);
  });

  test('changing the number of hook dependencies causes an error', async () => {
    const hook1 = jest.fn(() => {
      const [firstTime, setFirstTime] = useState(false);

      if (!firstTime) {
        setFirstTime(true);
      }

      if (firstTime) {
        useEffect(jest.fn(), []);
      } else {
        useEffect(jest.fn(), ['a']);
      }
    });

    expect(() => HookProcess.start(hook1, [])).toThrow(
      new Error('The order and number of hook dependencies must not change.')
    );

    await queueMacrotasks(10);

    expect(hook1).toHaveBeenCalledTimes(2);

    const hook2 = jest.fn(() => {
      const [firstTime, setFirstTime] = useState(false);

      if (!firstTime) {
        setFirstTime(true);
      }

      if (firstTime) {
        useEffect(jest.fn(), ['a']);
      } else {
        useEffect(jest.fn(), []);
      }
    });

    expect(() => HookProcess.start(hook2, [])).toThrow(
      new Error('The order and number of hook dependencies must not change.')
    );

    await queueMacrotasks(10);

    expect(hook2).toHaveBeenCalledTimes(2);
  });

  test('calling a hook outside the body of an active hook causes an error', () => {
    expect(() => useRef('a')).toThrow(
      new Error('Hooks can only be called inside the body of an active hook.')
    );
  });

  test('calling result.value of a stopped hook process causes an error', () => {
    const {result, isStopped, stop} = HookProcess.start(jest.fn(), []);

    stop();

    expect(isStopped()).toBe(true);

    expect(() => result.value).toThrow(
      new Error('The hook process has already stopped.')
    );
  });

  test('calling result.next of a stopped hook process causes an error', () => {
    const {result, isStopped, stop} = HookProcess.start(jest.fn(), []);

    stop();

    expect(isStopped()).toBe(true);

    expect(() => result.next).toThrow(
      new Error('The hook process has already stopped.')
    );
  });

  test('stopping the hook process finally resolves result.next', async () => {
    const {result, stop} = HookProcess.start(jest.fn(), []);
    const {next} = result;

    stop();

    expect(await next).toEqual({done: true, value: undefined});
  });

  test('calling update() of a stopped hook process causes an error', () => {
    const {isStopped, stop, update} = HookProcess.start(jest.fn(), []);

    stop();

    expect(isStopped()).toBe(true);

    expect(() => update([])).toThrow(
      new Error(
        'The hook process has already stopped and can therefore no longer be updated.'
      )
    );
  });

  test('registering a hook on a non-active hook process causes an error', () => {
    const {
      registerEffectHook,
      registerMemoHook,
      registerStateHook,
    } = HookProcess.start(jest.fn(), []);

    expect(() => registerEffectHook(jest.fn())).toThrow(
      new Error('Please use the separately exported useEffect() function.')
    );

    expect(() => registerMemoHook(jest.fn(), [])).toThrow(
      new Error('Please use the separately exported useMemo() function.')
    );

    expect(() => registerStateHook(jest.fn())).toThrow(
      new Error('Please use the separately exported useState() function.')
    );
  });

  test('result.next resolves only when there is a change in value', async () => {
    const {result} = HookProcess.start(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => setState('a'));
        queueMacrotasks(2).then(() => setState('b'));
      }, []);

      return state;
    }, []);

    expect(result.value).toBe('a');
    expect(await result.next).toEqual({done: false, value: 'b'});
    expect(result.value).toBe('b');
  });

  test('result.next is created lazily', async () => {
    const {result} = HookProcess.start(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => setState('b'));
        queueMacrotasks(2).then(() => setState('c'));
      }, []);

      return state;
    }, []);

    const {next: next1} = result;
    const {next: next2} = result;

    expect(result.value).toBe('a');
    expect(await next1).toEqual({done: false, value: 'b'});
    expect(await next2).toEqual({done: false, value: 'b'});

    const {next: next3} = result;
    const {next: next4} = result;

    expect(result.value).toBe('b');
    expect(await next3).toEqual({done: false, value: 'c'});
    expect(await next4).toEqual({done: false, value: 'c'});
    expect(result.value).toBe('c');

    expect(next1).toBe(next2);
    expect(next2).not.toBe(next3);
    expect(next3).toBe(next4);
  });

  test('synchronous and asynchronous result values are always coherent', async () => {
    const {result, update} = HookProcess.start((arg: string) => arg, ['a']);
    const {next} = result;

    expect(result.value).toBe('a');
    expect(update(['a'])).toBe('a');
    expect(result.value).toBe('a');

    next.then((iteratorResult) => {
      expect(result.value).toBe('b');
      expect(iteratorResult).toEqual({done: false, value: 'b'});
      expect(true).toBe(true);
    });

    expect(update(['b'])).toBe('b');
    expect(result.value).toBe('b');
    expect(await next).toEqual({done: false, value: 'b'});
    expect(result.value).toBe('b');

    expect.assertions(10);
  });

  test('result is also an async iterator', async () => {
    const hookProcess = HookProcess.start(() => {
      const [state, setState] = useState(0);

      useEffect(() => {
        setTimeout(() => {
          if (state < 2) {
            setState((prevState) => prevState + 1);
          } else {
            hookProcess.stop();
          }
        }, 0);
      }, [state]);

      return state;
    }, []);

    const values = [hookProcess.result.value];

    for await (const value of hookProcess.result) {
      values.push(value);
    }

    expect(values).toEqual([0, 1, 2]);
  });
});
