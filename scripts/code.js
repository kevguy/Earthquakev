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
		.map(function(quake){
			return {
				lat: quake.geometry.coordinates[1],
				lng: quake.geometry.coordinates[0],
				net: quake.properties.net,
				code: quake.properties.code,
				time: quake.properties.time,
				place: quake.properties.place,
				mag: quake.properties.mag,
				size: quake.properties.mag * 10000
			};
		});

	// add data to map
	quakes.subscribe(function(quake){
		L.circle([quake.lat, quake.lng], quake.size).addTo(map);
	});

	var table = document.getElementById('quakes_info');
	quakes
		//.pluck('properties')
		.map(makeRow)
		.subscribe(
			function(row){
				table.appendChild(row);
			}
		);



}



Rx.DOM.ready().subscribe(initialize);

