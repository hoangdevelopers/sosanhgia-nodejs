let request = require('request')
let cheerio = require('cheerio')
let _url = require('url')
let isUrl = require('is-url')
let fs = require('fs')

//request api: {q, s, pages}
let searchItems = async req => {
	let websites = await getWebsites()
	//s: find website by name
	let website = websites.find(website => website.name.toLowerCase() === req.s.toLowerCase())
	let result

	if(website !== undefined) {
		let query = {}
		//q: search query
		query[website.search.query] = req.q

		result = await getItemsFromSite(query, website)
		
		//page: number of pages to crawl
		let pages = parseInt(req.pages)
		if(pages !== undefined && pages >= 2) {
			result.pages = pages
			let p = 2
			//request from page 2 -> max
			//merge items to first result items
			while(p <= pages) {
				query[website.search.page] = p
				let items = await getItemsFromSite(query, website, true)
				if(items.length > 0) {
					result.items = [...result.items, ...items] //concat 2 array
				}
				p++
			}
		}
	}

	return result
}

//return items array if page > 1
let getItemsFromSite = async (query, website, hasPage = false) => {
	let result

	let url = getUrl({
		protocol: website.protocol,
		host: website.host, 
		pathname: website.search.pathname, 
		query
	})

	try {
		let $ = await requestUrl({url})
		let items, results_count

		//Lazada: read script tag to parse
		if(website.name.toLowerCase() === 'lazada') {
			//get js variable window.pageData
			let lazadaData = JSON.parse($('script').get(2).children[0].data.replace('window.pageData=', ''))
			//parse obj to items
			results_count = lazadaData.mainInfo.totalResults
			items = lazadaData.mods.listItems.map(item => normalizeItem({
				href: `https:${item.productUrl}`,
				name: item.name,
				image: item.image,
				price_sale: item.priceShow,
				price_regular: item.originalPriceShow,
				sale_tag: item.discount,
				location: item.location,
				ratingScore: item.ratingScore
			}, website))
		} else {
			items = $(website.search.items).map((i, el) => parseItem($(el), website)).get()
		}
		console.log(`${url} | items: ${items.length}`)
		
		if(!hasPage) {
			if(results_count === undefined)
				results_count = parseObj($('html'), website.search.results_count)
			
			result = { success: true, url, results_count, items } //first result
		} else {
			result = items //concat with first page result
		}
	} catch(error) {
		if(error.stack !== undefined)
			error = error.stack
		result = { success: false, url, error }
	}
	return result
}

//Parse item and return object
let parseItem = ($el, website) => {
	let item = {}
	let _item = website.search.item
	for(let key in _item) {
		item[key] = parseObj($el, _item[key])
	}
	return normalizeItem(item, website)
}

let normalizeItem = (item, website) => {
	//Normalize item object
	if(item.href !== undefined && !isUrl(item.href)) { //add host to url
		item.href = getUrl({
			protocol: website.protocol,
			host: website.host, 
		}) + item.href
	}
	if(item.price_sale.includes('  ')) { //normalize in tiki.vn
		item.price_sale = item.price_sale.split('  ')[0]
	}
	for(let key in item) {
		if(item[key] === undefined || item[key] === null || item[key] === '')
			delete item[key]
	}
	return item
}

//Parse object {sel, attr} from json file to obj
let parseObj = ($el, obj) => {
	let ele = $el.find(obj.sel)
	if(obj.attr === 'text')
		return ele.text().trim()
	else if(obj.attr === 'html')
		return ele.html()
	else {
		let attrs = obj.attr.split('|'),
			value
		for(let attr of attrs) {
			value = ele.attr(attr)
			if(value !== undefined && value !== null && value !== '')
				return value
		}
		return null
	}
}

//Build url
let getUrl = obj => 
	_url.format({
		protocol: obj.protocol,
		host: obj.host, 
		pathname: obj.pathname, 
		query: obj.query
	})

//request to an url to crawl
let requestUrl = options => 
	new Promise(async (resolve, reject) => {
		request(options, (error, response, html) => {
			if(!error && response.statusCode === 200) {
				resolve(cheerio.load(html))
			} else {
				reject({status: response.statusCode, error})
			}
		})
	})

//get websites and its data ro crawl
let getWebsites = () => JSON.parse( fs.readFileSync('websites.json', 'utf8') )


module.exports = {
	searchItems
}