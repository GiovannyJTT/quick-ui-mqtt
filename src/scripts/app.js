import * as mqtt from 'mqtt'
import ui from './ui_setup.json'

/**
 * Wraps all needed to create our UI from the `ui_setup.json` and adds publish / subscribe into the callbacks
 */
class App {
    constructor() {
        // mqtt
        this.connect_to_mqtt_broker();

        // ui
        const _list_id = this.add_list_group("container");
        this.add_items_dynamically(_list_id);
        this.add_items_callbacks_dynamically();
    }
}

/**
 * Creates mqtt-client, connects to broker and attaches callbaks for mqtt-client-events (connected, disconnected, onmessage)
 * 
 * NOTE: mqtt port for websockets: commonly 9001
 * 
 * https://www.cloudamqp.com/docs/nodejs_mqtt.html
 */
App.prototype.connect_to_mqtt_broker = function () {
    const _url = "mqtt://" + ui.mqtt_broker.host + ":" + ui.mqtt_broker.port;
    this.client = mqtt.connect(_url, ui.mqtt_broker.options);

    // on connected event
    this.client.on("connect",
        function (e) {
            console.warn("mqtt.client: connected: " + this.client.connected);
        }.bind(this)
    );

    // on message received event
    this.client.on("message",
        function (topic, message, packet) {
           console.debug("mqtt.client: received message: '" + message + "' on '" + topic + "'");
        }.bind(this)
    );

    // on disconnect event
    this.client.on("disconnect",
        function (e) {
            console.warn("mqtt.client: disconnected: " + !this.client.connected);
        }.bind(this)
    );
}

/**
 * Removes all listeners (subscribers), closes connection to mqtt-broker and deletes mqtt-client
 */
App.prototype.disconnect_from_mqtt_broker = function () {
    this.client.removeAllListeners();
    this.client.end();
    this.client = undefined;
}

/**
 * Creates an empty bootstrap-list of tabs that will be filled with ui-items
 */
App.prototype.add_list_group = function (parent_id) {

    const _list_id = "list_tab";
    const _list = '<div id="' + _list_id + '" class="list-group" role="tablist"></div>'
    $("#" + parent_id).append(_list);

    console.debug("added " + _list_id + " to " + parent_id);
    return _list_id;
}

/**
 * Add bootstrap-buttons dynamically as children of `parent_id`
 */
App.prototype.add_items_dynamically = function (parent_id) {

    for (let i = 0; i < ui.items.length; i++) {

        let _item = ui.items[i];

        // check fields
        if (undefined === _item.topic) {
            console.error("item " + i + " has no 'topic': " + JSON.stringify(_item) + ". Aborting");
            return;
        }

        if (undefined === _item.name) {
            console.error("item " + i + " has no 'name': " + JSON.stringify(_item) + ". Aborting");
            return;
        }

        if (undefined === _item.qos) {
            console.error("item " + i + " has no 'qos': " + JSON.stringify(_item) + ". Aborting");
            return;
        }

        // add tab
        let _tab_id = "tab" + i;
        let _tab = '<a id="' + _tab_id + '" class="list-group-item" role="tab"></a>'

        $("#" + parent_id).append(_tab);

        // add button to tab
        let _button_id = "item" + i;
        let _button = '<button id="' + _button_id + '" class="btn btn-primary" style="width: 200px">'
            + _item.name
            + '</button>&nbsp;';

        $("#" + _tab_id).append(_button);
    }

    console.debug("added ui-items: " + ui.items.length + " to " + parent_id);
}

/**
 * Attaches `onClick` callbacks dynamically. These callbacks trigger mqtt publish / subscribe
 * 
 * It assumes all items have 'name' and 'topic' fields
 * 
 * NOTE: when adding callbacks: if item has "message" will be created a mqtt-publisher, otherwise it will create a mqtt-subscriber
 * NOTE: one click for subscribing and one click for un-subscribing
 */
App.prototype.add_items_callbacks_dynamically = function () {

    for (let i = 0; i < ui.items.length; i++) {

        let _item = ui.items[i];
        let _id = 'item' + i;

        // it is a publish topic
        if (undefined !== _item.message) {
            $("#" + _id).on("click",
                function (e) {
                    console.debug(_id + " onClick");

                    this.client.publish(_item.topic, _item.message, { qos: _item.qos, retain: false },
                        function (e) {
                            console.debug("mqtt.client.published: " + _item.topic + " " + _item.message);
                        }.bind(this)
                    );

                }.bind(this)
            );
        }
        // it is a subscribe topic
        else {
            $("#" + _id).on("click",
                function (e) {
                    console.debug(_id + " onClick");

                    if (undefined === _item.subscribed) {
                        this.client.subscribe(_item.topic, { qos: _item.qos, retain: false },
                            function (e) {
                                // set flag
                                _item.subscribed = true;
                                console.debug("mqtt.client.subscribed: " + _item.topic);
                            }.bind(this)
                        );
                    }
                    else {
                        this.client.subscribe(_item.topic,
                            function (e) {
                                // un-set flag
                                _item.subscribed = undefined
                                console.debug("mqtt.client.unsubscribed: " + _item.topic);
                            }.bind(this)
                        );
                    }
                }.bind(this)
            );
        }
    }

    console.debug("added ui-items callbacks: " + ui.items.length);
}

export default App