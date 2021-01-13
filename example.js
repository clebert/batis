// @ts-check

const {Host} = require('./lib/cjs');
const {useEffect, useMemo, useState} = Host;

function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    if (name === 'John Doe') {
      setName('Jane Doe');
    }

    const timeoutId = setTimeout(() => setName('Johnny Doe'));

    return () => clearTimeout(timeoutId);
  }, [name]);

  return useMemo(() => `${salutation}, ${name}!`, [salutation, name]);
}

const greeting = new Host(useGreeting, console.log);

greeting.render(['Hello']);
greeting.render(['Welcome']);
greeting.reset();
greeting.render(['Hi']);
greeting.render(['Hey']);

/*
{ type: 'value', value: 'Hello, John Doe!', async: false, intermediate: true }
{ type: 'value', value: 'Hello, Jane Doe!', async: false, intermediate: false }
{ type: 'value', value: 'Welcome, Jane Doe!', async: false, intermediate: false }
{ type: 'reset' }
{ type: 'value', value: 'Hi, John Doe!', async: false, intermediate: true }
{ type: 'value', value: 'Hi, Jane Doe!', async: false, intermediate: false }
{ type: 'value', value: 'Hey, Jane Doe!', async: false, intermediate: false }
{ type: 'value', value: 'Hey, Johnny Doe!', async: true, intermediate: false }
*/
