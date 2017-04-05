module.exports = {
		readEventFile: readEventFile
}

const fs = require('fs');
readline = require('readline');

function readEventFile(filename, deviceId, delay, events, callback){
events = events || [];

console.log("Reading ",filename, deviceId);

var rd = readline.createInterface({
input: fs.createReadStream(filename),
//output: process.stdout,
console: false
});

rd.on('line', function(line) {
var ev = (JSON.parse(line));
ev.deviceId = deviceId;
ev.startDelay = delay;
events.push(ev);
});

rd.on('close', function() {
//	console.log("Close ");
	callback();
});

rd.on('error', function(e) {
	console.log("Error ",e);
	callback();
});
}