import {Deferred, defer} from './defer';
import {AnyHook, Host, HostEvent} from './host';
import {macrotask} from './macrotask';

export type HostEventBatch<THook extends AnyHook> = readonly [
  HostEvent<THook>,
  ...HostEvent<THook>[]
];

/**
 * A convenient to use shell for the `Host` class.
 */
export class Subject<THook extends AnyHook> {
  readonly host: Host<THook>;

  #deferredEventBatch: Deferred<HostEventBatch<THook>> | undefined;
  #latestEvent: HostEvent<THook> | undefined;

  constructor(hook: THook) {
    let eventBatch: [HostEvent<THook>, ...HostEvent<THook>[]] | undefined;

    this.host = new Host(hook, (event) => {
      this.#latestEvent = event;

      if (eventBatch) {
        eventBatch.unshift(event);
      } else {
        eventBatch = [event];

        macrotask()
          .then(() => {
            if (this.#deferredEventBatch) {
              const deferredEventBatch = this.#deferredEventBatch;

              this.#deferredEventBatch = undefined;

              deferredEventBatch.resolve(eventBatch!);
            }

            eventBatch = undefined;
          })
          .catch();
      }
    });
  }

  get latestEvent(): HostEvent<THook> | undefined {
    return this.#latestEvent;
  }

  /**
   * The next event batch contains all events that have occurred in the current
   * macrotask or, if no events occur or have already occurred, from an upcoming
   * macrotask in which the next event will occur. The events are sorted in
   * descending order.
   */
  get nextEventBatch(): Promise<HostEventBatch<THook>> {
    if (!this.#deferredEventBatch) {
      this.#deferredEventBatch = defer();
    }

    return this.#deferredEventBatch.promise;
  }
}
