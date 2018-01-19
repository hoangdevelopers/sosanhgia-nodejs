$(document).ready(() => {

	const BASE_URL = window.location.origin;

	let app = new Vue({
		el: '#app',
		data: {
			allWebsites: [],
			websites: [], //selected websites
			itemList: [],
			queryStr: '', //search query
			searchPages: 1 //pages number result
		},
		mounted: function() {
			axios.get(`${BASE_URL}/websites.json`)
				.then(response => {
					this.allWebsites = this.websites = response.data
					$('#select-websites').dropdown()
				})
		},
		methods: {
			updateWebsites: function() {
				let value = $('#select-websites').val()
				this.websites = this.allWebsites.filter(website => value.includes(website.name))
			},
			checkSelectedWebsite: function(name) {
				return this.websites.find(website => website.name === name) !== undefined
			},
			updateItems: function() {
				this.itemList = []
				if(this.queryStr === '')
					return
				for(let website of this.websites) {
					let url = `${BASE_URL}/api/items?q=${this.queryStr}&s=${website.name}`
					if(this.searchPages > 1) 
						url += `&pages=${this.searchPages}`
					
					axios.get(url)
						.then(response => {
							let res = response.data

							if(res.success) {
								let list = res
								list.website = website
								this.itemList.push(list)

								setTimeout(() => {
									let list = $(`#${website.name}-item-list`)
									initOwlCarousel(list)
								}, 500)
							}
						})
				}
			},
			short: name => {
				let MAX = 40
				if(typeof name === 'string' && name.length > MAX) 
					name = name.slice(0, MAX) + '...'
				return name
			}
		}
	})

	function initOwlCarousel(owl) {
		owl.owlCarousel({
			lazyLoad: true,
			items: 5,
			margin: 10,
			stagePadding: 50
		})
		owl.on('mousewheel', '.owl-stage', e => {
			if (e.deltaY>0) {
				owl.trigger('next.owl')
			} else {
				owl.trigger('prev.owl')
			}
			e.preventDefault()
		})
	}

})