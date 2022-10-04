import MqttClientHandler from "./MqttClientHandler";

class UI {
    /**
     * Constains all necessary methods for dyanmic creation of UI items (tabs, buttons, text-area, etc)
     * Uses bootstrap (hence ajax and jquery)
     */
    constructor() {
    }
}

UI.prototype.add_input_form = function (parent_id_) {
    const _id = "input_form";
    const _input_form = '<input id="' + _id + '" type="file" class="form-control"></input>'
    $("#" + parent_id_).append(_input_form);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

UI.prototype.add_input_form_cb = function (cb_) {
    const _id = "input_form";
    $("#" + _id).on("change",
        function (e) {
            console.debug(_id + ": on_change");
            cb_();
        }
    );

    console.debug("add_input_form_cb: added callback");
}

/**
 * Creates an empty bootstrap-list of tabs that will be filled with ui-items (vertically)
 */
UI.prototype.add_tablist_group = function (parent_id_) {
    const _id = "list_tab";
    const _list = '<div id="' + _id + '" class="list-group" role="tablist"></div>'
    $("#" + parent_id_).append(_list);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

/**
 * 1. Creates `tab_broker` with 2 children: `column 1` and `column 2`
 * 2. Attaches `button_broker` to `col 1` and `text_broker` to `col 2`
 * 3. `text_broker` will reflect broker status (loaded, wrong format) or broker info when connected (host, port, etc)
 * @param {String} parent_id_ 
 */
UI.prototype.add_broker_tab = function (parent_id_) {
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

    // add text to col2
    // it will reflect broker status (loaded, wrong format) or broker info when connected (host, port, etc)
    const _id_text = this.add_textarea(_id_col2, _sufix, "");
}

UI.prototype.add_broker_button_cb = function (cb_) {
    const _id = "button_broker";
    $("#" + _id).on("click",
        function (e) {
            console.debug(_id + ": onClick");
            cb_();
        }
    );

    console.debug("add_broker_button_cb: added callback");
}

UI.prototype.reset_broker_tab_status = function () {
    const _button = $("#" + "button_broker");
    _button.prop("disabled", false);

    const _badge = $("#" + "badge_broker");
    _badge.text("Status");
    _badge.attr("class", "badge badge-light bg-secondary");
}

UI.prototype.disable_broker_button = function (disable_) {
    $("#" + "button_broker").prop("disabled", disable_);
}

// compound elements (tabs)

/**
 * Triggers all methods needed to create the list of tabs (buttons and text) for each topic
 * 
 * Assummes `this.cfg` is already filled and format is correct
 * 
 * 1. Removes previous tabs (if existing)
 * 2. Adds new tabs and filles the new items
 * 3. Attaches buttons callbacks
 * 4. Disables all buttons initilly
 */
UI.prototype.setup_ui = function (data_, mqtt_h_) {
    this.remove_items_from_tablist();
    this.add_items_to_tablist(data_);
    this.disable_all_buttons_of_topics(data_);
    this.add_buttons_cb(data_, mqtt_h_);
}

/**
 * Removes all tabs except `tab_broker`
 */
UI.prototype.remove_items_from_tablist = function () {
    console.debug("removing previous items from tablist (if existing)")

    const _parent_id = "list_tab";
    const _children = $("#" + _parent_id).children();

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
 * 
 * @param {Dictionary} data_ json containing UI configuration
 */
UI.prototype.add_items_to_tablist = function (data_) {
    console.debug("adding new items into tablist")

    const _parent_id = "list_tab";
    const _items = data_.items;

    for (let i = 0; i < _items.length; i++) {
        let _item = _items[i];

        let _id_tab = this.add_tab(_parent_id, i);
        let _id_row = this.add_row(_id_tab, i);
        let _id_col1 = this.add_col(_id_row, i, 1);
        let _id_col2 = this.add_col(_id_row, i, 2);
        let _id_button = this.add_button(_id_col1, i, _item.name);
        let _id_badge = this.add_badge(_id_button, i);
        let _id_text = this.add_textarea(_id_col2, i, _item.topic);
    }

    console.debug("added ui-items: " + _items.length + " to '" + _parent_id + "'");
}

UI.prototype.disable_all_buttons_of_topics = function (data_) {
    for (let i = 0; i < data_.items.length; i++) {
        let _id = "button" + i;
        $("#" + _id).prop("disabled", true);
    }
}

UI.prototype.enable_all_buttons_of_topics = function (data_) {
    for (let i = 0; i < data_.items.length; i++) {
        let _id = "button" + i;
        $("#" + _id).prop("disabled", false);
    }
}

/**
 * Attaches `onClick` callbacks dynamically. These callbacks trigger mqtt publish / subscribe
 * 
 * It assumes all items form `ui_setup.json` have `name` and `topic` fields
 * 
 * NOTE: when adding callbacks: if item has "message" will be created a mqtt-publisher, otherwise it will create a mqtt-subscriber
 * NOTE: one click for subscribing and one click for un-subscribing
 * 
 * @param {Dictionary} data_ json containing UI configuration
 * @param {MqttClientHandler} mqtt_h_ mqtt client handler instance to trigger publish / subscribe / unsubscribe
 */
UI.prototype.add_buttons_cb = function (data_, mqtt_h_) {

    const _items = data_.items;
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

                    if (!mqtt_h_.is_connected()) {
                        console.error("Not connected to broker");
                        return;
                    }

                    // prevent attending burst of clicks
                    if (undefined === _item.processing) {
                        _item.processing = true;

                        const _on_published = function (e) {
                            $("#" + _id_badge).attr("class", "badge badge-light bg-warning");
                            $("#" + _id_text).val(_item.message);
                            $("#" + _id_button).prop("disabled", true);

                            setTimeout(() => {
                                $("#" + _id_badge).attr("class", "badge badge-light bg-secondary");
                            }, 100);

                            setTimeout(() => {
                                $("#" + _id_text).val("");
                                $("#" + _id_button).prop("disabled", false);
                                _item.processing = undefined;
                            }, 300);
                        }.bind(this);

                        mqtt_h_.publish(_item, _on_published)
                    }
                }.bind(this)
            );
        }
        // it is a subscribe topic
        else {
            $("#" + _id_button).on("click",
                function (e) {
                    console.debug(_id_button + " onClick");

                    if (!mqtt_h_.is_connected()) {
                        console.error("Not connected to broker");
                        return;
                    }

                    // prevent attending burst of clicks
                    if (undefined === _item.processing) {
                        _item.processing = true;

                        if (undefined === _item.subscribed) {

                            const _on_subscribed = function (e) {
                                $("#" + _id_badge).attr("class", "badge badge-light bg-success");

                                // set "sub" flag
                                _item.subscribed = true;
                                _item.processing = undefined;
                            }.bind(this);

                            mqtt_h_.subscribe(_item, _on_subscribed);
                        }
                        else {

                            const _on_unsubscribed = function (e) {
                                $("#" + _id_badge).attr("class", "badge badge-light bg-danger");

                                // un-set "sub" flag
                                _item.subscribed = undefined;
                                _item.processing = undefined;
                            }.bind(this);

                            mqtt_h_.unsubscribe(_item, _on_unsubscribed)
                        }
                    }
                }.bind(this)
            );
        }
    }

    console.debug("added ui-items callbacks: " + _items.length);
}

