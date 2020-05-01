import {HookProcess, useMemo} from '..';
import {queueMacrotasks} from '../internals/queue-macrotasks';

describe('useMemo()', () => {
  test('a memoized value is only re-computed if one of its dependencies changes', async () => {
    const createValue1 = jest.fn();
    const createValue2 = jest.fn();

    const hook = jest.fn((arg1: string, arg2: string) => {
      useMemo(createValue1, []);
      useMemo(createValue2, [arg1, arg2]);
    });

    const {update} = HookProcess.start(hook, ['a', 'x']);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(1);

    update(['a', 'x']);

    expect(hook).toHaveBeenCalledTimes(2);
    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(1);

    update(['a', 'y']);

    expect(hook).toHaveBeenCalledTimes(3);
    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(2);

    update(['b', 'y']);

    expect(hook).toHaveBeenCalledTimes(4);
    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);

    update(['b', 'y']);

    await queueMacrotasks(10);
    expect(hook).toHaveBeenCalledTimes(5);
    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);
  });
});
