import {Service, useEffect, useRef, useState} from '.';
import {AnyHook, ServiceEvent, ServiceListener} from './service';

describe('Service', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('making fewer hook calls causes an error', () => {
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

    new Service(hook, [], listener);

    const error = new Error('The number of hook calls must not change.');

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'error', error},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('making more hook calls causes an error', () => {
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

    new Service(hook, [], listener);

    const error = new Error('The number of hook calls must not change.');

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'error', error},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('changing the order of hook calls causes an error', () => {
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

    new Service(hook, [], listener);

    const error = new Error('The order of hook calls must not change.');

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'error', error},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing hook dependencies causes an error', () => {
    const hook = jest.fn(() => {
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

    new Service(hook, [], listener);

    const error = new Error(
      'The existence of hook dependencies must not change.'
    );

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'error', error},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding hook dependencies causes an error', () => {
    const hook = jest.fn(() => {
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

    new Service(hook, [], listener);

    const error = new Error(
      'The existence of hook dependencies must not change.'
    );

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'error', error},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('removing a single hook dependency causes an error', () => {
    const hook = jest.fn(() => {
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

    new Service(hook, [], listener);

    const error = new Error(
      'The order and number of hook dependencies must not change.'
    );

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'error', error},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('adding a single hook dependency causes an error', () => {
    const hook = jest.fn(() => {
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

    new Service(hook, [], listener);

    const error = new Error(
      'The order and number of hook dependencies must not change.'
    );

    expect(events).toEqual([
      {type: 'value', value: undefined},
      {type: 'error', error},
    ]);

    expect(hook).toHaveBeenCalledTimes(2);
  });

  test('invoking a hook method of an inactive service causes an error', () => {
    const hook = jest.fn();
    const service = new Service(hook, [], listener);

    expect(() => service.useEffect(jest.fn())).toThrow(
      new Error('Please use the separately exported useEffect() function.')
    );

    expect(() => service.useMemo(jest.fn(), [])).toThrow(
      new Error('Please use the separately exported useMemo() function.')
    );

    expect(() => service.useState(jest.fn())).toThrow(
      new Error('Please use the separately exported useState() function.')
    );

    expect(events).toEqual([{type: 'value', value: undefined}]);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('invoking a hook outside the body of an active service causes an error', () => {
    expect(() => useRef('a')).toThrow(
      new Error(
        'Hooks may only be invoked within the body of an active service.'
      )
    );
  });
});
