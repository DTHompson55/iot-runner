var er = require('./event_reader');
var async = require('async');
const fs = require('fs');


module.exports = {
		setPlaybackRate: setPlaybackRate,
		setTimelimitMS: setTimelimitMS,
		loadFromCfg: loadFromCfg,
		load: load,
		run: processEvents
}

var events = [];
var allEvents = [];
var allTimers = [];
var playbackRate = 1;
var timelimitMS = 0;


function setTimelimitMS(x){
	timelimitMS = x;
}

function setPlaybackRate(x){
	playbackRate = x;
}

//
// load the iot events from files, callback when complete
//
function loadFromCfg(cfgFileName, loadCompleteCallback){
	var path = fs.realpathSync(cfgFileName);
	path = path.substr(0, path.lastIndexOf('/'));
	var s = fs.readFileSync(cfgFileName, 'utf8');
	var cfg = JSON.parse(s);
	playbackRate = playbackRate || cfg.playbackRate || 1;
	timelimitMS  = timelimitMS ||  cfg.timelimitMS || 0;
	if ( playbackRate <= 0) playbackRate = 1;
	if ( timelimitMS <= 0 ) timelimitMS = 0;
	
	console.log("IoT Runner CFG values",cfg, "timelimit",timelimitMS, "playbackRate",playbackRate);
	for (var i = 0 ; i < cfg.playbacks.length; i++){
		cfg.playbacks[i].filename = path+"/"+cfg.playbacks[i].filename;
	}
	load(cfg.playbacks, loadCompleteCallback);
}

//
// load the iot events from files, callback when complete
//
function load(fileList, loadCompleteCallback){

	allEvents = [];
	
	// for each file, read the events from the file, then modify the start time
	// of the events, setting first event time to zero
	async.eachLimit(fileList, 1, (listElement, callback) => {		
	events = [];
	er.readEventFile(listElement, events, function(err) {
		if ( err ) throw err;
		
		// now change offsets of timestamps to current time
		var now = (new Date()).getTime();
		var basetime = events[0].metadata.timestamp;
		 
		for ( var i = 0 ; i < events.length; i++){
			events[i].metadata.timestamp = (events[i].metadata.timestamp - basetime)+events[i].metadata.startDelay;
			allEvents.push(events[i]);

		}		
		callback();
	});
}, function(){
	// after all events have been read...
	// add event IDs prior to Sort

	for ( var i = 0 ; i < allEvents.length; i++){
		allEvents[i].metadata.eventId = i+1;
	}
	
	allEvents.sort( (a,b)=>{
		return (a.metadata.timestamp - b.metadata.timestamp);
	});
	
	for ( var i = 0 ; i < allEvents.length; i++){
		allEvents[i].metadata.timestamp = Math.floor(allEvents[i].metadata.timestamp/playbackRate);
	}
	loadCompleteCallback(allEvents[allEvents.length-1].metadata.timestamp); // send back
																	// the total
																	// runtime
																	// of the
																	// scenario
	});
}

//
// This makes a deep copy of the allEvents array so we can run this several
// times.
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
// Then it runs all of the events, setting timers for each event with its
// startDelay
function processEvents(sendMessage, runComplete){
	var now = (new Date()).getTime();
	allTimers = copy(allEvents);

	for ( var i = 0 ; i < allTimers.length; i++){
		allTimers[i].metadata.timestamp = allTimers[i].metadata.timestamp + now;
	}

	if (timelimitMS > 0){
		console.log("timelimitMS = ",timelimitMS);
		setTimeout(function killswitch(){
			console.log("Setting Killswitch now");
			killswitch = true;
			for ( var i = 0 ; i < allEvents.length; i++){
				allTimers[i].killswitch = true;
			}		}
		,timelimitMS);
	}
	
	async.eachLimit(allTimers, 5, (eventObject, callback)=>{		
		let t = eventObject.metadata.timestamp - (new Date()).getTime();
		
// console.log("an event ", t, (new Date()).getTime(), eventObject.eventId);
		
		if( t <= 0 ){
// console.log("immeadiate event ",eventObject,new Date());
			console.log("Kill? ",eventObject.killswitch);
			if ( eventObject.killswitch ){
				callback("timelimit");
			} else {
				sendMessage(eventObject);
				callback();
			}
		}
		else {
			   setTimeout(function(eventObject, callback){
	// console.log("timed event ",eventObject,new Date())
				console.log("Kill? ",eventObject.killswitch);
				if ( eventObject.killswitch ){
					callback("timelimit");
				} else {
					sendMessage(eventObject);
					callback();
				}
			}, t, eventObject, callback);
		}
	}, function(err) {
	    // if any of the file processing produced an error, err would equal that
		// error
	    if( err ) {
	      // One of the iterations produced an error.
	      // All processing will now stop.
	      console.log('An event failed to process');
	    } else {
	      console.log('All events have been processed successfully');
	    }
	runComplete()});	
}