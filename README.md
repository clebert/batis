# batis

> General reactive JavaScript programming using the idea of
> [React Hooks](https://reactjs.org/docs/hooks-intro.html).

## Introduction

Even though React Hooks are actually a constrained solution for using state and
managing side effects in functional stateless components, they have proven to be
very elegant in their design. I wanted to use this kind of reactive programming
in areas other than React development, so I wrote Batis.

Batis essentially revolves around the concept of a Hook and its host. Running a
functional stateless Hook requires a host that manages the state and effects and
reports asynchronous state changes that should result in a new run.

## Installation

```
npm install batis
```

## Usage

```js
import {Host, useEffect, useLayoutEffect, useMemo, useState} from 'batis';
```

```js
function useGreeting(salutation) {
  const [name, setName] = useState(`John`);

  useLayoutEffect(() => {
    setName(`Jane`);
  }, []);

  useEffect(() => {
    // Unlike React, Batis always applies all state changes, whether
    // synchronous or asynchronous, in batches. Therefore, Janie is not
    // greeted individually.
    setName(`Janie`);
    setName((prevName) => `${prevName} and Johnny`);

    const handle = setTimeout(() => setName(`World`), 0);

    return () => clearTimeout(handle);
  }, []);

  return useMemo(() => `${salutation} ${name}!`, [salutation, name]);
}
```

```js
const greeting = new Host(useGreeting);

console.log(greeting.run(`Hi`));
console.log(greeting.rerun());

greeting.reset();

console.log(greeting.run(`Bye`));
console.log(greeting.rerun());

await greeting.nextAsyncStateChange;

console.log(greeting.run(`Hello`));
```

```
[ 'Hi Jane!', 'Hi John!' ]
[ 'Hi Janie and Johnny!' ]
[ 'Bye Jane!', 'Bye John!' ]
[ 'Bye Janie and Johnny!' ]
[ 'Hello World!' ]
```

## API reference

The [React Hooks API reference](https://reactjs.org/docs/hooks-reference.html)
also applies to this library and should be consulted.

### Implementation status

Below you can see the subset of React Hooks implemented by Batis:

| React Hook                                   | Status            |
| -------------------------------------------- | ----------------- |
| [`useState`][usestate]                       | ✅Implemented     |
| [`useEffect`][useeffect]                     | ✅Implemented     |
| [`useLayoutEffect`][uselayouteffect]         | ✅Implemented     |
| [`useMemo`][usememo]                         | ✅Implemented     |
| [`useCallback`][usecallback]                 | ✅Implemented     |
| [`useRef`][useref]                           | ✅Implemented     |
| [`useReducer`][usereducer]                   | ✅Implemented     |
| [`useContext`][usecontext]                   | ❌Not implemented |
| [`useImperativeHandle`][useimperativehandle] | ❌Not implemented |
| [`useDebugValue`][usedebugvalue]             | ❌Not implemented |

[usestate]: https://reactjs.org/docs/hooks-reference.html#usestate
[useeffect]: https://reactjs.org/docs/hooks-reference.html#useeffect
[uselayouteffect]: https://reactjs.org/docs/hooks-reference.html#uselayouteffect
[usememo]: https://reactjs.org/docs/hooks-reference.html#usememo
[usecallback]: https://reactjs.org/docs/hooks-reference.html#usecallback
[useref]: https://reactjs.org/docs/hooks-reference.html#useref
[usereducer]: https://reactjs.org/docs/hooks-reference.html#usereducer
[usecontext]: https://reactjs.org/docs/hooks-reference.html#usecontext
[useimperativehandle]:
  https://reactjs.org/docs/hooks-reference.html#useimperativehandle
[usedebugvalue]: https://reactjs.org/docs/hooks-reference.html#usedebugvalue
