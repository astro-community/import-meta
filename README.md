# Astro Imports

**Astro Imports** lets you use advanced `import` features in Astro.

## Import Assertions

```js
import data from './data.json' assert { type: 'json' }
import dataRaw from './data.json' assert { type: 'raw' }
import dataUrl from './data.json' assert { type: 'url' }
```

## Import Meta Enhancements

```js
import.meta.resolve('kitten.jpg') // resolves relative to wherever you're running import.meta.url

import.meta.page.url // behaves like import.meta.url, but relative to the page import.meta is called from, instead of the component itself 

import.meta.page.resolve('kitten.jpg') // resolves relative to the page import.meta is called from, instead of the component itself 

import.meta.request.url // behaves import.meta.url, but for the current request (like localhost:3000/page1/)

import.meta.request.resolve('kitten.jpg') // resolves relative to current request (like localhost:3000/page1/)

import.meta.props // props, when within a component
```

```astro
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Astro Imports Example</title>
  </head>
  <body>
    <h1>Astro Imports Example</h1>
    <img src={import.meta.request.resolve('kitten.jpg')} alt="kitten" />
  </body>
</html>
```

## Usage

Install **Astro Imports** to your project.

```shell
npm install @astropub/imports
```

Add **Astro Imports** to your Astro configuration.

```js
import importPlus from '@astropub/imports'

export default {
  vite: {
    plugins: [
      importPlus()
    ]
  }
}
```

Enjoy!

## Project Structure

Inside of your Astro project, you'll see the following folders and files:

```plaintext
/
├── demo/
│   ├── public/
│   └── src/
│       └── pages/
│           └── index.astro
└── packages/
    └── my-plugin/
        ├── index.js
        └── package.json
```

This project uses **workspaces** to develop a single package, `@astropub/imports`.

It also includes a minimal Astro project, `demo`, for developing and demonstrating the plugin.



## Commands

All commands are run from the root of the project, from a terminal:

| Command         | Action                                       |
|:----------------|:---------------------------------------------|
| `npm install`   | Installs dependencies                        |
| `npm run start` | Starts local dev server at `localhost:3000`  |
| `npm run build` | Build your production site to `./dist/`      |
| `npm run serve` | Preview your build locally, before deploying |

Want to learn more?
Read [our documentation][docs-url] or jump into our [Discord server][chat-url].



[chat-url]: https://astro.build/chat
[docs-url]: https://github.com/withastro/astro
[open-img]: https://developer.stackblitz.com/img/open_in_stackblitz.svg
[open-url]: https://stackblitz.com/github/withastro/astro/tree/latest/examples/plugin
