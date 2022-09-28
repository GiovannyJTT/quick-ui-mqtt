import * as mqtt from 'mqtt'
import ui from './ui_setup.json'

/**
 * Wraps all needed to create our UI from the `ui_setup.json` and adds publish / subscribe into the callbacks
 */
class App {
    constructor() {
        this.id_list = this.add_tablist_group("container");

        this.add_broker_tab(this.id_list);
        this.add_broker_button_cb();

        this.add_items_to_tablist_dynamically(this.id_list);
        this.add_buttons_cb_dynamically();
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

            this.on_connected();
        }.bind(this)
    );

    // on message received event
    this.client.on("message",
        function (topic, message, packet) {
            console.debug("mqtt.client: received message: '" + message + "' on '" + topic + "'");

            this.on_message_received(topic, message, packet);
        }.bind(this)
    );

    // on disconnect event
    this.client.on("disconnect",
        function (e) {
            console.warn("mqtt.client: disconnected: '" + !this.client.connected + "' from broker: '" + _url + "'");

            this.on_disconnected();
        }.bind(this)
    );

    // on offline
    this.client.on("error",
        function (e) {
            console.warn("mqtt.client: error: '" + JSON.stringify(e) + "'");

            this.on_error(e);
        }.bind(this)
    )

    // on reconnecting event
    this.client.on("reconnect",
        function (e) {
            console.warn("mqtt.client: connection lost, reconnecting...");

            this.on_reconnecting();
        }.bind(this)
    );
}

/**
 * Removes all listeners (subscribers), closes connection to mqtt-broker, deletes mqtt-client,
 *  and disables all buttons of topics
 */
App.prototype.disconnect_from_mqtt_broker = function () {
    console.debug("mqtt.client: explicitly disconnecting from broker")

    this.client.end(true);
    this.on_disconnected();
    this.client = undefined;

    for (let i = 0; i < ui.items.length; i++) {
        let _id_button = "button" + i;
        $("#" + _id_button).prop("disabled", true);
    }
} 

/**
 * Changes badge status to `Connected`, button to `Disconnect and enables all buttons of topics
 */
App.prototype.on_connected = function () {
    const _id_badge = "badge_broker";
    $("#" + _id_badge).text("Connected");
    $("#" + _id_badge).attr("class", "badge badge-light bg-success");

    for (let i = 0; i < ui.items.length; i++) {
        let _id_button = "button" + i;
        $("#" + _id_button).prop("disabled", false);
    }
}

App.prototype.on_disconnected = function () {
    const _id_badge = "badge_broker";
    $("#" + _id_badge).text("Disconnected");
    $("#" + _id_badge).attr("class", "badge badge-light bg-danger");
}

App.prototype.on_error = function (e) {
    const _id_text = "text_broker_status";
    $("#" + _id_text).val("error: " + JSON.stringify(e));
}

App.prototype.on_reconnecting = function () {
    const _id_badge = "badge_broker";
    $("#" + _id_badge).text("Reconnecting");
    $("#" + _id_badge).attr("class", "badge badge-light bg-warning");

    if (undefined === this.reconnect_timed) {
        this.reconect_timed = true;

        setTimeout(() => {
            if (!this.client.connected) {
                $("#" + _id_badge).text("Status");
                $("#" + _id_badge).attr("class", "badge badge-light bg-secondary");
            }

            this.reconect_timed = undefined;
        }, 500);
        // less than 1000 defined as reconnectTimeout
    }
}

/**
 * Show received message into the corresponding text-box
 */
