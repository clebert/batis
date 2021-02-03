// @ts-check

const {Host} = require('../lib/cjs');
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

exports.useGreeting = useGreeting;
