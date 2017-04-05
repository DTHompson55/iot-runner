var er = require('./event_reader');
var async = require('async');
const fs = require('fs');


module.exports = {
		loadFromCfg: loadFromCfg,
		load: load,
		run: processEvents
}

var events = [];
var allEvents = [];
var allTimers = [];



//
//load the iot events from files, callback when complete
//
function loadFromCfg(cfgFileName, loadCompleteCallback){
	
	var s = fs.readFileSync(cfgFileName, 'utf8');
	var cfg = JSON.parse(s);
	console.log(cfg);
	for (var i = 0 ; i < cfg.playbacks.length; i++){
		cfg.playbacks[i].filename = cfg.basedir+"/"+cfg.playbacks[i].filename;
	}
	load(cfg.playbacks, loadCompleteCallback);
}

//
// load the iot events from files, callback when complete
//
function load(fileList, loadCompleteCallback){

	allEvents = [];
	
	// for each file, read the events from the file, then modify the start time of the events, setting first event time to zero
	async.eachLimit(fileList, 1, (listElement, callback) => {		
	events = [];
	er.readEventFile(listElement.filename, listElement.deviceId, listElement.startDelay, events, function(err) {
		if ( err ) throw err;
		
		// now change offsets of timestamps to current time
		var now = (new Date()).getTime();
		var basetime = events[0].timestamp;
		for ( var i = 0 ; i < events.length; i++){
			events[i].timestamp = (events[i].timestamp - basetime)+events[i].startDelay;
			delete events[i].startDelay;
			allEvents.push(events[i]);


		}		
		callback();
	});
}, function(){
	// after all events have been read...
	// add event IDs prior to Sort

	for ( var i = 0 ; i < allEvents.length; i++){
		allEvents[i].eventId = i+1;
	}
	
	allEvents.sort( (a,b)=>{
		return (a.timestamp - b.timestamp);
	});
	
	loadCompleteCallback(allEvents.length);
	});
}

//
// This makes a deep copy of the allEvents array so we can run this several times.
//
function copy(o) {
	   var output, v, key;
	   output = Array.isArray(o) ? [] : {};
	   for (key in o) {
	       v = o[key];
	       output[key] = (typeof v === "object") ? copy(v) : v;
	   }
	   return output;
	}

//
// This gets a copy of allEvents and sets the current timestamp.
// Then it runs all of the events, setting timers for each event with its startDelay
function processEvents(sendMessage, runComplete){
	var now = (new Date()).getTime();
	allTimers = copy(allEvents);

	for ( var i = 0 ; i < allEvents.length; i++){
		allTimers[i].timestamp = allTimers[i].timestamp + now;
	}

	async.eachLimit(allTimers, 5, (eventObject, callback)=>{		
		let t = eventObject.timestamp - (new Date()).getTime();
		
//		console.log("an event ", t, (new Date()).getTime(), eventObject.eventId);
		
		if( t <= 0 ){
//			console.log("immeadiate event ",eventObject,new Date());
			sendMessage(eventObject);
			callback();
		}
		else {
			setTimeout(function(eventObject, callback){
	//			console.log("timed event ",eventObject,new Date());
				sendMessage(eventObject);
				callback();
			}, t, eventObject, callback);
		}
	}, function(err) {
	    // if any of the file processing produced an error, err would equal that error
	    if( err ) {
	      // One of the iterations produced an error.
	      // All processing will now stop.
	      console.log('An event failed to process');
	    } else {
	      console.log('All events have been processed successfully');
	    }
	runComplete()});	
}