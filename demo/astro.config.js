// @ts-check

import importPlus from '@astropub/imports'

/** @type {import('astro').AstroUserConfig} */
const config = {
	renderers: [],
	vite: {
		plugins: [
			importPlus()
		]
	}
}

export default config
