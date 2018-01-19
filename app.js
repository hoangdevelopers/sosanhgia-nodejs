let express = require('express')
let fs = require('fs')
let crawler = require('./crawler.js')
let path = require('path')
let app = express()

const PORT = process.env.PORT || 5000

app.use(express.static(path.join(__dirname, 'public')))


app.get('/', (req, res) => res.render('index'))

app.get('/api/items', async (req, res) => {
	let q = req.query.q, //search query
		s = req.query.s //website,
		pages = req.query.pages //pages

	if(q === undefined || s === undefined) {
		res.status(404).json({error:'Url is invalid.'})
	} else {
		let result = await crawler.searchItems({q, s, pages})
		res.json(result)
	}
})

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))