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

  test('calling result.getCurrent() of a stopped hook process causes an error', () => {
    const {result, isStopped, stop} = HookProcess.start(jest.fn(), []);

    stop();

    expect(isStopped()).toBe(true);

    expect(() => result.getCurrent()).toThrow(
      new Error('The hook process has already stopped.')
    );
  });

  test('calling result.getNextAsync() of a stopped hook process causes an error', () => {
    const {result, isStopped, stop} = HookProcess.start(jest.fn(), []);

    stop();

    expect(isStopped()).toBe(true);

    expect(() => result.getNextAsync()).toThrow(
      new Error('The hook process has already stopped.')
    );
  });

  test('waiting for the next asynchronous result while the hook process is stopped causes an error', async () => {
    const {result, stop} = HookProcess.start(jest.fn(), []);
    const nextAsync = result.getNextAsync();

    stop();

    await expect(nextAsync).rejects.toThrow(
      new Error('The hook process has stopped.')
    );
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

  test('an asynchronous result promise is only resolved if its value differs', async () => {
    const {result} = HookProcess.start(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => setState('a'));
        queueMacrotasks(2).then(() => setState('b'));
      }, []);

      return state;
    }, []);

    expect(result.getCurrent()).toBe('a');
    await expect(result.getNextAsync()).resolves.toBe('b');
    expect(result.getCurrent()).toBe('b');
  });

  test('an asynchronous result promise is created lazily', async () => {
    const {result} = HookProcess.start(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => setState('b'));
        queueMacrotasks(2).then(() => setState('c'));
      }, []);

      return state;
    }, []);

    const nextAsync1 = result.getNextAsync();
    const nextAsync2 = result.getNextAsync();

    expect(result.getCurrent()).toBe('a');
    await expect(nextAsync1).resolves.toBe('b');
    await expect(nextAsync2).resolves.toBe('b');

    const nextAsync3 = result.getNextAsync();
    const nextAsync4 = result.getNextAsync();

    expect(result.getCurrent()).toBe('b');
    await expect(nextAsync3).resolves.toBe('c');
    await expect(nextAsync4).resolves.toBe('c');
    expect(result.getCurrent()).toBe('c');

    expect(nextAsync1).toBe(nextAsync2);
    expect(nextAsync2).not.toBe(nextAsync3);
    expect(nextAsync3).toBe(nextAsync4);
  });

  test('synchronous and asynchronous results are synchronized', async () => {
    const {result, update} = HookProcess.start((arg: string) => arg, ['a']);
    const nextAsync = result.getNextAsync();

    expect(result.getCurrent()).toBe('a');
    expect(update(['a'])).toBe('a');
    expect(result.getCurrent()).toBe('a');
    expect(update(['b'])).toBe('b');
    expect(result.getCurrent()).toBe('b');
    await expect(nextAsync).resolves.toBe('b');
    expect(result.getCurrent()).toBe('b');
  });
});
