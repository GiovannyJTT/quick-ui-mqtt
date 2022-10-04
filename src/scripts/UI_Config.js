
/**
 * Wraps all methods needed to get the ui_setup in a json structure
 * 
 * It will be loaded either from url, server-side file or client-side file
 */
class UI_Config {
    constructor (file_or_url_, callbacks_) {
        this.file_or_url = file_or_url_;
        if (undefined === this.file_or_url)  {
            console.error("UI_Config: 'file_url' is undefined. Not constructed")
            return;
        }

        this.data = undefined;
        this.on_done = callbacks_["on_done"];
        this.on_failed = callbacks_["on_failed"];

        this.get_config();
    }
}

UI_Config.prototype.is_file = function (object_) {
    if (this.is_string(object_)) {
        // is url
        return false;
    }
    else {
        // is a blob with name as string (means it is a file)
        return typeof object_.name == "string";
    }
}

UI_Config.prototype.is_string = function (object_) {
    return (typeof object_ == "string");
}

/**
 * Checks if it is a `File` or an `URL` (string)
 * 
 * `URL` (can be on server-side or on client-local-side)
 */
 UI_Config.prototype.get_config = function () {
    if (this.is_file(this.file_or_url)) {
        console.debug("UI_Config: loading client-side json-file: " + this.file_or_url.name);
        this.get_json_from_local();
    }
    else if (this.is_string(this.file_or_url)) {
        if (this.file_or_url.startsWith("http:/")) {
            console.debug("UI_Config: loading external json-file: " + this.file_or_url);
        }
        else {
            console.debug("UI_Config: loading server-side json-file: " + this.file_or_url);
        }
        this.get_json_from_url();
    }
    else {
        console.error("UI_Config: unhandled type of: " + this.file_or_url);
    }
}

/**
 * Fetches `json text content` from `this.file_or_url` and attaches callback for `fail`, `done`
 * 
 * Creates `this.data` object
 */
UI_Config.prototype.get_json_from_url = function () {

    const _res = $.getJSON(this.file_or_url,
        function (data) {
            this.data = data;
            console.debug(this.data);
        }.bind(this),
    );

    _res.fail(
        () => {
            const _str = "Load failed: " + this.file_or_url;
            console.error(_str);

            // to be shown in UI
            this.on_failed(_str);
        }
    );

    _res.done(
        () => {            
            if (this.check_format()) {
                const _str = "Load done:" + this.file_or_url;
                console.debug(_str);

                // to be shown in UI
                this.on_done(_str);
            }
            else {
                const _str = "Wrong format: " + this.file_or_url;
                console.debug(_str);

                // to be shown in UI
                this.on_failed(_str);
            }
        }
    );
}

/**
 * 1. It assumes `this.file_or_url` is of type `File`
 * 2. Reads client-side file
 * 3. Creates `this.data` object
 */
UI_Config.prototype.get_json_from_local = function () {
    
    const _f = this.file_or_url;
    const _fr = new FileReader();

    _fr.onload = function(e) {

        const _raw = e.target.result;
        this.data = JSON.parse(_raw);
        console.debug(this.data);

        if (this.check_format()) {
            const _str = "Load done: " + this.file_or_url.name;
            console.debug(_str);

            // to be shown on UI
            this.on_done(_str);
        }
        else {
            const _str = "Wrong format: " + this.file_or_url.name;
            console.debug(_str);

            // to be shown on UI
            this.on_failed();
        }
    }.bind(this);

    _fr.addEventListener("error",
        function (e) {
            const _str = "Load error: " + JSON.stringify(e);
            console.debug(_str);

            // to be shown on UI
            this.on_failed(_str);
        }.bind(this)
    );

    _fr.addEventListener("loadstart",
        function (e) {
            console.debug("Load started");
        }.bind(this)
    );

    _fr.addEventListener("loadend",
        function (e) {
            console.info("Load ended");
        }.bind(this)
    );

    // trigger start reading
    _fr.readAsText(_f, "utf-8");
}

UI_Config.prototype.check_item_fields = function (item_, i) {
    if (undefined === item_.topic) {
        console.error("check_item_fields: item " + i + " has no 'topic': " + JSON.stringify(item_) + ". Aborting");
        return false;
    }

    if (undefined === item_.name) {
        console.error("check_item_fields: item " + i + " has no 'name': " + JSON.stringify(item_) + ". Aborting");
        return false;
    }

    if (undefined === item_.qos) {
        console.error("check_item_fields: item " + i + " has no 'qos': " + JSON.stringify(item_) + ". Aborting");
        return false;
    }

    return true;
}

UI_Config.prototype.check_broker_fields = function (broker_) {
    if (undefined === broker_.host) {
        console.error("check_broker_fields: broker has no 'host' field");
        return false;
    }
    if (undefined === broker_.port) {
        console.error("check_broker_fields: broker has no 'port' field");
        return false;
    }
    if (undefined === broker_.options) {
        console.error("check_broker_fields: broker has no 'options' field");
        return false;
    }

    return true;
}

UI_Config.prototype.check_format = function () {
    if (undefined == this.data) {
        console.error("check_format: 'data' is undefined");
        return false;
    }

    if (undefined === this.data.mqtt_broker) {
        console.error("check_format: 'data' doesn't have 'mqtt_broker' field");
        return false;
    }

    if (!this.check_broker_fields(this.data.mqtt_broker)) {
        return false;
    }

    if (undefined === this.data.items) {
        console.error("check_format: 'data' doesn't have 'items' array");
        return false;
    }

    for (let i = 0; i < this.data.items.length; i++) {
        let _item = this.data.items[i];
        if (!this.check_item_fields(_item, i)) {
            return false;
        }
    }

    return true;
}

UI_Config.prototype.get_item_from_topic = function (topic_) {
    
    let _item = undefined;
    const _items = this.data.items;

    for (let i = 0; i < _items.length; i++) {
        if (topic_ == _items[i].topic) {
            _item = _items[i];
            _item.index = i;
            break;
        }
    }

    return _item;
}

export default UI_Config;