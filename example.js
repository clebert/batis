// @ts-check

const {Service} = require('./lib/cjs');
const {useEffect, useMemo, useState} = Service;

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

const greeting = new Service(useGreeting, console.log);

greeting.invoke(['Hello']);
greeting.invoke(['Welcome']);
greeting.reset();
greeting.invoke(['Hi']);
greeting.invoke(['Hey']);

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
