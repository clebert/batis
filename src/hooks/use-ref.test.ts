// tslint:disable: no-floating-promises

import {HookProcess, useEffect, useRef, useState} from '..';
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

    const {result, update} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('ax');
    expect(hook).toBeCalledTimes(1);
    expect(update([])).toBe('ay');
    expect(hook).toBeCalledTimes(2);
    expect(update([])).toBe('ay');
    expect(hook).toBeCalledTimes(3);
    expect(update([])).toBe('ay');

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

    const {result} = HookProcess.start(hook, []);

    expect(result.getCurrent()).toBe('ax');
    await expect(result.getNextAsync()).resolves.toBe('by');

    await queueMacrotasks(10);
    expect(hook).toBeCalledTimes(2);
  });
});
