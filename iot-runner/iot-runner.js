var rp = require('./replayer.js');
var node;
const fs = require('fs');

var scenario_length = 0;
var scenario_duration = 0;
var state = "disconnected";
var green_timer;

module.exports = function(RED) {
	function iotRunner(config) {          
		RED.nodes.createNode(this, config);
        
        node = this;     
        node.initfile = config.initfile;
        rp.setTimelimitMS(config.timelimitMS);
        rp.setPlaybackRate(config.playbackRate);
        
        
        this.status({fill:"yellow",shape:"ring",text:"disconnected"});
        this.on("input", emitEvent);
        
        //
        // load up the events, then call the callback
        //
        
        node.initfile = node.initfile || '../Projects/sensordata/iot-runner.cfg';
        
        rp.loadFromCfg(node.initfile, function loadCallback(time){   
        	scenario_length = time;
            node.status({fill:"yellow",shape:"dot",text:"ready: "+time+" ms"});
            console.log("Scenario Length: "+time+" ms");
    	});
    }
	
    RED.nodes.registerType("iot-runner",iotRunner);
    
/**
 * ito-runner.prototype.close = function() { if (this.interval_id != null) {
 * clearInterval(this.interval_id); if (RED.settings.verbose) {
 * this.log(RED._("inject.stopped")); } } else if (this.cronjob != null) {
 * this.cronjob.stop(); if (RED.settings.verbose) {
 * this.log(RED._("inject.stopped")); } delete this.cronjob; } }
 */

    RED.httpAdmin.post("/iot-runner-cfg/:id", RED.auth.needsPermission("iot-runner.write"), function(req,res) {
            res.sendStatus(200);
    });

    
    RED.httpAdmin.post("/iot-runner/:id", RED.auth.needsPermission("iot-runner.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node !== null) {
            try {
            	scenario_duration = scenario_length;
                node.status({fill:"green",shape:"dot",text:"running "+scenario_length+" ms"});
            	green_timer = setInterval(function myTimer() {
            		scenario_duration -= 1000;
            		node.status({fill:"green",shape:"dot",text:"running "+scenario_duration+" ms"});
            	}, 1000);

            	rp.run(sendMessage, runComplete);
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error(RED._("iot-runner-start.failed",{error:err.toString()}));
            }
        } else {
            res.sendStatus(404);
        }
    });
    
	function sendMessage(eventObject){
    	msg = {};
    	for(var k in eventObject.metadata) msg[k]=eventObject.metadata[k];
    	delete eventObject.metadata;
    	msg.payload = eventObject;
        node.emit("input",msg);
	}
	
    function emitEvent(msg) {
        try {
            this.send(msg);
            msg = null;
        } catch(err) {
            this.error(err,msg);
        }
    }

	function runComplete(msg){
		if (green_timer)
			clearInterval(green_timer);
		green_timer = null;
		console.log("Run Complete ",new Date());
        node.status({fill:"red",shape:"dot",text:"done - ready for next run"});
 	}

    
};