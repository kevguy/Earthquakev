// store correlation between an earthquake code and the internal layer ID
var codeLayers = {};
// store all the earthquake circles
var quakeLayer = L.layerGroup([]).addTo(map);

var identity = Rx.helpers.identity;

function isHovering(element){
	var over = Rx.DOM.mouseover(element).map(identity(true));
	var out = Rx.DOM.mouseout(element).map(identity(false));

	return over.merge(out);
}

function makeRow(props){
	var row = document.createElement('tr');

	// equivalent to quake.id
	row.id = props.net + props.code;

	var date = new Date(props.time);
	var time = date.toString();

	[props.place, props.mag, time].forEach(function(text) {
		var cell = document.createElement('td');
		cell.textContent = text;
		row.appendChild(cell);
	});

	return row;
}

function initialize() {
	var socket = Rx.DOM.fromWebSocket('ws://127.0.0.1:8080');
	var quakes = Rx.Observable
		.interval(5000)
		.flatMap(function(){
			return Rx.DOM.jsonpRequest({
					url: QUAKE_URL,
					jsonpCallback: 'eqfeed_callback'
				}).retry(3);
		})
		.flatMap(function(result){
			return Rx.Observable.from(result.response.features);
		})
		.distinct(function(quake) {
			return quake.properties.code;
		})
		.share()
		.map(function(quake){
			return {
				lat: quake.geometry.coordinates[1],
				lng: quake.geometry.coordinates[0],
				net: quake.properties.net,
				code: quake.properties.code,
				time: quake.properties.time,
				place: quake.properties.place,
				mag: quake.properties.mag,
				id: quake.properties.net + quake.properties.code,
				size: quake.properties.mag * 10000
			};
		});

	quakes.bufferWithCount(100)
		.subscribe(function(quakes){
			console.log(quakes);
			var quakesData = quakes.map(function(quake){
				return {
					id: quake.id,
					lat: quake.lat,
					lng: quake.lng,
					mag: quake.mag
				};
			});
			socket.onNext(JSON.stringify({quakes: quakesData}));
		});

	socket.subscribe(function(message){
		console.log(JSON.parse(message.data));
	})

	// add data to map
	quakes.subscribe(function(quake){
		var circle = L.circle([quake.lat, quake.lng], quake.size).addTo(map);

		// add circle element to quakeLayer
		quakeLayer.addLayer(circle);
		// store layer id of circle with earthquale id as key
		codeLayers[quake.id] = quakeLayer.getLayerId(circle);
	});

	var table = document.getElementById('quakes_info');


	function getRowFromEvent(event) {
		return Rx.Observable
			.fromEvent(table, event)
			.filter(function(event){
				var el = event.target;
				return el.tagName === 'TD' && el.parentNode.id.length;
			})
			.pluck('target', 'parentNode')
			.distinctUntilChanged();
	}

	getRowFromEvent('mouseover')
		.pairwise()
		.subscribe(function(rows){
			var prevCircle = quakeLayer.getLayer(codeLayers[rows[0].id]);
			var currCircle = quakeLayer.getLayer(codeLayers[rows[1].id]);
			console.log(rows[0].id);
			prevCircle.setStyle({color: '#0000ff'});
			currCircle.setStyle({color: '#ff0000'});
		});

	getRowFromEvent('click')
	    .subscribe(function(row) {
	    	var circle = quakeLayer.getLayer(codeLayers[row.id]);
	    	map.panTo(circle.getLatLng());
	    });

	quakes
		//.pluck('properties')
		.map(makeRow)
		.bufferWithTime(500)
		.filter(function(rows){
			return (rows.length > 0);
		})
		.map(function(rows){
			var fragment = document.createDocumentFragment();
			rows.forEach(function(row){
				fragment.appendChild(row);
			});
			return fragment;
		})
		.subscribe(
			function(fragment){
				/*
				var row = fragment.firstChild;
				var circle = quakeLayer.getLayer(codeLayers[row.id]);
				
				isHovering(row).subscribe(function(hovering){
					circle.setStyle({ color: hovering ? '#ff0000' : '#0000ff' });
				})

				Rx.DOM.click(row).subscribe(function(){
					map.panTo(circle.getLatLng());
				});
				*/
				table.appendChild(fragment);
			}
		);



}



Rx.DOM.ready().subscribe(initialize);

