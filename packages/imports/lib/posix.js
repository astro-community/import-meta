/** Returns the posix-normalized path from the given path. */
export const normalize = (/** @type {string} */ path) => path.replace(/\\+/g, '/').replace(/^(?=[A-Za-z]:\/)/, '/').replace(/%/g, '%25').replace(/\n/g, '%0A').replace(/\r/g, '%0D').replace(/\t/g, '%09')

/** Returns the posix-normalized path and separated search params from the given path. */
export const normalizeWithParams = (/** @type {string} */ path) => {
	/** @type {[ string, URLSearchParams ]} */
	const splitpath = path.split(/(?<=^[^?]+)\?/)

	splitpath[0] = normalize(splitpath[0])
	splitpath[1] = new URLSearchParams(splitpath[1])

	return splitpath
}

/** Returns the posix-normalized path and separated search params from the given path. */
export const normalizeWithAssertions = (/** @type {string} */ path) => {
	/** @type {[string, { [key: string]: any } | null ]} */
	const splitpath = path.split(/(?<=^[^?]+)\?/)

	const params = new URLSearchParams(splitpath[1])

	const assertJSON = params.get('assert')

	params.delete('assert')

	const hasAssertions = Boolean(assertJSON) && splitpath[0].endsWith('.js')

	if (hasAssertions) {
		splitpath[0] = normalize(splitpath[0].slice(0, -3)) + ([ ...params ].length ? `?${params}` : '')
		splitpath[1] = JSON.parse(assertJSON)
	} else {
		splitpath[0] = path
		splitpath[1] = null
	}

	return splitpath
}
	