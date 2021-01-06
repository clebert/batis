// @ts-check

const {Service, useEffect, useState} = require('./lib/cjs');

function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    setTimeout(() => setName('Jane Doe'), 500);
  }, []);

  return `${salutation}, ${name}!`;
}

const greeting = new Service(useGreeting, ['Hello'], console.log);

greeting.update(['Welcome']);

/*
{ type: 'value', value: 'Hello, John Doe!' }
{ type: 'value', value: 'Welcome, John Doe!' }
{ type: 'value', value: 'Welcome, Jane Doe!' }
*/
