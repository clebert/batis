import {Host, useLayoutEffect, useState} from '..';

describe('useLayoutEffect()', () => {
  test('a layout effect triggers if one of its dependencies changes', () => {
    const cleanUpEffect1 = jest.fn(() => {
      throw new Error('oops');
    });

    const cleanUpEffect3 = jest.fn();
    const effect1 = jest.fn(() => cleanUpEffect1);
    const effect2 = jest.fn();
    const effect3 = jest.fn(() => cleanUpEffect3);

    const hook = jest.fn((arg1: string, arg2: number) => {
      useLayoutEffect(effect1);
      useLayoutEffect(effect2, []);
      useLayoutEffect(effect3, [arg1, arg2]);

      return [arg1, arg2];
    });

    const consoleError = jest.spyOn(console, 'error');
    const host = new Host(hook);

    expect(host.run('a', 0)).toEqual([['a', 0]]);
    expect(host.rerun()).toEqual([['a', 0]]);
    expect(host.run('a', 1)).toEqual([['a', 1]]);
    expect(host.run('b', 1)).toEqual([['b', 1]]);
    expect(host.rerun()).toEqual([['b', 1]]);
    expect(cleanUpEffect1).toHaveBeenCalledTimes(4);
    expect(cleanUpEffect3).toHaveBeenCalledTimes(2);
    expect(effect1).toHaveBeenCalledTimes(5);
    expect(effect2).toHaveBeenCalledTimes(1);
    expect(effect3).toHaveBeenCalledTimes(3);

    expect(consoleError).toHaveBeenCalledWith(
      'An effect could not be disposed.',
      new Error('oops')
    );

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('a layout effect retriggers after a reset', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn(() => {
      useLayoutEffect(effect, []);
    });

    const host = new Host(hook);

    expect(host.run()).toEqual([undefined]);
    expect(host.rerun()).toEqual([undefined]);

    host.reset();

    expect(host.rerun()).toEqual([undefined]);
    expect(host.rerun()).toEqual([undefined]);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a layout effect retriggers after a synchronous error', () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn((arg: string) => {
      useLayoutEffect(effect, []);

      if (arg === 'b') {
        throw new Error(arg);
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run('a')).toEqual(['a']);
    expect(() => host.run('b')).toThrow(new Error('b'));
    expect(host.run('c')).toEqual(['c']);
    expect(host.run('d')).toEqual(['d']);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(4);
  });

  test('a layout effect retriggers after an asynchronous error', async () => {
    const cleanUpEffect = jest.fn();
    const effect = jest.fn(() => cleanUpEffect);

    const hook = jest.fn((arg: string) => {
      const [, setState] = useState(arg);

      useLayoutEffect(effect, []);

      if (arg === 'b') {
        setTimeout(
          () =>
            setState(() => {
              throw new Error(arg);
            }),
          0
        );
      }

      return arg;
    });

    const host = new Host(hook);

    expect(host.run('a')).toEqual(['a']);
    expect(host.run('b')).toEqual(['b']);

    await host.nextAsyncStateChange;

    expect(() => host.run('c')).toThrow(new Error('b'));
    expect(host.run('d')).toEqual(['d']);
    expect(cleanUpEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledTimes(3);
  });

  test('a failed triggering of a layout effect causes an error', () => {
    const hook = jest.fn((arg: string) => {
      useLayoutEffect(() => {
        throw new Error(arg);
      }, []);

      return arg;
    });

    const host = new Host(hook);

    expect(() => host.run('a')).toThrow(new Error('a'));
    expect(hook).toHaveBeenCalledTimes(1);
  });
});
