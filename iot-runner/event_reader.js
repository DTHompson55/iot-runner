module.exports = {
		readEventFile: readEventFile
}

const fs = require('fs');
readline = require('readline');

function readEventFile(devDefn, events, callback){
events = events || [];
var lineNumber = 1;

console.log("Reading ",devDefn.filename, devDefn.deviceId);

var rd = readline.createInterface({
input: fs.createReadStream(devDefn.filename),
//output: process.stdout,
console: false
});

rd.on('line', function(line) {
	lineNumber++;
	if ( line.length == 0 ) return;
try {
var ev = (JSON.parse(line));
} catch (err) {
	console.log("IOT_RUNNER: Problem parsing line "+lineNumber+" - "+line);
	throw (err);
}
ev.metadata = ev.metadata || {};
for(var k in devDefn) ev.metadata[k]=devDefn[k];

if (ev.timestamp) { // old format
	ev.metadata.timestamp = ev.timestamp;
	delete ev.timestamp;
}
if (ev.topic) { // old format
	ev.metadata.topic = ev.topic;
	delete ev.topic;
}
if (ev.event) { // old format
	ev.metadata.event = ev.event;
}
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