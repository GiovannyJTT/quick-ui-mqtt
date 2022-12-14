import Config from './Config';
import MqttClientHandler from './MqttClientHandler';
import UI from './UI';

class App {
    /**
     * This class creates instance of `MqttClientHandler` and `UI` and performs cross-instance operations between them
     * 
     * Passes the callbacks to be run `on_config_done`, `on_config_failed`
     * 
     * Adds to UI: `input-form` and `broker-tab` (`button` and `text-area`)
     */
    constructor() {
        // initial config (can be replaced when loaded file at input-form)
        const _cbs_cfg = {
            on_done: this.on_config_done.bind(this),
            on_failed: this.on_config_failed.bind(this)
        };
        this.cfg = new Config("./assets/ui_setup.json", _cbs_cfg);

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
        this.ui = new UI();
        this.ui.add_input_form("container");
        this.ui.add_input_form_cb(this.on_changed_input_file.bind(this));
        
        this.ui.add_tablist_group("container");
        
        this.ui.add_broker_tab("list_tab");
        this.ui.add_broker_button_cb(this.on_clicked_broker_button.bind(this));
    }
}

App.prototype.on_config_done = function (e) {
    this.ui.update_broker_text(e);
    this.ui.setup_ui(this.cfg.data, this.mqtt_h);
}

App.prototype.on_config_failed = function (error_) {
    this.ui.update_broker_text(error_);
}

App.prototype.on_changed_input_file = function (e) {

    if (undefined !== this.broker_button_timed) {
        clearTimeout(this.broker_button_timed);
        this.broker_button_timed = undefined;
    }
    if (undefined !== this.reconnect_timed) {
        clearTimeout(this.reconnect_timed);
        this.reconnect_timed = undefined;
    }

    const _input = document.getElementById("input_form");
    const _file = _input.files[0];

    if (undefined === _file) {
        console.warn("No file selected");
    }
    else {
        console.debug("File selected: " + _file.name);

        // create new config
        const _cbs_cfg = {
            on_done: this.on_config_done.bind(this),
            on_failed: this.on_config_failed.bind(this)
        }
        this.cfg = new Config(_file, _cbs_cfg);

        this.ui.reset_broker_tab_status();
        this.mqtt_h.disconnect_from_mqtt_broker();
    }
}

App.prototype.on_clicked_broker_button = function () {

    // avoid burst of clicks
    if (undefined === this.broker_button_timed) {
        this.ui.disable_broker_button(true);

        if (this.mqtt_h.client_not_created()) {
            this.mqtt_h.connect_to_mqtt_broker();
        }
        else {
            this.disconnect_and_disable();
        }

        this.broker_button_timed = setTimeout(() => {
            this.ui.disable_broker_button(false);
            this.broker_button_timed = undefined;
        }, 500);
    }
}

/**
 * Disconnects from mqtt broker and disables buttons of topics
 */
App.prototype.disconnect_and_disable = function () {
    this.mqtt_h.disconnect_from_mqtt_broker();
    this.ui.disable_all_buttons_of_topics(this.cfg.data);
    this.ui.unset_broker_info_text();
}

/**
 * Changes badge-status to `Connected`, button-broker to `Disconnect` and enables all buttons of topics
 */
App.prototype.on_connected = function () {
    this.ui.set_broker_badge_connected();
    this.ui.set_broker_info_text(this.cfg.data);
    this.ui.enable_all_buttons_of_topics(this.cfg.data);
}

/**
 * Do this just after mqtt client got `disconnected`
 */
App.prototype.on_disconnected = function () {
    this.ui.set_broker_badge_disconnected();
}

/**
 * Do this just after mqtt client got `error` in the communication
 */
 App.prototype.on_error = function (e) {
    const _str = "Error: " + JSON.stringify(e);
    this.ui.update_broker_text(_str)
}

/**
 * Do this just after mqtt client got `reconnecting` (because it lost connection with broker)
 */
App.prototype.on_reconnecting = function () {

    this.ui.set_broker_badge_reconnecting();

    if (undefined === this.reconnect_timed) {

        this.reconnect_timed = setTimeout(() => {
            
            if (!this.mqtt_h.is_connected()) {
                this.ui.set_broker_badge_idle();
            }

            this.reconnect_timed = undefined;
        }, 500);
        // less than 1000 defined as reconnectTimeout
    }
}

/**
 * Do this just after mqtt client got a received `message`
 * 
 * Show received message into the corresponding item text-box
 */
App.prototype.on_message_received = function (topic_, message_, packet_) {

    const _item = this.cfg.get_item_from_topic(topic_);
    if (undefined === _item) {
        console.error("Topic not found: " + topic_ + ". This should not happen.");
        return;
    }

    this.ui.update_item_text(_item, message_)

    if (undefined === this.message_timed) {
        // set flag
        this.message_timed = true;

        setTimeout(() => {
            this.ui.update_item_text(_item, "");

            // un-set flag
            this.message_timed = undefined;
        }, 1000);
    }
}

export default App