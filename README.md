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

A JavaScript library for reactive programming using React-like Hooks.

## Installation

Using `yarn`:

```
yarn add batis
```

Using `npm`:

```
npm install batis --save
```

## Motivation

I am a frontend developer. One of the biggest problems in frontend development
is managing state and deriving the UI from it as well as handling side effects
that change the state. I mainly work with [React](https://reactjs.org) which
allows me to solve the described problem via functional reactive programming.

Reactive programming is generally understood to be programming using
asynchronous data streams, which form the conceptual basis for libraries like
[RxJS](https://github.com/ReactiveX/rxjs),
[xstream](https://github.com/staltz/xstream), or as a counterpart to React
[Cycle.js](https://cycle.js.org). In React, however, reactive programming is not
about dealing with streams, but with so-called
[Hooks](https://reactjs.org/docs/hooks-intro.html#motivation).

A functional component is rendered, whereby side effects are declared based on
its current state (using the
[`useEffect`](https://reactjs.org/docs/hooks-overview.html#effect-hook) Hook),
which in turn can lead to state changes (using the
[`useState`](https://reactjs.org/docs/hooks-overview.html#state-hook) Hook) and
thus to further renderings.

In contrast to the concept of streams, the concept of Hooks was something I
liked from the beginning. I find them very intuitive to read and write. I wanted
to use this kind of reactive programming in other areas as well, for example for
programming web workers, AWS Lambda handlers, or even JavaScript-controlled
robots. Therefore I wrote _Batis_...

Actually, I wrote [Ironhook](https://github.com/clebert/ironhook) first. But now
I don't like the name anymore, nor the API.

## Usage example

```js
import {HookProcess, useEffect, useMemo, useState} from 'batis';
```

```js
function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    setTimeout(() => {
      setName('Jane Doe');
    }, 1000);
  }, []);

  return useMemo(() => `${salutation}, ${name}!`, [salutation, name]);
}
```

```js
const {result, update} = HookProcess.start(useGreeting, ['Hello']);
```

```js
console.log(result.getCurrent()); // Hello, John Doe!
```

```js
console.log(update(['Welcome'])); // Welcome, John Doe!
```

```js
result.getNextAsync().then(console.log); // Welcome, Jane Doe!
```

### Testing React/Preact Hooks

The API of _Batis_ is strongly influenced by
[React Testing Library](https://github.com/testing-library/react-testing-library).
I wanted to create a tool that was not only suitable for standalone use of Hooks
but also for testing existing React/Preact Hooks. As long as the React/Preact
Hooks to be tested use only the subset of the Hooks implemented by _Batis_, a
test using [Jest](https://jestjs.io) can be set up as follows.

Testing React Hooks:

```js
jest.mock('react', () => ({
  ...require('react'),
  ...require('batis'),
}));
```

Testing Preact Hooks:

```js
jest.mock('preact/hooks', () => require('batis'));
```

## API reference

The [React Hooks API reference](https://reactjs.org/docs/hooks-reference.html)
also applies to this library and should be consulted.

### Implementation status

Below you can see the implementation status of the built-in subset of React
Hooks:

| Hook                                         | Status        |
| -------------------------------------------- | ------------- |
| [`useState`][usestate]                       | ✅Implemented |
| [`useEffect`][useeffect]                     | ✅Implemented |
| [`useReducer`][usereducer]                   | ✅Implemented |
| [`useCallback`][usecallback]                 | ✅Implemented |
| [`useMemo`][usememo]                         | ✅Implemented |
| [`useRef`][useref]                           | ✅Implemented |
| [`useContext`][usecontext]                   | ❌Not planned |
| [`useImperativeHandle`][useimperativehandle] | ❌Not planned |
| [`useLayoutEffect`][uselayouteffect]         | ❌Not planned |
| [`useDebugValue`][usedebugvalue]             | ❌Not planned |

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

### Type definitions

```ts
class HookProcess<THook extends Hook> {
  static start<THook extends Hook>(
    hook: THook,
    args: Parameters<THook>
  ): HookProcess<THook>;

  get result(): Result<THook>;

  readonly isStopped: () => boolean;
  readonly stop: () => void;
  readonly update: (args: Parameters<THook>) => ReturnType<THook>;
}
```

```ts
type Hook = (...args: any[]) => any;
```

```ts
interface Result<THook extends Hook> {
  getCurrent(): ReturnType<THook>;
  getNextAsync(): Promise<ReturnType<THook>>;
}
```

## Development

### Publishing a new release

```
yarn release patch
```

```
yarn release minor
```

```
yarn release major
```

After a new release has been created by pushing the tag, it must be published
via the GitHub UI. This triggers the final publication to npm.

---

Copyright (c) 2020, Clemens Akens. Released under the terms of the
[MIT License](https://github.com/clebert/batis/blob/master/LICENSE).
