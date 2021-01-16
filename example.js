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
      // synchronous or asynchronous, in batches. Therefore, "Janie" will never
      // be greeted individually.
      setName('Janie');
      setName((prevName) => prevName + ' and Johnny');
    });
  }, []);

  return Host.useMemo(() => `${salutation}, ${name}!`, [salutation, name]);
}

const events = [];
const greeting = new Host(useGreeting, events.push.bind(events));

greeting.render('Hello');
greeting.render('Hi');
greeting.reset();
greeting.render('Hey');
greeting.render('Yo');

strictEqual(events.length, 7);

setTimeout(() => {
  strictEqual(events.length, 8);

  deepStrictEqual(events, [
    {type: 'rendering', result: 'Hello, John!', interim: true},
    {type: 'rendering', result: 'Hello, Jane!'},
    {type: 'rendering', result: 'Hi, Jane!'},
    {type: 'reset'},
    {type: 'rendering', result: 'Hey, John!', interim: true},
    {type: 'rendering', result: 'Hey, Jane!'},
    {type: 'rendering', result: 'Yo, Jane!'},
    {type: 'rendering', result: 'Yo, Janie and Johnny!', async: true},
  ]);

  console.log('OK');
});
