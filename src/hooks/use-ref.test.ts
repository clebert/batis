import {Host, useLayoutEffect, useRef} from '..';

describe('useRef()', () => {
  test('a ref object is stable and mutable', () => {
    const hook = jest.fn(() => {
      const ref1 = useRef('a');
      const ref2 = useRef(0);

      useLayoutEffect(() => {
        ref2.current = 1;
      }, []);

      return [ref1.current, ref2.current];
    });

    const host = new Host(hook);

    expect(host.run()).toEqual([['a', 0]]);
    expect(host.rerun()).toEqual([['a', 1]]);
    expect(host.rerun()).toEqual([['a', 1]]);
    expect(hook).toBeCalledTimes(3);
  });
});