App.prototype.on_message_received = function (topic_, message_, packet_) {

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

    if (undefined === this.message_timed) {
        // set flag
        this.message_timed = setTimeout(() => {
            $("#" + _id_text).val("");

            // un-set flag
            this.message_timed = undefined;
        }, 1000);
    }
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
    const _id = "list_tab";
    const _list = '<div id="' + _id + '" class="list-group" role="tablist"></div>'
    $("#" + parent_id_).append(_list);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

App.prototype.add_tab = function (parent_id_, sufix_) {
    let _id = "tab" + sufix_;
    let _tab = '<a id="' + _id + '" class="list-group-item" role="tab"></a>';
    $("#" + parent_id_).append(_tab);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

App.prototype.add_row = function (parent_id_, sufix_) {
    let _id = "row" + sufix_;
    let _row = '<div id="' + _id + '" class="row justify-content-md-center"></div>';
    $("#" + parent_id_).append(_row);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

App.prototype.add_col = function (parent_id_, sufix_, col_num_) {
    if (undefined === col_num_) {
        console.error("add_col: col_num undefined");
        return;
    }

    let _id = "col" + sufix_ + "_" + col_num_;
    let _col = '<div id="' + _id + '" class="col-md-auto"></div>';
    $("#" + parent_id_).append(_col);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

App.prototype.add_button = function (parent_id_, sufix_, name_) {
    let _id = "button" + sufix_;
    let _button = '<button id="' + _id + '" class="btn btn-primary" style="width: 300px">'
        + name_
        + '</button>';
    $("#" + parent_id_).append(_button);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

App.prototype.add_badge = function (parent_id_, sufix_) {
    let _id = "badge" + sufix_;
    let _badge = '&nbsp<span id="' + _id + '" class="badge badge-light bg-secondary">&nbsp</span>&nbsp';
    $("#" + parent_id_).append(_badge);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

App.prototype.add_textarea = function (parent_id_, sufix_, topic_) {
    let _id = "text" + sufix_;
    let _text = '<textarea id="' + _id + '" class="form-control text-dark bg-light" type="text" style="width: 300px" placeholder="'
        + topic_
        + '" readonly></textarea>'
    $("#" + parent_id_).append(_text);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

App.prototype.add_broker_tab = function (parent_id_) {
    const _sufix = "_broker";

    const _id_tab = this.add_tab(parent_id_, _sufix);
    const _id_row = this.add_row(_id_tab, _sufix);
    const _id_col1 = this.add_col(_id_row, _sufix, 1);
    const _id_col2 = this.add_col(_id_row, _sufix, 2);

    // add button to col1
    const _id_button = this.add_button(_id_col1, _sufix, "Connect / Disconnect");

    // add badge to button. Badge value will be updated `on_connected`, `on_reconnect`
    const _id_badge = this.add_badge(_id_button, _sufix);
    $("#" + _id_badge).text("Status");
    $("#" + _id_badge).attr("class", "badge badge-light bg-secondary");

    // add text_config to col2
    const _url = "mqtt://" + ui.mqtt_broker.host + ":" + ui.mqtt_broker.port;
    const _options = ui.mqtt_broker.options;
    const _options_str = "clientId " + _options.clientId + "\n"
        + "keepalive " + _options.keepalive + "\n"
        + "reconnect " + _options.reconnectPeriod + "\n"
        + "connectTimeout " + _options.connectTimeout;
    const _content = _url + "\n" + _options_str;

    const _id_text_config = this.add_textarea(_id_col2, _sufix + "_config", _content);
}

App.prototype.add_broker_button_cb = function () {
    const _id_button = "button_broker";

    $("#" + _id_button).on("click",
        function (e) {
            // avoid burst of clicks
            if (undefined === this.broker_button_timed) {
                this.broker_button_timed = true;
                $("#" + _id_button).prop("disabled", true);

                setTimeout(
                    function (e) {
                        $("#" + "button_broker").prop("disabled", false);
                        this.broker_button_timed = undefined;
                    }.bind(this),
                    500);

                if (undefined === this.client) {
                    this.connect_to_mqtt_broker();
                }
                else {
                    this.disconnect_from_mqtt_broker();
                }
            }
        }.bind(this)
    );
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

        let _id_tab = this.add_tab(parent_id_, i);
        let _id_row = this.add_row(_id_tab, i);
        let _id_col1 = this.add_col(_id_row, i, 1);
        let _id_col2 = this.add_col(_id_row, i, 2);
        let _id_button = this.add_button(_id_col1, i, _item.name);
        let _id_badge = this.add_badge(_id_button, i);
        let _id_text = this.add_textarea(_id_col2, i, _item.topic);
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
App.prototype.add_buttons_cb_dynamically = function () {

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

                    if (undefined === this.client || !this.client.connected) {
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

                    if (undefined === this.client || !this.client.connected) {
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

export default App