// update elements

UI.prototype.set_broker_info_text = function (data_) {
    const _broker = data_.mqtt_broker;
    const _url = "mqtt://" + _broker.host + ":" + _broker.port;
    const _options = _broker.options;
    const _options_str = "clientId " + _options.clientId + "\n"
        + "keepalive " + _options.keepalive + "\n"
        + "reconnect " + _options.reconnectPeriod + "\n"
        + "connectTimeout " + _options.connectTimeout;
    const _content = _url + "\n" + _options_str;

    this.update_broker_text(_content)
}

UI.prototype.unset_broker_info_text = function () {
    this.update_broker_text("");
}

UI.prototype.update_broker_text = function (txt_) {
    $("#" + "text_broker").val(txt_);
}

UI.prototype.set_broker_badge_connected = function () {
    const _id = "badge_broker";
    $("#" + _id).text("Connected");
    $("#" + _id).attr("class", "badge badge-light bg-success");
}

UI.prototype.set_broker_badge_disconnected = function () {
    const _id = "badge_broker";
    $("#" + _id).text("Disconnected");
    $("#" + _id).attr("class", "badge badge-light bg-danger");
}

UI.prototype.set_broker_badge_reconnecting = function () {
    const _id = "badge_broker";
    $("#" + _id).text("Reconnecting");
    $("#" + _id).attr("class", "badge badge-light bg-warning");
}

UI.prototype.set_broker_badge_idle = function () {
    const _id = "badge_broker";
    $("#" + _id).text("Status");
    $("#" + _id).attr("class", "badge badge-light bg-secondary");
}

// single elements

UI.prototype.add_tab = function (parent_id_, sufix_) {
    const _id = "tab" + sufix_;
    const _tab = '<a id="' + _id + '" class="list-group-item" role="tab"></a>';
    $("#" + parent_id_).append(_tab);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

UI.prototype.add_row = function (parent_id_, sufix_) {
    const _id = "row" + sufix_;
    const _row = '<div id="' + _id + '" class="row justify-content-md-center"></div>';
    $("#" + parent_id_).append(_row);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

UI.prototype.add_col = function (parent_id_, sufix_, col_num_) {
    if (undefined === col_num_) {
        console.error("add_col: col_num undefined");
        return;
    }

    const _id = "col" + sufix_ + "_" + col_num_;
    const _col = '<div id="' + _id + '" class="col-md-auto"></div>';
    $("#" + parent_id_).append(_col);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

UI.prototype.add_button = function (parent_id_, sufix_, name_) {
    const _id = "button" + sufix_;
    const _button = '<button id="' + _id + '" class="btn btn-primary" style="width: 300px">'
        + name_
        + '</button>';
    $("#" + parent_id_).append(_button);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

UI.prototype.add_badge = function (parent_id_, sufix_) {
    const _id = "badge" + sufix_;
    const _badge = '&nbsp<span id="' + _id + '" class="badge badge-light bg-secondary">&nbsp</span>&nbsp';
    $("#" + parent_id_).append(_badge);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

UI.prototype.add_textarea = function (parent_id_, sufix_, topic_) {
    const _id = "text" + sufix_;
    const _text = '<textarea id="' + _id + '" class="form-control text-dark bg-light" type="text" style="width: 300px" placeholder="'
        + topic_
        + '" readonly></textarea>'
    $("#" + parent_id_).append(_text);

    console.debug("added '" + _id + "' to '" + parent_id_ + "'");
    return _id;
}

UI.prototype.update_item_text = function (item_, txt_) {
    const _id = "text" + item_.index;
    $("#" + _id).val(txt_);
}

UI.prototype.update_broker_text = function (txt_) {
    $("#" + "text_broker_config").val(txt_);
}

export default UI;