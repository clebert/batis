// @ts-check

const {
  Host,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} = require('./lib/cjs');

/**
 * @param {string} salutation
 */
function useGreeting(salutation) {
  const [name, setName] = useState('John');

  useLayoutEffect(() => {
    setName('Jane');
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      // Unlike React, Batis always applies all state changes, whether
      // synchronous or asynchronous, in batches. Therefore, Janie is not
      // greeted individually.
      setName('Janie');
      setName((prevName) => `${prevName} and Johnny`);
    }, 10);

    return () => clearTimeout(handle);
  }, []);

  return useMemo(() => `${salutation} ${name}`, [salutation, name]);
}

(async () => {
  const greeting = new Host(useGreeting);

  console.log(greeting.run('Hello')); // ['Hello Jane', 'Hello John']
  console.log(greeting.run('Bonjour')); // ['Bonjour Jane']

  greeting.reset();

  console.log(greeting.run('Hallo')); // ['Hallo Jane', 'Hallo John']
  console.log(greeting.run('Hola')); // ['Hola Jane']

  await greeting.nextAsyncStateChange;

  console.log(greeting.run('Ciao')); // ['Ciao Janie and Johnny']
})().catch((error) => console.error('Oops!', error));
