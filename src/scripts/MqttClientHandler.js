import * as mqtt from 'mqtt'

class MqttClientHandler {
    /**
     * Contains all methods needed for managing mqtt related operations (client, connect, reconnect, pub, sub, etc.)
     * 
     * @param {Dictionary} cfg_ contains broker config, and mqtt topics for creating the UI (It is supposed
     *      this was already created when loading the content from the input json file)
     * @param {Dictionary} cbs_ callbacks to be triggered depending on the mqtt events: Needed `on_connected`, `on_message_received`,
     *      `on_disconnected`, `on_error`, `on_reconnecting`
     */
    constructor (cfg_, cbs_) {
        this.cfg = cfg_;

        if (undefined === this.cfg) {
            console.error("MqttClient: cfg is undefined. Not created");
            return;
        }

        this.cbs = cbs_
        if (undefined === this.cbs) {
            console.error("MqttClient: cbs callabcks is undefined. Not created");
            return;
        }

        this.client = undefined;
    }
}

/**
 * Creates mqtt-client, connects to broker and attaches callbaks for mqtt-client-events (connected, disconnected, onmessage)
 * 
 * NOTE: mqtt port for websockets: commonly 9001
 * 
 * https://www.cloudamqp.com/docs/nodejs_mqtt.html
 */
 MqttClientHandler.prototype.connect_to_mqtt_broker = function () {
    if (undefined === this.cfg) {
        console.error("'this.cfg' is undefined. Connection to mqtt-broker not done.")
        return;
    }

    const _broker = this.cfg.ui.mqtt_broker;
    const _url = "mqtt://" + _broker.host + ":" + _broker.port;
    this.client = mqtt.connect(_url, _broker.options);

    // on connected event
    this.client.on("connect",
        function (e) {
            console.warn("mqtt.client: connected: '" + this.client.connected + "' to broker: '" + _url + "'");

            this.cbs.on_connected();
        }.bind(this)
    );

    // on message received event
    this.client.on("message",
        function (topic, message, packet) {
            console.debug("mqtt.client: received message: '" + message + "' on '" + topic + "'");

            this.cbs.on_message_received(topic, message, packet);
        }.bind(this)
    );

    // on disconnect event
    this.client.on("disconnect",
        function (e) {
            console.warn("mqtt.client: disconnected: '" + !this.client.connected + "' from broker: '" + _url + "'");

            this.cbs.on_disconnected();
        }.bind(this)
    );

    // on offline
    this.client.on("error",
        function (e) {
            console.warn("mqtt.client: error: '" + JSON.stringify(e) + "'");

            this.cbs.on_error(e);
        }.bind(this)
    )

    // on reconnecting event
    this.client.on("reconnect",
        function (e) {
            console.warn("mqtt.client: connection lost, reconnecting...");

            this.cbs.on_reconnecting();
        }.bind(this)
    );
}

/**
 * Removes all listeners (subscribers), closes connection to mqtt-broker, deletes mqtt-client
 */
 MqttClientHandler.prototype.disconnect_from_mqtt_broker = function () {
    if (undefined !== this.client) {
        console.debug("mqtt.client: explicitly disconnecting from broker")    
        this.client.end(true);
        
        this.cbs.on_disconnected();
        this.client = undefined;
    }
    else {
        console.debug("Tried explicit disconnect when mqtt client didn't exist");
    }
}

MqttClientHandler.prototype.is_connected = function () {
    return (undefined !== this.client && this.client.connected);
}

MqttClientHandler.prototype.client_not_created = function () {
    return (undefined === this.client);
}

export default MqttClientHandler;