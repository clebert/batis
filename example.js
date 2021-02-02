// @ts-check

const {deepStrictEqual, strictEqual} = require('assert');
const {Host} = require('./lib/cjs');

/**
 * @param {string} salutation
 */
function useGreeting(salutation) {
  const [name, setName] = Host.useState('John');

  Host.useEffect(() => {
    setName('Jane');

    setTimeout(() => {
      // Unlike React, Batis always applies all state changes, whether
      // synchronous or asynchronous, in batches. Therefore, Janie is not
      // greeted individually.
      setName('Janie');
      setName((prevName) => prevName + ' and Johnny');
    });
  }, []);

  return Host.useMemo(() => `${salutation} ${name}`, [salutation, name]);
}

const events = [];
const greeting = new Host(useGreeting, events.push.bind(events));

greeting.render('Hello');
greeting.render('Hi');
greeting.reset();
greeting.render('Hey');
greeting.render('Yo');

strictEqual(events.length, 5);

setTimeout(() => {
  strictEqual(events.length, 6);

  deepStrictEqual(events, [
    Host.createRenderingEvent('Hello Jane', 'Hello John'),
    Host.createRenderingEvent('Hi Jane'),
    Host.createResetEvent(),
    Host.createRenderingEvent('Hey Jane', 'Hey John'),
    Host.createRenderingEvent('Yo Jane'),
    Host.createRenderingEvent('Yo Janie and Johnny'),
  ]);

  console.log('OK');
});
