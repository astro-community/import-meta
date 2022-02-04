# Astro Imports

**Astro Imports** lets you use advanced `import` features in Astro.

## Import Assertions

```js
// contents of data.json as a json object
import data from './data.json' assert { type: 'json' }

// contents of data.json as plain text
import dataText from './data.json' assert { type: 'text' }

// url of data.json
import datHref from './data.json' assert { type: 'url' }
```

## Import Meta Enhancements

```js
// href of the current script
// example: "home/projects/github-itt8wn/demo/src/components/Image.astro"
import.meta.url

// resolved href, relative to import.meta.url
// example: "home/projects/github-itt8wn/demo/src/components/kitten.jpg"
import.meta.resolve('kitten.jpg')

// href of the current page, even if that is not the current script
// example: "/home/projects/github-itt8wn/demo/src/pages/index.astro"
import.meta.page.url

// resolved href, relative to import.meta.page.url
// example: "/home/projects/github-itt8wn/demo/src/pages/kitten.jpg"
import.meta.page.resolve('kitten.jpg')

// href of the current request
// example: "http://localhost:3000/"
import.meta.request.url

// resolved href, relative to import.meta.request.url
// example: "http://localhost:3000/kitten.jpg"
import.meta.request.resolve('kitten.jpg')

// props of the current component
// example: { src: 'kitten.jpg', alt: 'kitten' }
import.meta.props
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
