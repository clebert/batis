# batis

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

Writing and executing Hooks without React.

## Installation

Using `yarn`:

```
yarn add batis
```

Using `npm`:

```
npm install batis --save
```

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

## API reference

The [React Hooks API reference](https://reactjs.org/docs/hooks-reference.html)
also applies to this library and should be consulted.

### Implementation status

Below you can see the implementation status of the various Hooks provided by
React:

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

### Types

```ts
class HookProcess<THook, TResultValue> {
  static start<THook, TResultValue>(
    hook: THook,
    args: Parameters<THook>
  ): HookProcess<THook, TResultValue>;

  get result(): HookResult<TResultValue>;

  readonly isStopped: () => boolean;
  readonly stop: () => void;
  readonly update: (args: Parameters<THook>) => TResultValue;
}
```

```ts
interface HookResult<TResultValue> {
  getCurrent(): TResultValue;
  getNextAsync(): Promise<TResultValue>;
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
