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

<img src="./eagle.jpg"/>

## Installation

```
npm install batis --save
```

## Rationale

I am a front-end developer. One of the problems in front-end development is
managing state and deriving the user interface from it, as well as handling side
effects that change the state again. I mainly work with
[React](https://reactjs.org) which allows me to solve the described problem via
functional reactive programming.

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

Even though Hooks are actually a constrained solution for modeling states in
actually stateless functional components, they have proven to be very elegant in
their design. In my opinion, they are particularly suitable for modeling
finite-state automata.

_Note: I have another [side project](https://github.com/clebert/loxia) (WIP)
where I am trying to shed more light on this design pattern._

I wanted to use this kind of reactive programming in other areas as well, such
as programming web workers or even JavaScript-controlled robots. Therefore I
wrote _Batis_...

## Usage example

```js
import {HookProcess, useEffect, useState} from 'batis';

function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    setTimeout(() => setName('Jane Doe'), 500);
  }, []);

  return `${salutation}, ${name}!`;
}

const {result, update} = HookProcess.start(useGreeting, ['Hello']);

console.log('Current:', result.value);

(async () => {
  for await (const value of result) {
    console.log('Iterator:', value);
  }
})();

console.log('Update:', update(['Welcome']));
```

```
Current: Hello, John Doe!
Update: Welcome, John Doe!
Iterator: Welcome, John Doe!
Iterator: Welcome, Jane Doe!
```

### Testing React/Preact Hooks

I wanted to create a library that could be used not only for new standalone
Hooks, but also for testing existing React/Preact Hooks. As long as the
React/Preact Hooks to be tested use only the subset of the Hooks implemented by
_Batis_, a test using [Jest](https://jestjs.io) can be set up as follows.

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
interface Result<THook extends Hook> extends AsyncIterable<ReturnType<THook>> {
  readonly value: ReturnType<THook>;
  readonly next: Promise<IteratorResult<ReturnType<THook>, undefined>>;
}
```

## Development

### Publishing a new release

```
npm run release patch
```

```
npm run release minor
```

```
npm run release major
```

After a new release has been created by pushing the tag, it must be published
via the GitHub UI. This triggers the final publication to npm.

---

Copyright (c) 2020, Clemens Akens. Released under the terms of the
[MIT License](https://github.com/clebert/batis/blob/master/LICENSE).
