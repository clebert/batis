// @ts-check

const {deepStrictEqual, strictEqual} = require('assert');
const {Host} = require('./lib/cjs');
const {useEffect, useMemo, useState} = Host;

function useGreeting(salutation) {
  const [name, setName] = useState('John');

  useEffect(() => {
    if (name === 'John') {
      setName('Jane');
    }

    const timeoutId = setTimeout(() => setName('Johnny'));

    return () => clearTimeout(timeoutId);
  }, [name]);

  return useMemo(() => `${salutation}, ${name}!`, [salutation, name]);
}

const events = [];
const greeting = new Host(useGreeting, events.push.bind(events));

greeting.render(['Hello']);
greeting.render(['Hi']);
greeting.reset();
greeting.render(['Hey']);
greeting.render(['Yo']);

strictEqual(events.length, 7);

setTimeout(() => {
  strictEqual(events.length, 8);

  deepStrictEqual(events, [
    {type: 'value', value: 'Hello, John!', async: false, intermediate: true},
    {type: 'value', value: 'Hello, Jane!', async: false, intermediate: false},
    {type: 'value', value: 'Hi, Jane!', async: false, intermediate: false},
    {type: 'reset'},
    {type: 'value', value: 'Hey, John!', async: false, intermediate: true},
    {type: 'value', value: 'Hey, Jane!', async: false, intermediate: false},
    {type: 'value', value: 'Yo, Jane!', async: false, intermediate: false},
    {type: 'value', value: 'Yo, Johnny!', async: true, intermediate: false},
  ]);

  console.log('OK');
});
