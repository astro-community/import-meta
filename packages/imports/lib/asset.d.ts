export class Assets extends Map<string, Asset> {
	add(path: string | URL): Asset
	get(path: string | URL): Asset | null
	getFromServer(path: string | URL): string | null

	hashnames: Map<string, Asset>
}

export class Asset {
	basename: string
	extension: string
	filename: string
	filetype: string
	hashname: string
	pathname: string
}

export const data: {
	assetsName: string
	baseName: string
	fileHref: string
	pageHref: string
	requestHref: string
	siteHref: string
	props: { [key: string]: any },
	assets: Assets,
}
