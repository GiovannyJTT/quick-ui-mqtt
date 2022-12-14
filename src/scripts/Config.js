
class Config {
    /**
     * Wraps all methods needed to get the configuration (broker and ui) from file. Commonly: `ui_setup.json`
     * 
     * It will be loaded either from url, server-side file or client-side file
     * 
     * @param {Object} file_or_url_ it is either a `string` of the `URL` or a `File` object (when user selected)
     *      `URL` can be external (`http:://`) or server-side internal (`./scr/file.json`)
     * @param {Dictionary} callbacks_ dictionary containing the references to callbacks to be triggered depending on events
     *      `on_done`
     */
    constructor (file_or_url_, callbacks_) {
        this.file_or_url = file_or_url_;
        if (undefined === this.file_or_url)  {
            console.error("Config: 'file_or_url' is undefined. Not constructed");
            return;
        }

        this.cbs = callbacks_;
        if (undefined === this.cbs) {
            console.error("Config: `callbacks` is undefined. Not constructed");
            return;
        }
        
        this.data = undefined;
        this.get_config();
    }
}

Config.prototype.is_file = function (object_) {
    if (this.is_string(object_)) {
        // is url
        return false;
    }
    else {
        // is a blob with name as string (means it is a file)
        return typeof object_.name == "string";
    }
}

Config.prototype.is_string = function (object_) {
    return (typeof object_ == "string");
}

/**
 * Depending on the typo of `this.file_or_url` it will trigger the loading of the file content
 */
 Config.prototype.get_config = function () {
    if (this.is_file(this.file_or_url)) {
        console.debug("Config: loading client-side json-file: " + this.file_or_url.name);
        this.get_json_from_local();
    }
    else if (this.is_string(this.file_or_url)) {
        if (this.file_or_url.startsWith("http:/")) {
            console.debug("Config: loading external json-file: " + this.file_or_url);
        }
        else {
            console.debug("Config: loading server-side json-file: " + this.file_or_url);
        }
        this.get_json_from_url();
    }
    else {
        console.error("Config: unhandled type of: " + this.file_or_url);
    }
}

/**
 * 1. Fetches `json text content` from `this.file_or_url` (as URL string) and attaches callback for `fail`, `done`
 * 2. Fills `this.data` object
 */
Config.prototype.get_json_from_url = function () {

    const _res = $.getJSON(this.file_or_url,
        function (data) {
            this.data = data;
            console.debug(this.data);
        }.bind(this),
    );

    _res.fail(
        function (e)  {
            const _str = "Load failed: " + this.file_or_url;
            console.error(_str);

            // to be shown in UI
            this.cbs.on_failed(_str);
        }.bind(this)
    );

    _res.done(
        function (e) {
            if (this.check_format()) {
                const _str = "Load done:" + this.file_or_url;
                console.debug(_str);

                // to be shown in UI
                this.cbs.on_done(_str);
            }
            else {
                const _str = "Wrong format: " + this.file_or_url;
                console.debug(_str);

                // to be shown in UI
                this.cbs.on_failed(_str);
            }
        }.bind(this)
    );
}

/**
 * 1. It assumes `this.file_or_url` is of type `File` (already selected by the user via input-form)
 * 2. Reads client-side file
 * 3. Fills `this.data` object
 */
Config.prototype.get_json_from_local = function () {
    
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
            this.cbs.on_done(_str);
        }
        else {
            const _str = "Wrong format: " + this.file_or_url.name;
            console.debug(_str);

            // to be shown on UI
            this.cbs.on_failed(_str);
        }
    }.bind(this);

    _fr.addEventListener("error",
        function (e) {
            const _str = "Load error: " + JSON.stringify(e);
            console.debug(_str);

            // to be shown on UI
            this.cbs.on_failed(_str);
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

Config.prototype.check_item_fields = function (item_, i) {
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

Config.prototype.check_broker_fields = function (broker_) {
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

Config.prototype.check_format = function () {
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

Config.prototype.get_item_from_topic = function (topic_) {
    
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

export default Config;