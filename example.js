// @ts-check

const {Host} = require('./lib/cjs');

const {
  Hooks: {useEffect, useMemo, useState},
} = Host;

/**
 * @param {string} salutation
 */
function useGreeting(salutation) {
  const [name, setName] = useState('John');

  useEffect(() => {
    setName('Jane');

    setTimeout(() => {
      // Unlike React, Batis always applies all state changes, whether
      // synchronous or asynchronous, in batches. Therefore, Janie is not
      // greeted individually.
      setName('Janie');
      setName((prevName) => `${prevName} and Johnny`);
    }, 10);
  }, []);

  return useMemo(() => `${salutation} ${name}`, [salutation, name]);
}

(async () => {
  const greeting = new Host(useGreeting);

  console.log(greeting.render('Hello')); // ['Hello Jane', 'Hello John']
  console.log(greeting.render('Bonjour')); // ['Bonjour Jane']

  greeting.reset();

  console.log(greeting.render('Hallo')); // ['Hallo Jane', 'Hallo John']
  console.log(greeting.render('Hola')); // ['Hola Jane']

  await greeting.nextAsyncStateChange;

  console.log(greeting.render('Ciao')); // ['Ciao Janie and Johnny']
})().catch((error) => console.error('Oops!', error));
