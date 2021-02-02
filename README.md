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
  - [Writing the `useGreeting` Hook](#writing-the-usegreeting-hook)
  - [Rendering the `useGreeting` Hook using the `Host` class](#rendering-the-usegreeting-hook-using-the-host-class)
  - [Rendering the `useGreeting` Hook using the `Subject` class](#rendering-the-usegreeting-hook-using-the-subject-class)
  - [Testing React/Preact Hooks](#testing-reactpreact-hooks)
- [API reference](#api-reference)
  - [Implementation status](#implementation-status)
  - [Type definitions](#type-definitions)

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
effects of a Hook and sends events to a single event listener function.

## Getting started

### Installing Batis

```
npm install batis --save
```

### Writing the `useGreeting` Hook

```js
import {Host} from 'batis';

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
```

### Rendering the `useGreeting` Hook using the `Host` class

```js
import {deepStrictEqual} from 'assert';

const events = [];
const greeting = new Host(useGreeting, events.push.bind(events));

greeting.render('Hello');
greeting.render('Hi');
greeting.reset();
greeting.render('Hey');
greeting.render('Yo');

deepStrictEqual(events, [
  Host.createRenderingEvent('Hello Jane', 'Hello John'),
  Host.createRenderingEvent('Hi Jane'),
  Host.createResetEvent(),
  Host.createRenderingEvent('Hey Jane', 'Hey John'),
  Host.createRenderingEvent('Yo Jane'),
]);

setTimeout(() => {
  deepStrictEqual(events.slice(5), [
    Host.createRenderingEvent('Yo Janie and Johnny'),
  ]);
}, 20);
```

### Rendering the `useGreeting` Hook using the `Subject` class

The API of the `Host` class, which allows to pass a single event listener
function, may not be very convenient to use. However, I wanted to create an API
that was as minimalistic and opinion-free as possible. As a more convenient
abstraction, the `Subject` class can be used:

```js
import {deepStrictEqual} from 'assert';
import {Subject} from 'batis';

const greeting = new Subject(useGreeting);

greeting.host.render('Hello');
greeting.host.render('Hi');
greeting.host.reset();
greeting.host.render('Hey');
greeting.host.render('Yo');

(async () => {
  deepStrictEqual(await greeting.nextEventBatch, [
    Host.createRenderingEvent('Yo Jane'),
    Host.createRenderingEvent('Hey Jane', 'Hey John'),
    Host.createResetEvent(),
    Host.createRenderingEvent('Hi Jane'),
    Host.createRenderingEvent('Hello Jane', 'Hello John'),
  ]);

  deepStrictEqual(await greeting.nextEventBatch, [
    Host.createRenderingEvent('Yo Janie and Johnny'),
  ]);
})();
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

jest.mock('react', () => ({...React, ...Host}));
```

```js
jest.mock('preact/hooks', () => Host);
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
| [`useReducer`][usereducer]                   | ❌Not planned, see note below |
| [`useContext`][usecontext]                   | ❌Not planned                 |
| [`useImperativeHandle`][useimperativehandle] | ❌Not planned                 |
| [`useLayoutEffect`][uselayouteffect]         | ❌Not planned                 |
| [`useDebugValue`][usedebugvalue]             | ❌Not planned                 |

**Note:** The three primitives are `useState`, `useEffect`, and `useMemo`. For
example, `useCallback` and `useRef` are implemented using `useMemo` as
one-liners. In my opinion `useReducer` is rather special (due to the popularity
of Redux) and unlike `useCallback` and `useRef` not that widely used or
generally useful. Nevertheless, it can be implemented very easily by yourself
using `useState` and `useCallback`:

<details>
  <summary>Show code</summary>

```js
import {Host} from 'batis';

function useReducer(reducer, initialArg, init) {
  const [state, setState] = Host.useState(
    init ? () => init(initialArg) : initialArg
  );

  const dispatch = Host.useCallback(
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

<details>
  <summary>class Subject</summary>

```ts
/**
 * A convenient to use shell for the `Host` class.
 */
class Subject<THook extends AnyHook> {
  readonly host: Host<THook>;

  constructor(hook: THook);

  get latestEvent(): HostEvent<THook> | undefined;

  /**
   * The next event batch contains all events that have occurred in the current
   * macrotask or, if no events occur or have already occurred, from an upcoming
   * macrotask in which the next event will occur. The events are sorted in
   * descending order.
   */
  get nextEventBatch(): Promise<HostEventBatch<THook>>;
}
```

</details>

<details>
  <summary>class Host</summary>

```ts
class Host<THook extends AnyHook> {
  static createRenderingEvent<THook extends AnyHook>(
    result: ReturnType<THook>,
    ...interimResults: readonly ReturnType<THook>[]
  ): HostRenderingEvent<THook>;

  static createResetEvent(): HostResetEvent;
  static createErrorEvent(reason: unknown): HostErrorEvent;

  static useState<TState>(
    initialState: TState | (() => TState)
  ): readonly [TState, SetState<TState>];

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

  constructor(hook: THook, eventListener: HostEventListener<THook>);

  render(...args: Parameters<THook>): void;

  /**
   * Reset the state and clean up all side effects.
   * The next rendering will start from scratch.
   */
  reset(): void;
}
```

</details>

<details>
  <summary>type HostEvent</summary>

```ts
type HostEvent<THook extends AnyHook> =
  | HostRenderingEvent<THook>
  | HostResetEvent
  | HostErrorEvent;

interface HostRenderingEvent<THook extends AnyHook> {
  readonly type: 'rendering';
  readonly result: ReturnType<THook>;

  /**
   * The interim results are sorted in descending order.
   */
  readonly interimResults: readonly ReturnType<THook>[];

  /**
   * Allows convenient access without discriminating the event by type.
   */
  readonly reason?: undefined;
}

/**
 * The host has lost its state and all side effects have been cleaned up.
 * The next rendering will start from scratch.
 */
interface HostResetEvent {
  readonly type: 'reset';

  /**
   * Allows convenient access without discriminating the event by type.
   */
  readonly result?: undefined;
  readonly interimResults?: undefined;
  readonly reason?: undefined;
}

/**
 * The host has lost its state and all side effects have been cleaned up.
 * The next rendering will start from scratch.
 */
interface HostErrorEvent {
  readonly type: 'error';
  readonly reason: unknown;

  /**
   * Allows convenient access without discriminating the event by type.
   */
  readonly result?: undefined;
  readonly interimResults?: undefined;
}
```

</details>

<details>
  <summary>type HostEventBatch</summary>

```ts
type HostEventBatch<THook extends AnyHook> = readonly [
  HostEvent<THook>,
  ...HostEvent<THook>[]
];
```

</details>

<details>
  <summary>type HostEventListener</summary>

```ts
type HostEventListener<THook extends AnyHook> = (
  event: HostEvent<THook>
) => void;
```

</details>

<details>
  <summary>type AnyHook</summary>

```ts
type AnyHook = (...args: any[]) => any;
```

</details>

<details>
  <summary>type SetState</summary>

```ts
/**
 * Unlike React, Batis always applies all state changes, whether synchronous
 * or asynchronous, in batches.
 *
 * See related React issue: https://github.com/facebook/react/issues/15027
 */
type SetState<TState> = (state: TState | CreateState<TState>) => void;
type CreateState<TState> = (previousState: TState) => TState;
```

</details>

<details>
  <summary>type Effect</summary>

```ts
type Effect = () => CleanUpEffect | void;
type CleanUpEffect = () => void;
```

</details>

---

Copyright (c) 2020-2021, Clemens Akens. Released under the terms of the
[MIT License](https://github.com/clebert/batis/blob/master/LICENSE).
