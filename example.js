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
    {type: 'rendering', result: 'Hello Jane', interimResults: ['Hello John']},
    {type: 'rendering', result: 'Hi Jane', interimResults: []},
    {type: 'reset'},
    {type: 'rendering', result: 'Hey Jane', interimResults: ['Hey John']},
    {type: 'rendering', result: 'Yo Jane', interimResults: []},
    {type: 'rendering', result: 'Yo Janie and Johnny', interimResults: []},
  ]);

  console.log('OK');
});
