// @ts-check

const {deepStrictEqual} = require('assert');
const {Host, Subject} = require('../lib/cjs');
const {useGreeting} = require('./use-greeting');

const greeting = new Subject(useGreeting);

greeting.host.render('Hello');
greeting.host.render('Hi');
greeting.host.reset();
greeting.host.render('Hey');
greeting.host.render('Yo');

(async () => {
  deepStrictEqual(await greeting.nextEventBatch, [
    Host.createRenderingEvent('Yo Jane'),
    Host.createRenderingEvent('Hey Jane', 'Hey John'),
    Host.createResetEvent(),
    Host.createRenderingEvent('Hi Jane'),
    Host.createRenderingEvent('Hello Jane', 'Hello John'),
  ]);

  deepStrictEqual(await greeting.nextEventBatch, [
    Host.createRenderingEvent('Yo Janie and Johnny'),
  ]);
})();
