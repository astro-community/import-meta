/** Returns a collection of strings joined by a comma. */
export const commaJoin = (/** @type {string[]} */ ...values) => values.join(',')

/** Returns a collection of strings joined by a semicolon. */
export const curlyJoin = (/** @type {string[]} */ ...values) => values.join(';')

export const symbolJS = `Symbol.for("import.meta")`

export const headerJS = `let ${commaJoin(
	`s=${symbolJS}`,
	`m=globalThis[s]`,
	`r=r=>({${commaJoin(
		`with(id){${curlyJoin(
			`return '/' + m.assetsName + '/' + m.assets.add(this.resolve(id)).hashname`,
		)}}`,
		`get url(){return r}`,
		`get resolve(){${
			`return ((...paths) => paths.reduce(${
				`(u,p) => new URL(p, u), new URL(r, "file:"))`
			}.pathname).bind(null)`
		}}`,
	)}})`,
)}`
