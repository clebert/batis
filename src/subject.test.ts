import {Host} from './host';
import {macrotask} from './macrotask';
import {microtask} from './microtask';
import {Subject} from './subject';

describe('Subject', () => {
  test('nextEventBatch contains all events of the current macrotask', async () => {
    const subject = new Subject((arg: string) => arg);

    subject.host.render('a');

    const nextEventBatch = subject.nextEventBatch;

    subject.host.render('b');
    subject.host.render('c');

    await microtask();

    subject.host.render('d');

    await macrotask();

    subject.host.render('e');

    expect(await nextEventBatch).toEqual([
      Host.createRenderingEvent('d'),
      Host.createRenderingEvent('c'),
      Host.createRenderingEvent('b'),
      Host.createRenderingEvent('a'),
    ]);
  });

  test('nextEventBatch contains all events from an upcoming macrotask', async () => {
    const subject = new Subject((arg: string) => arg);
    const nextEventBatch = subject.nextEventBatch;

    await macrotask();

    subject.host.render('a');

    await microtask();

    subject.host.render('b');

    await macrotask();

    subject.host.render('c');

    expect(await nextEventBatch).toEqual([
      Host.createRenderingEvent('b'),
      Host.createRenderingEvent('a'),
    ]);
  });

  test('the identity of nextEventBatch is stable during a macrotask', async () => {
    const subject = new Subject((arg: string) => arg);

    subject.host.render('a');

    const nextEventBatch1 = subject.nextEventBatch;

    await microtask();

    subject.host.render('b');

    expect(subject.nextEventBatch).toBe(nextEventBatch1);

    await macrotask();

    const nextEventBatch2 = subject.nextEventBatch;

    expect(nextEventBatch2).not.toBe(nextEventBatch1);

    subject.host.render('c');

    expect(await nextEventBatch1).toEqual([
      Host.createRenderingEvent('b'),
      Host.createRenderingEvent('a'),
    ]);

    expect(await nextEventBatch2).toEqual([Host.createRenderingEvent('c')]);
  });

  test('latestEvent always reflects the latest event', async () => {
    const subject = new Subject((arg: string) => arg);

    expect(subject.latestEvent).toBe(undefined);

    subject.host.render('a');

    expect(subject.latestEvent).toEqual(Host.createRenderingEvent('a'));

    subject.host.render('b');

    expect(subject.latestEvent).toEqual(Host.createRenderingEvent('b'));

    await microtask();

    expect(subject.latestEvent).toEqual(Host.createRenderingEvent('b'));

    subject.host.render('c');

    expect(subject.latestEvent).toEqual(Host.createRenderingEvent('c'));

    await macrotask();

    expect(subject.latestEvent).toEqual(Host.createRenderingEvent('c'));

    subject.host.render('d');

    expect(subject.latestEvent).toEqual(Host.createRenderingEvent('d'));

    subject.host.reset();

    expect(subject.latestEvent).toEqual(Host.createResetEvent());

    expect(await subject.nextEventBatch).toEqual([
      Host.createResetEvent(),
      Host.createRenderingEvent('d'),
    ]);
  });
});
