// tslint:disable: no-floating-promises

import {HookService, useEffect, useRef, useState} from '..';
import {queueMacrotasks} from '../internals/queue-macrotasks';

describe('useRef()', () => {
  test('a ref value is persisted over several re-executions of the hook', async () => {
    const hook = jest.fn(() => {
      const ref1 = useRef('a');
      const ref2 = useRef('x');

      useEffect(() => {
        ref2.current = 'y';
      }, []);

      return ref1.current + ref2.current;
    });

    const service = HookService.start(hook, []);

    expect(service.result.value).toBe('ax');
    expect(hook).toBeCalledTimes(1);
    expect(service.update([])).toBe('ay');
    expect(hook).toBeCalledTimes(2);
    expect(service.update([])).toBe('ay');
    expect(hook).toBeCalledTimes(3);
    expect(service.update([])).toBe('ay');

    await queueMacrotasks(10);

    expect(hook).toBeCalledTimes(4);
  });

  test('changing a ref value does not execute the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');
      const ref = useRef('x');

      useEffect(() => {
        queueMacrotasks(1).then(() => (ref.current = 'y'));
        queueMacrotasks(2).then(() => setState('b'));
      }, []);

      return state + ref.current;
    });

    const service = HookService.start(hook, []);

    expect(service.result.value).toBe('ax');
    expect(await service.result.next).toEqual({done: false, value: 'by'});

    await queueMacrotasks(10);

    expect(hook).toBeCalledTimes(2);
  });
});
