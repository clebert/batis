import {HookProcess, useEffect, useState} from '..';

describe('useEffect()', () => {
  test('an effect triggers only if one of its dependencies changes', () => {
    const effectWithoutDependencies = jest.fn();
    const effectWithEmptyDependencies = jest.fn();
    const effectWithDependencies = jest.fn();

    const hook = jest.fn((arg1: string, arg2: string) => {
      useEffect(effectWithoutDependencies);
      useEffect(effectWithEmptyDependencies, []);
      useEffect(effectWithDependencies, [arg1, arg2]);
    });

    const {update} = HookProcess.start(hook, ['a', 'x']);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(1);

    update(['a', 'x']);

    expect(hook).toHaveBeenCalledTimes(2);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(2);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(1);

    update(['a', 'y']);

    expect(hook).toHaveBeenCalledTimes(3);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(3);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(2);

    update(['b', 'y']);

    expect(hook).toHaveBeenCalledTimes(4);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(4);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(3);

    update(['b', 'y']);

    expect(hook).toHaveBeenCalledTimes(5);
    expect(effectWithoutDependencies).toHaveBeenCalledTimes(5);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(3);
  });

  test('an effect is first cleaned up before it triggers again', () => {
    const cleanUpEffect1 = jest.fn();
    const effect1 = jest.fn(() => cleanUpEffect1);

    const cleanUpEffect2 = jest.fn();
    const effect2 = jest.fn(() => cleanUpEffect2);

    const hook = jest.fn(() => {
      useEffect(effect1);
      useEffect(effect2, []);
    });

    const {update} = HookProcess.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(0);
    expect(effect1).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect2).toHaveBeenCalledTimes(0);
    expect(effect2).toHaveBeenCalledTimes(1);

    update([]);

    expect(hook).toHaveBeenCalledTimes(2);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(1);
    expect(effect1).toHaveBeenCalledTimes(2);
    expect(cleanUpEffect2).toHaveBeenCalledTimes(0);
    expect(effect2).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up once as a result of stopping the hook process', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn(() => {
      useEffect(effect, []);
    });

    const {stop} = HookProcess.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(0);
    expect(effect).toHaveBeenCalledTimes(1);

    stop();
    stop();

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up as a result of a synchronous error', () => {
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

    expect(() => HookProcess.start(hook, [])).toThrow(new Error('oops'));
    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up as a result of an asynchronous error', async () => {
    const cleanUpEffect = jest.fn();

    const hook = jest.fn(() => {
      const [, setState] = useState('a');

      useEffect(() => {
        setTimeout(() => {
          setState(() => {
            throw new Error('oops');
          });
        }, 1);

        return cleanUpEffect;
      }, []);
    });

    const {result} = HookProcess.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(0);

    await expect(result.getNextAsync()).rejects.toEqual(new Error('oops'));

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
  });

  test('an effect is cleaned up despite a previous error', () => {
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
    const {stop} = HookProcess.start(hook, []);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(0);
    expect(cleanUpEffect2).toHaveBeenCalledTimes(0);
    expect(cleanUpEffect3).toHaveBeenCalledTimes(0);
    expect(consoleError).toHaveBeenCalledTimes(0);

    stop();

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
