// @ts-check

const {HookProcess, useEffect, useState} = require('./lib/cjs');

function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    setTimeout(() => setName('Jane Doe'), 500);
  }, []);

  return `${salutation}, ${name}!`;
}

const {result, update} = HookProcess.start(useGreeting, ['Hello']);

console.log('Current:', result.value);

(async () => {
  for await (const value of result) {
    console.log('Iterator:', value);
  }
})();

console.log('Update:', update(['Welcome']));

/*
Current: Hello, John Doe!
Update: Welcome, John Doe!
Iterator: Welcome, John Doe!
Iterator: Welcome, Jane Doe!
*/
