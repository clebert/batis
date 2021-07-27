# Batis

[![][ci-badge]][ci-link] [![][version-badge]][version-link]
[![][license-badge]][license-link] [![][types-badge]][types-link]
[![][size-badge]][size-link]

[ci-badge]: https://github.com/clebert/batis/workflows/CI/badge.svg
[ci-link]: https://github.com/clebert/batis
[version-badge]: https://badgen.net/npm/v/batis
[version-link]: https://www.npmjs.com/package/batis
[license-badge]: https://badgen.net/npm/license/batis
[license-link]: https://github.com/clebert/batis/blob/master/LICENSE
[types-badge]: https://badgen.net/npm/types/batis
[types-link]: https://github.com/clebert/batis
[size-badge]: https://badgen.net/bundlephobia/minzip/batis
[size-link]: https://bundlephobia.com/result?p=batis

General reactive JavaScript programming using the idea of
[React Hooks](https://reactjs.org/docs/hooks-intro.html).

## Contents

- [Introduction](#introduction)
- [Getting started](#getting-started)
  - [Installing Batis](#installing-batis)
  - [Using Batis](#using-batis)
  - [Testing React/Preact Hooks](#testing-reactpreact-hooks)
- [API reference](#api-reference)
  - [Implementation status](#implementation-status)

## Introduction

Even though React Hooks are actually a constrained solution for using state and
side effects in functional stateless components, they have proven to be very
elegant in their design. I wanted to use this kind of reactive programming in
areas other than web UI development, so I wrote Batis. It turns out that Batis
is also good for testing React/Preact Hooks.

Batis essentially revolves around the concept of a Hook and its host. A Hook is
comparable to a biological virus. A virus is dependent on a host cell because it
has no metabolism of its own. So, in a figurative sense, a host is also needed
to make use of a functional stateless Hook. A host manages the state and side
effects of a Hook and notifies a listener function of asynchronous state changes
that should result in a re-render.

## Getting started

### Installing Batis

```
npm install batis --save
```

### Using Batis

```js
import {Host} from 'batis';

const {Hooks} = Host;

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
```

```js
const greeting = new Host(useGreeting, () => {
  console.log(greeting.render('Ciao')); // 5: ['Ciao Janie and Johnny']
});

console.log(greeting.render('Hello')); // 1: ['Hello Jane', 'Hello John']
console.log(greeting.render('Bonjour')); // 2: ['Bonjour Jane']

greeting.reset();

console.log(greeting.render('Hallo')); // 3: ['Hallo Jane', 'Hallo John']
console.log(greeting.render('Hola')); // 4: ['Hola Jane']
```

### Testing React/Preact Hooks

You can use Batis to test your React/Preact Hooks, as long as the Hooks you are
testing only use the subset of React Hooks implemented by Batis. A test with
[Jest](https://jestjs.io) can be set up as follows:

```js
import {Host} from 'batis';
```

```js
import * as React from 'react';

jest.mock('react', () => ({...React, ...Host.Hooks}));
```

```js
jest.mock('preact/hooks', () => Host.Hooks);
```

## API reference

The [React Hooks API reference](https://reactjs.org/docs/hooks-reference.html)
also applies to this library and should be consulted.

### Implementation status

Below you can see the subset of React Hooks implemented by Batis:

| React Hook                                   | Status                        |
| -------------------------------------------- | ----------------------------- |
| [`useState`][usestate]                       | ✅Implemented                 |
| [`useEffect`][useeffect]                     | ✅Implemented                 |
| [`useMemo`][usememo]                         | ✅Implemented                 |
| [`useCallback`][usecallback]                 | ✅Implemented                 |
| [`useRef`][useref]                           | ✅Implemented                 |
| [`useReducer`][usereducer]                   | ✅Implemented                 |
| [`useContext`][usecontext]                   | ❌Not planned                 |
| [`useImperativeHandle`][useimperativehandle] | ❌Not planned                 |
| [`useLayoutEffect`][uselayouteffect]         | ❌Not planned, see note below |
| [`useDebugValue`][usedebugvalue]             | ❌Not planned                 |

**Note:** React executes effects declared using the `useEffect` Hook as a
macrotask so that they do not block browser rendering. The `useLayoutEffect`
Hook acts as the synchronous alternative to allow potential DOM changes before
browser rendering. In Batis, effects are executed always synchronously, so the
special `useLayoutEffect` Hook is not necessary. For compatibility reasons,
`useEffect` could be used as an alias for `useLayoutEffect`.

[usestate]: https://reactjs.org/docs/hooks-reference.html#usestate
[useeffect]: https://reactjs.org/docs/hooks-reference.html#useeffect
[usecontext]: https://reactjs.org/docs/hooks-reference.html#usecontext
[usereducer]: https://reactjs.org/docs/hooks-reference.html#usereducer
[usecallback]: https://reactjs.org/docs/hooks-reference.html#usecallback
[usememo]: https://reactjs.org/docs/hooks-reference.html#usememo
[useref]: https://reactjs.org/docs/hooks-reference.html#useref
[useimperativehandle]:
  https://reactjs.org/docs/hooks-reference.html#useimperativehandle
[uselayouteffect]: https://reactjs.org/docs/hooks-reference.html#uselayouteffect
[usedebugvalue]: https://reactjs.org/docs/hooks-reference.html#usedebugvalue

---

Copyright (c) 2020-2021, Clemens Akens. Released under the terms of the
[MIT License](https://github.com/clebert/batis/blob/master/LICENSE).
