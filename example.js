// @ts-check

const {Host} = require('./lib/cjs');

const {Hooks} = Host;

/**
 * @param {string} salutation
 */
function useGreeting(salutation) {
  const [name, setName] = Hooks.useState('John');

  Hooks.useEffect(() => {
    setName('Jane');

    setTimeout(() => {
      // Unlike React, Batis always applies all state changes, whether
      // synchronous or asynchronous, in batches. Therefore, Janie is not
      // greeted individually.
      setName('Janie');
      setName((prevName) => `${prevName} and Johnny`);
    }, 10);
  }, []);

  return Hooks.useMemo(() => `${salutation} ${name}`, [salutation, name]);
}

const greeting = new Host(useGreeting, {
  onAsyncStateChange(error) {
    if (!error) {
      console.log(greeting.render('Ciao')); // 5: ['Ciao Janie and Johnny']
    }
  },
});

console.log(greeting.render('Hello')); // 1: ['Hello Jane', 'Hello John']
console.log(greeting.render('Bonjour')); // 2: ['Bonjour Jane']

greeting.reset();

console.log(greeting.render('Hallo')); // 3: ['Hallo Jane', 'Hallo John']
console.log(greeting.render('Hola')); // 4: ['Hola Jane']
