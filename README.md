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

<details>
  <summary>Read more</summary>

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

Even though Hooks are actually a constrained solution for managing state in
actually stateless functional components, they have proven to be very elegant in
their design. In my opinion, they are particularly suitable for modeling
finite-state automata.

I wanted to use this kind of reactive programming in other areas as well, such
as programming web workers or even JavaScript-controlled robots. Therefore I
wrote Batis...

</details>

## Usage example

```js
import {Service} from 'batis';

const {useEffect, useMemo, useState} = Service;

function useGreeting(salutation) {
  const [name, setName] = useState('John Doe');

  useEffect(() => {
    if (name === 'John Doe') {
      setName('Jane Doe');
    }

    const timeoutId = setTimeout(() => setName('Johnny Doe'));

    return () => clearTimeout(timeoutId);
  }, [name]);

  return useMemo(() => `${salutation}, ${name}!`, [salutation, name]);
}

const greeting = new Service(useGreeting, console.log);

greeting.invoke(['Hello']);
greeting.invoke(['Welcome']);
greeting.reset();
greeting.invoke(['Hi']);
greeting.invoke(['Hey']);
```

```
{ type: 'value', value: 'Hello, John Doe!', async: false, intermediate: true }
{ type: 'value', value: 'Hello, Jane Doe!', async: false, intermediate: false }
{ type: 'value', value: 'Welcome, Jane Doe!', async: false, intermediate: false }
{ type: 'reset' }
{ type: 'value', value: 'Hi, John Doe!', async: false, intermediate: true }
{ type: 'value', value: 'Hi, Jane Doe!', async: false, intermediate: false }
{ type: 'value', value: 'Hey, Jane Doe!', async: false, intermediate: false }
{ type: 'value', value: 'Hey, Johnny Doe!', async: true, intermediate: false }
```

### Testing React/Preact Hooks

You can use Batis to test your React/Preact implemented Hooks, as long as the
Hooks you are testing only use the subset of React Hooks implemented by Batis. A
test with [Jest](https://jestjs.io) can be set up as follows:

<details>
  <summary>Show code</summary>

```js
import {Service} from 'batis';
```

```js
import * as React from 'react';

jest.mock('react', () => ({...React, ...Service}));
```

```js
jest.mock('preact/hooks', () => Service);
```

</details>

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
| [`useReducer`][usereducer]                   | ❌Not planned, see note below |
| [`useContext`][usecontext]                   | ❌Not planned                 |
| [`useImperativeHandle`][useimperativehandle] | ❌Not planned                 |
| [`useLayoutEffect`][uselayouteffect]         | ❌Not planned                 |
| [`useDebugValue`][usedebugvalue]             | ❌Not planned                 |

**Note:** The three Hook primitives are `useState`, `useEffect`, and `useMemo`.
For example, `useCallback` and `useRef` are implemented using `useMemo` as
one-liners. In my opinion `useReducer` is rather special (due to the popularity
of Redux) and unlike `useCallback` and `useRef` not that widely used or
generally useful. Nevertheless, it can be implemented very easily by yourself
using `useState` and `useCallback`:

<details>
  <summary>Show implementation</summary>

```js
import {Service} from 'batis';

function useReducer(reducer, initialArg, init) {
  const [state, setState] = Service.useState(
    init ? () => init(initialArg) : initialArg
  );

  const dispatch = Service.useCallback(
    (action) => setState((previousState) => reducer(previousState, action)),
    []
  );

  return [state, dispatch];
}
```

</details>

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
class Service<THook extends AnyHook> {
  static useState<TState>(
    initialState: TState | (() => TState)
  ): [TState, SetState<TState>];

  static useEffect(effect: Effect, dependencies?: readonly unknown[]): void;

  static useMemo<TValue>(
    createValue: () => TValue,
    dependencies: readonly unknown[]
  ): TValue;

  static useCallback<TCallback extends (...args: any[]) => any>(
    callback: TCallback,
    dependencies: readonly unknown[]
  ): TCallback;

  static useRef<TValue>(initialValue: TValue): {current: TValue};

  constructor(hook: THook, listener: ServiceListener<THook>);

  invoke(args: Parameters<THook>): void;
  reset(): void;
}
```

```ts
type AnyHook = (...args: any[]) => any;
```

```ts
type ServiceListener<THook extends AnyHook> = (
  event: ServiceEvent<THook>
) => void;
```

```ts
type ServiceEvent<THook extends AnyHook> =
  | ServiceValueEvent<THook>
  | ServiceResetEvent
  | ServiceErrorEvent;

interface ServiceValueEvent<THook extends AnyHook> {
  readonly type: 'value';
  readonly value: ReturnType<THook>;
  readonly async: boolean;
  readonly intermediate: boolean;
}

interface ServiceResetEvent {
  readonly type: 'reset';
}

interface ServiceErrorEvent {
  readonly type: 'error';
  readonly error: unknown;
  readonly async: boolean;
}
```

```ts
type SetState<TState> = (state: TState | CreateState<TState>) => void;
type CreateState<TState> = (previousState: TState) => TState;
```

```ts
type Effect = () => DisposeEffect | void;
type DisposeEffect = () => void;
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

Copyright (c) 2020-2021, Clemens Akens. Released under the terms of the
[MIT License](https://github.com/clebert/batis/blob/master/LICENSE).
