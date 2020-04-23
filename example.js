// @ts-check

const {HookProcess, useEffect, useMemo, useState} = require('./lib/cjs');

function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    setTimeout(() => {
      setName('Jane Doe');
    }, 1000);
  }, []);

  return useMemo(() => `${salutation}, ${name}!`, [salutation, name]);
}

const {result, update} = HookProcess.start(useGreeting, ['Hello']);

console.log(result.getCurrent()); // Hello, John Doe!

console.log(update(['Welcome'])); // Welcome, John Doe!

result.getNextAsync().then(console.log); // Welcome, Jane Doe!
