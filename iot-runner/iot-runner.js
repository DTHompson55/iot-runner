var rp = require('./replayer.js');
var node;
const fs = require('fs');

module.exports = function(RED) {
	function iotRunner(config) {          
		RED.nodes.createNode(this, config);
        
        node = this;     
        node.initfile = config.initfile;
        
        this.status({fill:"yellow",shape:"ring",text:"disconnected"});
        this.on("input", emitEvent);
        
        //
        // load up the events, then call the callback
        //
        
        node.initfile = node.initfile || '../Projects/sensordata/iot-runner.cfg';
        
        rp.loadFromCfg(node.initfile, function loadCallback(count){       	
            node.status({fill:"red",shape:"dot",text:"ready to run"});
            console.log("Load Complete "+count+" iot script items initialized");
    	});
    }
	
    RED.nodes.registerType("iot-runner",iotRunner);
    
/**
    ito-runner.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
        } else if (this.cronjob != null) {
            this.cronjob.stop();
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
            delete this.cronjob;
        }
    }
**/
    
    RED.httpAdmin.post("/iot-runner/:id", RED.auth.needsPermission("iot-runner.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        node.status({fill:"green",shape:"dot",text:"running"});
        if (node !== null) {
            try {
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
    	msg.topic = eventObject.topic;
    	delete eventObject.topic;
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
		console.log("Run Complete ",new Date());
        node.status({fill:"yellow",shape:"dot",text:"done - waiting for next run"});
 	}

    
};