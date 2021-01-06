import {AnyHook, Service, ServiceEvent, ServiceListener, useMemo} from '..';

describe('useMemo()', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('a memoized value is only re-computed if one of its dependencies changes', () => {
    const createValue1 = jest.fn();
    const createValue2 = jest.fn();

    const hook = jest.fn((arg1: string, arg2: string) => {
      useMemo(createValue1, []);
      useMemo(createValue2, [arg1, arg2]);
    });

    const service = new Service(hook, ['a', 'x'], listener);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(1);

    service.update(['a', 'x']);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(1);

    service.update(['a', 'y']);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(2);

    service.update(['b', 'y']);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);

    service.update(['b', 'y']);

    expect(createValue1).toHaveBeenCalledTimes(1);
    expect(createValue2).toHaveBeenCalledTimes(3);

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });
});
