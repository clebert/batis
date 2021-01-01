// tslint:disable: no-floating-promises

import {HookService, useEffect, useState} from '..';
import {queueMacrotasks} from '../internals/queue-macrotasks';

describe('useEffect()', () => {
  test('an effect triggers only if one of its dependencies changes', async () => {
    const effectWithoutDependencies = jest.fn();
    const effectWithEmptyDependencies = jest.fn();
    const effectWithDependencies = jest.fn();

    const hook = jest.fn((arg1: string, arg2: string) => {
      useEffect(effectWithoutDependencies);
      useEffect(effectWithEmptyDependencies, []);
      useEffect(effectWithDependencies, [arg1, arg2]);
    });

    const service = HookService.start(hook, ['a', 'x']);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(1);

    service.update(['a', 'x']);

    expect(hook).toHaveBeenCalledTimes(2);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(2);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(1);

    service.update(['a', 'y']);

    expect(hook).toHaveBeenCalledTimes(3);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(3);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(2);

    service.update(['b', 'y']);

    expect(hook).toHaveBeenCalledTimes(4);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(4);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(3);

    service.update(['b', 'y']);

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(5);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(5);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(3);
  });

  test('an effect is first cleaned up before it triggers again', async () => {
    const cleanUpEffect1 = jest.fn();
    const effect1 = jest.fn(() => cleanUpEffect1);

    const cleanUpEffect2 = jest.fn();
    const effect2 = jest.fn(() => cleanUpEffect2);

    const hook = jest.fn(() => {
      useEffect(effect1);
      useEffect(effect2, []);
    });

    const service = HookService.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(0);
    expect(effect1).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect2).toHaveBeenCalledTimes(0);
    expect(effect2).toHaveBeenCalledTimes(1);

    service.update([]);

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(2);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(1);
    expect(effect1).toHaveBeenCalledTimes(2);
    expect(cleanUpEffect2).toHaveBeenCalledTimes(0);
    expect(effect2).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up once as a result of stopping the hook service', async () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn(() => {
      useEffect(effect, []);
    });

    const service = HookService.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(0);
    expect(effect).toHaveBeenCalledTimes(1);

    service.stop();
    service.stop();

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up as a result of a synchronous error', async () => {
    const cleanUpEffect = jest.fn();

    const hook = jest.fn(() => {
      const [, setState] = useState('a');

      useEffect(() => {
        setState(() => {
          throw new Error('oops');
        });

        return cleanUpEffect;
      }, []);
    });

    expect(() => HookService.start(hook, [])).toThrow(new Error('oops'));

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up as a result of an asynchronous error', async () => {
    const cleanUpEffect = jest.fn();

    const hook = jest.fn(() => {
      const [, setState] = useState('a');

      useEffect(() => {
        queueMacrotasks(1).then(() =>
          setState(() => {
            throw new Error('oops');
          })
        );

        return cleanUpEffect;
      }, []);
    });

    const service = HookService.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(0);
    await expect(service.result.next).rejects.toEqual(new Error('oops'));

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up despite a previous error', async () => {
    const cleanUpEffect1 = jest.fn();

    const cleanUpEffect2 = jest.fn(() => {
      throw new Error('oops');
    });

    const cleanUpEffect3 = jest.fn();

    const hook = jest.fn(() => {
      useEffect(() => cleanUpEffect1, []);
      useEffect(() => cleanUpEffect2, []);
      useEffect(() => cleanUpEffect3, []);
    });

    const consoleError = jest.spyOn(console, 'error');
    const service = HookService.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(0);
    expect(cleanUpEffect2).toHaveBeenCalledTimes(0);
    expect(cleanUpEffect3).toHaveBeenCalledTimes(0);
    expect(consoleError).toHaveBeenCalledTimes(0);

    service.stop();

    await queueMacrotasks(10);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect2).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect3).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);

    expect(consoleError).toHaveBeenCalledWith(
      'Error while cleaning up effect.',
      new Error('oops')
    );
  });
});
