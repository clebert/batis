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
    // Unlike React, Batis always applies all state changes, whether
    // synchronous or asynchronous, in batches. Therefore, Janie is not
    // greeted individually.
    setName('Janie');
    setName((prevName) => `${prevName} and Johnny`);

    const handle = setTimeout(() => setName('World'), 0);

    return () => clearTimeout(handle);
  }, []);

  return useMemo(() => `${salutation} ${name}!`, [salutation, name]);
}

(async () => {
  const greeting = new Host(useGreeting);

  console.log(greeting.run('Hi'));
  console.log(greeting.rerun());

  greeting.reset();

  console.log(greeting.run('Bye'));
  console.log(greeting.rerun());

  await greeting.nextAsyncStateChange;

  console.log(greeting.run('Hello'));
})().catch((error) => console.error('Oops!', error));
