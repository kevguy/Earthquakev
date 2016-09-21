var WebSocketServer = require('ws').Server;
var Twit = require('twit');
var Rx = require('rx');


var T = new Twit({
	consumer_key: 'rFhfB5hFlth0BHC7iqQkEtTyw',
	consumer_secret: 'zcrXEM1jiOdKyiFFlGYFAOo43Hsz383i0cdHYYWqBXTBoVAr1x',
	access_token: '14343133-nlxZbtLuTEwgAlaLsmfrr3D4QAoiV2fa6xXUVEwW9',
	access_token_secret: '57Dr99wECljyyQ9tViJWz0H3obNG3V4cr5Lix9sQBXju1'
});

function onConnect(ws) {
	console.log('Client connected on localhost:8080');

	var onMessage = Rx.Observable.fromEvent(ws, 'message')
		.subscribe(
			function(quake){
				quake = JSON.parse(quake);
				console.log(quake);	
			}
		);

	var stream = T.stream('statuses/filter', {
		track: 'earthquake',
		locations: []
	});

	Rx.Observable.fromEvent(stream, 'tweet').subscribe(function(tweetObject) {
		ws.send(JSON.stringify(tweetObject), function(err) {
			if (err) {
				console.log('There was an error sending the message');
			}
		});
	});
}

var Server = new WebSocketServer({ port: 8080 });

Rx.Observable.fromEvent(Server, 'connection').subscribe(onConnect);

