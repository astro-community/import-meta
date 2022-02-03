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
import.meta.resolve('kitten.jpg') // resolves relative to import.meta.url

import.meta.page.url // import.meta.url, but for the current page file

import.meta.page.resolve('kitten.jpg') // resolves relative to current page file

import.meta.request.url // import.meta.url, but for the current request

import.meta.request.resolve('kitten.jpg') // resolves relative to current request

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
