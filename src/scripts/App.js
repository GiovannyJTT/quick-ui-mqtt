import { Button } from 'bootstrap';
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
        this.add_buttons_callbacks_dynamically();
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
            console.warn("mqtt.client: connected: '" + this.client.connected + "' to broker: '" + _url + "'");
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
            console.warn("mqtt.client: disconnected: '" + !this.client.connected + "' from broker: '" + _url + "'");
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

    console.debug("added '" + _list_id + "' to '" + parent_id + "'");
    return _list_id;
}

/**
 * It adds bootstrap UI elements as children of `parent_id`
 * 
 * For each item into `ui_setup.json`, it will create a tab:

 * 1. Every tab will contain `button`, `text-box` and `color`
 * 2. A subscriber button (ex: `Room temperature`) when clicked will subscribe or unsubscribe from topic
 *      - When subscribed color will change to `green`
 *          - When received message will be reflected into text-box
 *      - When unsubscribed color will change to `red`
 *          - text-box will cleared
 * 3. A publisher button (ex: `Increase AC temp`) when clicked will publish to topic
 *      - When publish succeeded color will blink to `green` for 100 ms
 *      - When publish failed color will blink to `red` for 100 ms
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
        let _tab = '<a id="' + _tab_id + '" class="list-group-item" role="tab"></a>';

        $("#" + parent_id).append(_tab);

        // add row to tab
        let _row_id = "row" + i;
        let _row = '<div id="' + _row_id + '" class="row justify-content-md-center"></div>';
        $("#" + _tab_id).append(_row);

        // add col1 to row
        let _col1_id = "col" + i + "_1";
        let _col1 = '<div id="' + _col1_id + '" class="col-md-auto"></div>';

        $("#" + _row_id).append(_col1);

        // add col2 to row
        let _col2_id = "col" + i + "_2";
        let _col2 = '<div id="' + _col2_id + '" class="col-md-auto"></div>';

        $("#" + _row_id).append(_col2);

        // add button to col1
        let _button_id = "button" + i;
        let _button = '<button id="' + _button_id + '" class="btn btn-primary" style="width: 300px">'
            + _item.name
            + '</button>';

        $("#" + _col1_id).append(_button);

        // add badge to button
        let _badge_id = "badge" + i;
        let _badge = '&nbsp<span id="' + _badge_id + '" class="badge badge-light bg-secondary">&nbsp</span>&nbsp';

        $("#" + _button_id).append(_badge);

        // add text-box to col2
        let _text_id = "text" + i;
        let _text = '<textarea id="' + _text_id + '" class="form-control text-dark bg-light p-2" type="text" style="width: 300px" placeholder="'
            + _item.topic
            + '" readonly></textarea>'

        $("#" + _col2_id).append(_text);
    }

    console.debug("added ui-items: " + ui.items.length + " to '" + parent_id + "'");
}

/**
 * Attaches `onClick` callbacks dynamically. These callbacks trigger mqtt publish / subscribe
 * 
 * It assumes all items form `ui_setup.json` have `name` and `topic` fields
 * 
 * NOTE: when adding callbacks: if item has "message" will be created a mqtt-publisher, otherwise it will create a mqtt-subscriber
 * NOTE: one click for subscribing and one click for un-subscribing
 */
App.prototype.add_buttons_callbacks_dynamically = function () {

    for (let i = 0; i < ui.items.length; i++) {

        let _item = ui.items[i];
        let _id_button = 'button' + i;
        let _id_badge = "badge" + i;
        let _id_text = "text" + i;

        // it is a publish topic
        if (undefined !== _item.message) {
            $("#" + _id_button).on("click",
                function (e) {
                    console.debug(_id_button + " onClick");

                    if (!this.client.connected) {
                        console.error("Not connected to broker");
                        return;
                    }

                    // prevent attending burst of clicks
                    if (undefined === _item.processing) {
                        _item.processing = true;

                        this.client.publish(_item.topic, _item.message, { qos: _item.qos, retain: false },
                            function (e) {
                                $("#" + _id_badge).attr("class", "badge badge-light bg-warning");

                                let _str = "mqtt.client.published: " + _item.topic + " " + _item.message;
                                $("#" + _id_text).val(_str);

                                setTimeout( () => { 
                                    $("#" + _id_badge).attr("class", "badge badge-light bg-secondary");
                                }, 100);
                                
                                setTimeout(() => {
                                    $("#" + _id_text).val("");                                    
                                }, 1000);

                                console.debug(_str);

                                _item.processing = undefined;
                            }.bind(this)
                        );
                    }
                }.bind(this)
            );
        }
        // it is a subscribe topic
        else {
            $("#" + _id_button).on("click",
                function (e) {
                    console.debug(_id_button + " onClick");

                    if (!this.client.connected) {
                        console.error("Not connected to broker");
                        return;
                    }

                    // prevent attending burst of clicks
                    if (undefined === _item.processing) {
                        _item.processing = true;

                        if (undefined === _item.subscribed) {
                            this.client.subscribe(_item.topic, { qos: _item.qos, retain: false },
                                function (e) {
                                    $("#" + _id_badge).attr("class", "badge badge-light bg-success");

                                    let _str = "mqtt.client.subscribed: " + _item.topic;
                                    $("#" + _id_text).val(_str);

                                    console.debug(_str);

                                    // set "sub" flag
                                    _item.subscribed = true;
                                    _item.processing = undefined;
                                }.bind(this)
                            );
                        }
                        else {
                            this.client.unsubscribe(_item.topic,
                                function (e) {
                                    $("#" + _id_badge).attr("class", "badge badge-light bg-danger");

                                    let _str = "mqtt.client.unsubscribed: " + _item.topic;
                                    $("#" + _id_text).val(_str);

                                    console.debug(_str);

                                    // un-set "sub" flag
                                    _item.subscribed = undefined;
                                    _item.processing = undefined;
                                }.bind(this)
                            );
                        }
                    }
                }.bind(this)
            );
        }
    }

    console.debug("added ui-items callbacks: " + ui.items.length);
}

export default App