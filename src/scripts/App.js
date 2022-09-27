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
        const _list_id = this.add_tablist_group("container");
        this.add_items_to_tablist_dynamically(_list_id);
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

            this.on_message_received(topic, message);
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

App.prototype.check_item_fields = function (item_) {
    if (undefined === item_.topic) {
        console.error("item " + i + " has no 'topic': " + JSON.stringify(item_) + ". Aborting");
        return false;
    }

    if (undefined === item_.name) {
        console.error("item " + i + " has no 'name': " + JSON.stringify(item_) + ". Aborting");
        return false;
    }

    if (undefined === item_.qos) {
        console.error("item " + i + " has no 'qos': " + JSON.stringify(item_) + ". Aborting");
        return false;
    }

    return true;
}

/**
 * Creates an empty bootstrap-list of tabs that will be filled with ui-items (vertically)
 */
App.prototype.add_tablist_group = function (parent_id_) {
    const _list_id = "list_tab";
    const _list = '<div id="' + _list_id + '" class="list-group" role="tablist"></div>'
    $("#" + parent_id_).append(_list);

    console.debug("added '" + _list_id + "' to '" + parent_id_ + "'");
    return _list_id;
}

App.prototype.add_tab = function (parent_id_) {
    let _tab_id = "tab" + i;
    let _tab = '<a id="' + _tab_id + '" class="list-group-item" role="tab"></a>';
    $("#" + parent_id_).append(_tab);

    return _tab_id;
}

App.prototype.add_row = function (parent_id_) {
    let _row_id = "row" + i;
    let _row = '<div id="' + _row_id + '" class="row justify-content-md-center"></div>';
    $("#" + parent_id_).append(_row);

    return _row_id;
}

App.prototype.add_col1 = function (parent_id_) {
    let _col1_id = "col" + i + "_1";
    let _col1 = '<div id="' + _col1_id + '" class="col-md-auto"></div>';
    $("#" + parent_id_).append(_col1);

    return _col1_id;
}

App.prototype.add_col2 = function (parent_id_) {
    let _col2_id = "col" + i + "_2";
    let _col2 = '<div id="' + _col2_id + '" class="col-md-auto"></div>';
    $("#" + parent_id_).append(_col2);

    return _col2_id;
}

App.prototype.add_button = function (parent_id_) {
    let _button_id = "button" + i;
    let _button = '<button id="' + _button_id + '" class="btn btn-primary" style="width: 300px">'
        + _item.name
        + '</button>';
    $("#" + parent_id_).append(_button);

    return _button_id;
}

App.prototype.add_badge = function (parent_id_) {
    let _badge_id = "badge" + i;
    let _badge = '&nbsp<span id="' + _badge_id + '" class="badge badge-light bg-secondary">&nbsp</span>&nbsp';
    $("#" + parent_id_).append(_badge);

    return _badge_id;
}

App.prototype.add_text = function (parent_id_) {
    let _text_id = "text" + i;
    let _text = '<textarea id="' + _text_id + '" class="form-control text-dark bg-light" type="text" style="width: 300px" placeholder="'
        + _item.topic
        + '" readonly></textarea>'
    $("#" + parent_id_).append(_text);

    return _text_id;
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
App.prototype.add_items_to_tablist_dynamically = function (parent_id_) {

    for (let i = 0; i < ui.items.length; i++) {

        let _item = ui.items[i];

        if (!this.check_item_fields(_item)) {
            return;
        }

        let _tab_id = this.add_tab(parent_id_);
        let _row_id = this.add_row(_tab_id);
        let _col1_id = this.add_col1(_row_id);
        let _col2_id = this.add_col2(_row_id);
        let _button_id = this.add_button(_col1_id);
        let _badge_id = this.add_badge(_button_id);
        let _text_id = this.add_text(_col2_id);
    }

    console.debug("added ui-items: " + ui.items.length + " to '" + parent_id_ + "'");
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
                                $("#" + _id_text).val(_item.message);
                                $("#" + _id_button).prop("disabled", true);

                                setTimeout(() => {
                                    $("#" + _id_badge).attr("class", "badge badge-light bg-secondary");
                                }, 100);

                                setTimeout(() => {
                                    $("#" + _id_text).val("");
                                    $("#" + _id_button).prop("disabled", false);
                                }, 1000);

                                let _str = "mqtt.client.published: " + _item.topic + " " + _item.message;
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

/**
 * Show received message into the corresponding text-box
 */
App.prototype.on_message_received = function (topic_, message_) {

    let _item = undefined;
    for (let i = 0; i < ui.items.length; i++) {
        if (topic_ == ui.items[i].topic) {
            _item = ui.items[i];
            _item.index = i;
            break;
        }
    }

    if (undefined === _item) {
        console.error("Topic not found in ui.items: " + topic_ + ". This should not happen.");
        return;
    }

    let _id_text = "text" + _item.index;
    $("#" + _id_text).val(message_);

    if (undefined === this.timed) {
        // set flag
        this.timed = setTimeout(() => {
            $("#" + _id_text).val("");

            // un-set flag
            this.timed = undefined;
        }, 1000);
    }
}

export default App