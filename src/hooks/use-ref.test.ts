import {
  AnyHook,
  Service,
  ServiceEvent,
  ServiceListener,
  useEffect,
  useRef,
  useState,
} from '..';
import {queueMacrotask} from '../internals/queue-macrotask';

describe('useRef()', () => {
  let events: ServiceEvent<AnyHook>[];
  let listener: ServiceListener<AnyHook>;

  beforeEach(() => {
    events = [];
    listener = events.push.bind(events);
  });

  test('a ref value is persisted over several invocations of the hook', () => {
    const hook = jest.fn(() => {
      const ref1 = useRef('a');
      const ref2 = useRef('x');

      useEffect(() => {
        ref2.current = 'y';
      }, []);

      return ref1.current + ref2.current;
    });

    const service = new Service(hook, [], listener);

    service.update([]);
    service.update([]);
    service.update([]);

    expect(events).toEqual([
      {type: 'value', value: 'ax'},
      {type: 'value', value: 'ay'},
      {type: 'value', value: 'ay'},
      {type: 'value', value: 'ay'},
    ]);

    expect(hook).toBeCalledTimes(4);
  });

  test('changing a ref value does not invoke the hook again', async () => {
    const hook = jest.fn(() => {
      const [state, setState] = useState('a');
      const ref = useRef('x');

      useEffect(() => {
        ref.current = 'y';

        queueMacrotask(() => setState('b')).catch();
      }, []);

      return state + ref.current;
    });

    new Service(hook, [], listener);

    await queueMacrotask();

    expect(events).toEqual([
      {type: 'value', value: 'ax'},
      {type: 'value', value: 'by'},
    ]);

    expect(hook).toBeCalledTimes(2);
  });
});
