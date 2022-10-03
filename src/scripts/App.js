import UI_Config from './UI_Config';
import MqttClientHandler from './MqttClientHandler';

/**
 * Wraps all needed to create our UI from the `ui_setup.json` and adds publish / subscribe into the callbacks
 */
class App {
    constructor() {
        // initial config (can be replaced when loaded file at input-form)
        const _cbs_cfg = {
            on_done: this.on_ui_config_done.bind(this),
            on_failed: this.on_ui_config_failed.bind(this)
        };
        this.cfg = new UI_Config("./assets/ui_setup.json", _cbs_cfg);

        // mqtt
        const _cbs_mqtt = {
            on_connected: this.on_connected.bind(this),
            on_message_received: this.on_message_received.bind(this),
            on_disconnected: this.on_disconnected.bind(this),
            on_error: this.on_error.bind(this),
            on_reconnecting: this.on_reconnecting.bind(this)
        }
        this.mqtt_h = new MqttClientHandler(this.cfg, _cbs_mqtt);

        // ui
        this.add_input_form("container");
        this.id_list = this.add_tablist_group("container");
        this.add_broker_tab(this.id_list);
        this.add_broker_button_cb();
    }
}

App.prototype.on_ui_config_done = function (e) {
    $("#" + "text_broker_config").val(e);

    this.setup_ui();
}

App.prototype.on_ui_config_failed = function (error_) {
    $("#" + "text_broker_config").val(error_);
}

App.prototype.add_input_form = function (parent_id_) {
    const _id = "input_form";
    const _input_form = '<input id="' + _id + '" type="file" class="form-control"></input>'
    $("#" + parent_id_).append(_input_form);

    $("#" + _id).on("change",
        function (e) {
            console.debug(_id + ": on_change");

            if (undefined !== this.broker_button_timed) {
                clearTimeout(this.broker_button_timed);
                this.broker_button_timed = undefined;
            }
            if (undefined !== this.reconnect_timed) {
                clearTimeout(this.reconnect_timed);
                this.reconnect_timed = undefined;
            }

            const _input = document.getElementById(_id);
            const _file = _input.files[0];

            if (undefined === _file) {
                console.warn("No file selected");
            }
            else {
                console.debug("File selected" + _file.name);

                // create new config
                const _cbs = {
                    on_done: this.on_ui_config_done.bind(this),
                    on_failed: this.on_ui_config_failed.bind(this)
                }
                this.cfg = new UI_Config(_file, _cbs);

                this.reset_broker_tab_status();
                this.mqtt_h.disconnect_from_mqtt_broker();
            }
        }.bind(this)
    );

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
    // it will be filled when connect_to_mqtt_broker
    const _id_text_config = this.add_textarea(_id_col2, _sufix + "_config", "");
}

App.prototype.reset_broker_tab_status = function () {
    const _button = $("#" + "button_broker");
    _button.prop("disabled", false);

    const _badge = $("#" + "badge_broker");
    _badge.text("Status");
    _badge.attr("class", "badge badge-light bg-secondary");
}

App.prototype.add_broker_button_cb = function () {
    const _id_button = "button_broker";

    $("#" + _id_button).on("click",
        function (e) {
            console.debug(_id_button + ": onClick");

            // avoid burst of clicks
            if (undefined === this.broker_button_timed) {
                $("#" + _id_button).prop("disabled", true);

                if (this.mqtt_h.client_not_created()) {
                    this.mqtt_h.connect_to_mqtt_broker();
                }
                else {
                    this.disconnect_and_disable();
                }

                this.broker_button_timed = setTimeout(() => {
                    $("#" + "button_broker").prop("disabled", false);

                    this.broker_button_timed = undefined;
                }, 500);
            }
        }.bind(this)
    );
}

/**
 * Assummes `this.ui` is already filled and format is correct
 * 1. Removes previous tabs (if existing)
 * 2. Adds new tabs and filles the new items
 * 3. Attaches buttons callbacks
 * 4. Disables all buttons initilly
 */
 App.prototype.setup_ui = function () {
    this.remove_items_from_tablist();
    this.add_items_to_tablist(this.id_list);
    this.add_buttons_cb();
    this.disable_all_buttons_of_topics();
}

/**
 * Removes all tabs except `tab_broker`
 */
