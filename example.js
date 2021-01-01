// @ts-check

const {HookService, useEffect, useState} = require('./lib/cjs');

function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    setTimeout(() => setName('Jane Doe'), 500);
  }, []);

  return `${salutation}, ${name}!`;
}

const greeting = HookService.start(useGreeting, ['Hello']);

console.log('Current:', greeting.result.value);

(async () => {
  for await (const value of greeting.result) {
    console.log('Iterator:', value);
  }
})();

console.log('Update:', greeting.update(['Welcome']));

/*
Current: Hello, John Doe!
Update: Welcome, John Doe!
Iterator: Welcome, John Doe!
Iterator: Welcome, Jane Doe!
*/
