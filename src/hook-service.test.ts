// tslint:disable: no-floating-promises

import {HookService, useEffect, useRef, useState} from '.';
import {queueMacrotasks} from './internals/queue-macrotasks';

describe('HookService', () => {
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

    expect(() => HookService.start(hook, [])).toThrow(
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

    expect(() => HookService.start(hook, [])).toThrow(
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

    expect(() => HookService.start(hook, [])).toThrow(
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

    expect(() => HookService.start(hook1, [])).toThrow(
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

    expect(() => HookService.start(hook2, [])).toThrow(
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

    expect(() => HookService.start(hook1, [])).toThrow(
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

    expect(() => HookService.start(hook2, [])).toThrow(
      new Error('The order and number of hook dependencies must not change.')
    );

    await queueMacrotasks(10);

    expect(hook2).toHaveBeenCalledTimes(2);
  });

  test('invoking a hook outside of an active hook service causes an error', () => {
    expect(() => useRef('a')).toThrow(
      new Error('Hooks can only be invoked within an active hook service.')
    );
  });

  test('accessing result.value of a stopped hook service causes an error', () => {
    const service = HookService.start(jest.fn(), []);

    service.stop();

    expect(service.stopped).toBe(true);

    expect(() => service.result.value).toThrow(
      new Error('The hook service has already stopped.')
    );
  });

  test('accessing result.next of a stopped hook service causes an error', () => {
    const service = HookService.start(jest.fn(), []);

    service.stop();

    expect(service.stopped).toBe(true);

    expect(() => service.result.next).toThrow(
      new Error('The hook service has already stopped.')
    );
  });

  test('stopping the hook service finally resolves result.next', async () => {
    const service = HookService.start(jest.fn(), []);
    const {next} = service.result;

    service.stop();

    expect(await next).toEqual({done: true, value: undefined});
  });

  test('updating a stopped hook service causes an error', () => {
    const service = HookService.start(jest.fn(), []);

    service.stop();

    expect(service.stopped).toBe(true);

    expect(() => service.update([])).toThrow(
      new Error(
        'The hook service has already stopped and can therefore no longer be updated.'
      )
    );
  });

  test('registering a hook on a non-active hook service causes an error', () => {
    const service = HookService.start(jest.fn(), []);

    expect(() => service.useEffect(jest.fn())).toThrow(
      new Error('Please use the separately exported useEffect() function.')
    );

    expect(() => service.useMemo(jest.fn(), [])).toThrow(
      new Error('Please use the separately exported useMemo() function.')
    );

    expect(() => service.useState(jest.fn())).toThrow(
      new Error('Please use the separately exported useState() function.')
    );
  });

  test('result.next resolves only when there is a change in value', async () => {
    const service = HookService.start(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => setState('a'));
        queueMacrotasks(2).then(() => setState('b'));
      }, []);

      return state;
    }, []);

    expect(service.result.value).toBe('a');
    expect(await service.result.next).toEqual({done: false, value: 'b'});
    expect(service.result.value).toBe('b');
  });

  test('result.next is created lazily', async () => {
    const service = HookService.start(() => {
      const [state, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() => setState('b'));
        queueMacrotasks(2).then(() => setState('c'));
      }, []);

      return state;
    }, []);

    const {next: next1} = service.result;
    const {next: next2} = service.result;

    expect(service.result.value).toBe('a');
    expect(await next1).toEqual({done: false, value: 'b'});
    expect(await next2).toEqual({done: false, value: 'b'});

    const {next: next3} = service.result;
    const {next: next4} = service.result;

    expect(service.result.value).toBe('b');
    expect(await next3).toEqual({done: false, value: 'c'});
    expect(await next4).toEqual({done: false, value: 'c'});
    expect(service.result.value).toBe('c');

    expect(next1).toBe(next2);
    expect(next2).not.toBe(next3);
    expect(next3).toBe(next4);
  });

  test('synchronous and asynchronous result values are always coherent', async () => {
    const service = HookService.start((arg: string) => arg, ['a']);
    const {next} = service.result;

    expect(service.result.value).toBe('a');
    expect(service.update(['a'])).toBe('a');
    expect(service.result.value).toBe('a');

    next.then((iteratorResult) => {
      expect(service.result.value).toBe('b');
      expect(iteratorResult).toEqual({done: false, value: 'b'});
      expect(true).toBe(true);
    });

    expect(service.update(['b'])).toBe('b');
    expect(service.result.value).toBe('b');
    expect(await next).toEqual({done: false, value: 'b'});
    expect(service.result.value).toBe('b');

    expect.assertions(10);
  });

  test('result is also an async iterator', async () => {
    const service = HookService.start(() => {
      const [state, setState] = useState(0);

      useEffect(() => {
        setTimeout(() => {
          if (state < 2) {
            setState((prevState) => prevState + 1);
          } else {
            service.stop();
          }
        }, 0);
      }, [state]);

      return state;
    }, []);

    const values = [service.result.value];

    for await (const value of service.result) {
      values.push(value);
    }

    expect(values).toEqual([0, 1, 2]);
  });
});