App.prototype.remove_items_from_tablist = function () {
    console.debug("removing previous items from tablist (if existing)")

    const _children = $("#" + "list_tab").children();
    for (let i = 0; i < _children.length; i++) {
        let _c = _children[i]
        if ("tab_broker" != _c.id) {
            _c.remove();
        }
    }
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
App.prototype.add_items_to_tablist = function (parent_id_) {
    console.debug("adding new items into tablist")

    const _items = this.cfg.ui.items;
    for (let i = 0; i < _items.length; i++) {
        let _item = _items[i];

        let _id_tab = this.add_tab(parent_id_, i);
        let _id_row = this.add_row(_id_tab, i);
        let _id_col1 = this.add_col(_id_row, i, 1);
        let _id_col2 = this.add_col(_id_row, i, 2);
        let _id_button = this.add_button(_id_col1, i, _item.name);
        let _id_badge = this.add_badge(_id_button, i);
        let _id_text = this.add_textarea(_id_col2, i, _item.topic);
    }

    console.debug("added ui-items: " + _items.length + " to '" + parent_id_ + "'");
}

/**
 * Attaches `onClick` callbacks dynamically. These callbacks trigger mqtt publish / subscribe
 * 
 * It assumes all items form `ui_setup.json` have `name` and `topic` fields
 * 
 * NOTE: when adding callbacks: if item has "message" will be created a mqtt-publisher, otherwise it will create a mqtt-subscriber
 * NOTE: one click for subscribing and one click for un-subscribing
 */
App.prototype.add_buttons_cb = function () {

    const _items = this.cfg.ui.items;
    for (let i = 0; i < _items.length; i++) {

        let _item = _items[i];
        let _id_button = 'button' + i;
        let _id_badge = "badge" + i;
        let _id_text = "text" + i;

        // it is a publish topic
        if (undefined !== _item.message) {
            $("#" + _id_button).on("click",
                function (e) {
                    console.debug(_id_button + " onClick");

                    if (!this.mqtt_h.is_connected()) {
                        console.error("Not connected to broker");
                        return;
                    }

                    // prevent attending burst of clicks
                    if (undefined === _item.processing) {
                        _item.processing = true;

                        this.mqtt_h.client.publish(_item.topic, _item.message, { qos: _item.qos, retain: false },
                            function (e) {
                                $("#" + _id_badge).attr("class", "badge badge-light bg-warning");
                                $("#" + _id_text).val(_item.message);
                                $("#" + _id_button).prop("disabled", true);

                                let _str = "mqtt.client.published: " + _item.topic + " " + _item.message;
                                console.debug(_str);

                                setTimeout(() => {
                                    $("#" + _id_badge).attr("class", "badge badge-light bg-secondary");
                                }, 100);

                                setTimeout(() => {
                                    $("#" + _id_text).val("");
                                    $("#" + _id_button).prop("disabled", false);
                                    _item.processing = undefined;
                                }, 300);
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

                    if (!this.mqtt_h.is_connected()) {
                        console.error("Not connected to broker");
                        return;
                    }

                    // prevent attending burst of clicks
                    if (undefined === _item.processing) {
                        _item.processing = true;

                        if (undefined === _item.subscribed) {
                            this.mqtt_h.client.subscribe(_item.topic, { qos: _item.qos, retain: false },
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
                            this.mqtt_h.client.unsubscribe(_item.topic,
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

    console.debug("added ui-items callbacks: " + _items.length);
}

App.prototype.set_broker_info_text = function () {
    const _broker = this.cfg.ui.mqtt_broker;
    const _url = "mqtt://" + _broker.host + ":" + _broker.port;
    const _options = _broker.options;
    const _options_str = "clientId " + _options.clientId + "\n"
        + "keepalive " + _options.keepalive + "\n"
        + "reconnect " + _options.reconnectPeriod + "\n"
        + "connectTimeout " + _options.connectTimeout;
    const _content = _url + "\n" + _options_str;

    $("#" + "text_broker_config").val(_content);
}

App.prototype.unset_broker_info_text = function () {
    $("#" + "text_broker_config").val("");
}

App.prototype.disable_all_buttons_of_topics = function () {
    for (let i = 0; i < this.cfg.ui.items.length; i++) {
        let _id_button = "button" + i;
        $("#" + _id_button).prop("disabled", true);
    }
}

App.prototype.enable_all_buttons_of_topics = function () {
    for (let i = 0; i < this.cfg.ui.items.length; i++) {
        let _id_button = "button" + i;
        $("#" + _id_button).prop("disabled", false);
    }
}

/**
 * Disconnects from mqtt broker and disables buttons of topics
 */
App.prototype.disconnect_and_disable = function () {
    this.mqtt_h.disconnect_from_mqtt_broker();

    this.disable_all_buttons_of_topics();
    this.unset_broker_info_text();
}

/**
 * Changes badge-status to `Connected`, button-broker to `Disconnect` and enables all buttons of topics
 */
App.prototype.on_connected = function () {
    const _id_badge = "badge_broker";
    $("#" + _id_badge).text("Connected");
    $("#" + _id_badge).attr("class", "badge badge-light bg-success");

    this.set_broker_info_text();
    this.enable_all_buttons_of_topics();
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
        this.reconnect_timed = setTimeout(() => {
            if (!this.mqtt_h.is_connected()) {
                $("#" + _id_badge).text("Status");
                $("#" + _id_badge).attr("class", "badge badge-light bg-secondary");
            }

            this.reconnect_timed = undefined;
        }, 500);
        // less than 1000 defined as reconnectTimeout
    }
}

/**
 * Show received message into the corresponding item text-box
 */
App.prototype.on_message_received = function (topic_, message_, packet_) {

    const _item = this.get_item_from_topic(topic_);
    if (undefined === _item) {
        console.error("Topic not found: " + topic_ + ". This should not happen.");
        return;
    }

    let _id_text = "text" + _item.index;
    $("#" + _id_text).val(message_);

    if (undefined === this.message_timed) {
        // set flag
        this.message_timed = true;

        setTimeout(() => {
            $("#" + _id_text).val("");

            // un-set flag
            this.message_timed = undefined;
        }, 1000);
    }
}

App.prototype.get_item_from_topic = function (topic_) {
    let _item = undefined;
    const _items = this.cfg.ui.items;
    for (let i = 0; i < _items.length; i++) {
        if (topic_ == _items[i].topic) {
            _item = _items[i];
            _item.index = i;
            break;
        }
    }

    return _item;
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

export default App