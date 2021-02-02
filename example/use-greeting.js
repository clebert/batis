// @ts-check

const {Host} = require('../lib/cjs');

/**
 * @param {string} salutation
 */
function useGreeting(salutation) {
  const [name, setName] = Host.useState('John');

  Host.useEffect(() => {
    setName('Jane');

    setTimeout(() => {
      // Unlike React, Batis always applies all state changes, whether
      // synchronous or asynchronous, in batches. Therefore, Janie is not
      // greeted individually.
      setName('Janie');
      setName((prevName) => `${prevName} and Johnny`);
    }, 10);
  }, []);

  return Host.useMemo(() => `${salutation} ${name}`, [salutation, name]);
}

exports.useGreeting = useGreeting;
