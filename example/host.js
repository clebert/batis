// @ts-check

const {deepStrictEqual} = require('assert');
const {Host} = require('../lib/cjs');
const {useGreeting} = require('./use-greeting');

const events = [];
const greeting = new Host(useGreeting, events.push.bind(events));

greeting.render('Hello');
greeting.render('Hi');
greeting.reset();
greeting.render('Hey');
greeting.render('Yo');

deepStrictEqual(events, [
  Host.createRenderingEvent('Hello Jane', 'Hello John'),
  Host.createRenderingEvent('Hi Jane'),
  Host.createResetEvent(),
  Host.createRenderingEvent('Hey Jane', 'Hey John'),
  Host.createRenderingEvent('Yo Jane'),
]);

setTimeout(() => {
  deepStrictEqual(events.slice(5), [
    Host.createRenderingEvent('Yo Janie and Johnny'),
  ]);
}, 20);
