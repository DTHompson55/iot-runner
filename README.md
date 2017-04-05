#iot-Runner

This node-red node produces a stream of IoT events. It uses one or more iot history files, including timestamps, combines them, and plays them back using the timestamps, providing a stream that looks like it came from multiple devices.

IoT histories can be easily be produced by running any IoT device through a function that adds a timestamp (milliseconds past midnight), and a topic to the payload. That stream can be sent directly to a history file. A sample node-red flow for a TI SensorTag device is included.

The node requires an iot-runner.cfg file. Set the path to the iot-runner.cfg file in the configuration dialog by double clicking on the node. The config file lists the history files you want to use in the playback. It also sets an iot device Id for each playback file, as well as a time delay for use in staggering the start of the playback of each file.  A sample iot-runner.cfg file is provided.

The history files are simply composed CRLF separated json objects with timestamps and iot topic added. During playback json object becomes the message payload, the timestamp is removed from the payload, and the topic is moved to the message topic. A message ID added to the payload and is sent. The message ID is simply the order that the messages were read in before being sorted into time order. Sample history files are provided.

##How it Works

This works as an input node, providing mulitple output messages asynchronously over time until all of the messaegs in the combined history files have been played back.

During initialization, as it reads each history file, the event_reader normalizes the timestamps, treating them as if the first record in each file occurred at time zero. Subsequent history records are treated as offsets from the first record. This is repeated for each history file. When all of the history files have been read in they are combined and sorted to put them in time order.

When the start button is clicked timers are set for each history record. When the timers expire the associated history record is emitted from the node.


