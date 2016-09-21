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

	// add data to map
	quakes.subscribe(function(quake){
		var circle = L.circle([quake.lat, quake.lng], quake.size).addTo(map);
		quakeLayer.addLayer(circle);
		codeLayers[quake.id] = quakeLayer.getLayerId(circle);
	});

	var table = document.getElementById('quakes_info');
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
				var row = fragment.firstChild;
				var circle = quakeLayer.getLayer(codeLayers[row.id]);

				isHovering(row).subscribe(function(hovering){
					circle.setStyle({ color: hovering ? '#ff0000' : '#0000ff' });
				})

				Rx.DOM.click(row).subscribe(function(){
					map.panTo(circle.getLatLng());
				});

				table.appendChild(fragment);
			}
		);



}



Rx.DOM.ready().subscribe(initialize);

