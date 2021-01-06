import {AnyHook, Service, ServiceEvent, ServiceListener, useEffect} from '..';

const error = new Error('Oops!');

describe('useEffect()', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('an effect triggers only if one of its dependencies changes', () => {
    const effectWithoutDependencies = jest.fn();
    const effectWithEmptyDependencies = jest.fn();
    const effectWithDependencies = jest.fn();

    const hook = jest.fn((arg1: string, arg2: string) => {
      useEffect(effectWithoutDependencies);
      useEffect(effectWithEmptyDependencies, []);
      useEffect(effectWithDependencies, [arg1, arg2]);

      return arg1 + arg2;
    });

    const service = new Service(hook, ['a', 'x'], listener);

    expect(effectWithoutDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(1);

    service.update(['a', 'x']);

    expect(effectWithoutDependencies).toHaveBeenCalledTimes(2);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(1);

    service.update(['a', 'y']);

    expect(effectWithoutDependencies).toHaveBeenCalledTimes(3);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(2);

    service.update(['b', 'y']);

    expect(effectWithoutDependencies).toHaveBeenCalledTimes(4);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(3);

    service.update(['b', 'y']);

    expect(effectWithoutDependencies).toHaveBeenCalledTimes(5);
    expect(effectWithEmptyDependencies).toHaveBeenCalledTimes(1);
    expect(effectWithDependencies).toHaveBeenCalledTimes(3);

    expect(events).toEqual([
      {type: 'value', value: 'ax'},
      {type: 'value', value: 'ax'},
      {type: 'value', value: 'ay'},
      {type: 'value', value: 'by'},
      {type: 'value', value: 'by'},
    ]);

    expect(hook).toHaveBeenCalledTimes(5);
  });

  test('an effect is first disposed before it triggers again', () => {
    const disposeEffect1 = jest.fn();
    const effect1 = jest.fn(() => disposeEffect1);
    const disposeEffect2 = jest.fn();
    const effect2 = jest.fn(() => disposeEffect2);

    const hook = jest.fn(() => {
      useEffect(effect1);
      useEffect(effect2, []);
    });

    const service = new Service(hook, [], listener);

    expect(disposeEffect1).toHaveBeenCalledTimes(0);
    expect(effect1).toHaveBeenCalledTimes(1);
    expect(disposeEffect2).toHaveBeenCalledTimes(0);
    expect(effect2).toHaveBeenCalledTimes(1);

    service.update([]);

    expect(disposeEffect1).toHaveBeenCalledTimes(1);
    expect(effect1).toHaveBeenCalledTimes(2);
    expect(disposeEffect2).toHaveBeenCalledTimes(0);
    expect(effect2).toHaveBeenCalledTimes(1);

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'value', value: undefined},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('an effect is disposed once', () => {
    const disposeEffect = jest.fn();
    const effect = jest.fn(() => disposeEffect);

    const hook = jest.fn(() => {
      useEffect(effect, []);
    });

    const service = new Service(hook, [], listener);

    expect(disposeEffect).toHaveBeenCalledTimes(0);
    expect(effect).toHaveBeenCalledTimes(1);

    service.disposeEffects();

    expect(disposeEffect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(1);
    expect(events).toEqual([{type: 'value', value: undefined}]);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('an effect is disposed despite a previous error', () => {
    const disposeEffect1 = jest.fn();

    const disposeEffect2 = jest.fn(() => {
      throw error;
    });

    const disposeEffect3 = jest.fn();

    const hook = jest.fn(() => {
      useEffect(() => disposeEffect1, []);
      useEffect(() => disposeEffect2, []);
      useEffect(() => disposeEffect3, []);
    });

    const consoleError = jest.spyOn(console, 'error');

    const service = new Service(hook, [], listener);

    expect(disposeEffect1).toHaveBeenCalledTimes(0);
    expect(disposeEffect2).toHaveBeenCalledTimes(0);
    expect(disposeEffect3).toHaveBeenCalledTimes(0);
    expect(consoleError).toHaveBeenCalledTimes(0);

    service.disposeEffects();

    expect(disposeEffect1).toHaveBeenCalledTimes(1);
    expect(disposeEffect2).toHaveBeenCalledTimes(1);
    expect(disposeEffect3).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to dispose an effect.',
      error
    );

    expect(events).toEqual([{type: 'value', value: undefined}]);
    expect(hook).toHaveBeenCalledTimes(1);
  });
});
