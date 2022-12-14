# quick-ui-mqtt

Quick UI generator for MQTT Client

* App is running at: [github-pages-quick-ui-mqtt](https://giovannyjtt.github.io/quick-ui-mqtt/)
* [Video demo link](https://www.youtube.com/watch?v=gMjwMOx3K3g)

![quick_ui_mqtt_gif](./docs/quick_ui_mqtt_gif.gif)

The main purpose of this project is to provide a simple boilerplate for an `html UI` that helps to use `mqtt publish / subscribe` on background

* Use the example of pub / sub buttons and add your own behaviours to the `onClick` events
* Use the json file to quickly create dynamically buttons for publish / subscribe to mqtt topics

## Classes
### ui_setup.json (Example)

[ui_setup.json](./src/resources/ui_setup.json)

* Defines the configuration of the mqtt-broker to use (url, port, options)
* Defines a list of items (button-name, mqtt-topic, message, qos)
    * `name` (madatory, string) it will appear into the button
    * `topic` (mandatory, string) it will be used to publish or subscribe to / from mqtt-broker
    * `qos` (mandatory, number [0,1,2]) it will be used for quality of service into the mqtt with that specific topic
    * `message` (optional, string) 
        * A `mqtt-publisher` will be created when the field `message` is present, otherwise it will create a `mqtt-subscriber`
        * If your publish-topic doesn't have any message as payload then just put empty string `message: ""` to tell the App this is a publisher

### Config.js

[Config.js](./src/scripts/Config.js)

* This class handles the loading of the UI configuration (from json file as described above)
* Load can be done from url, server-side file or client-side file

### App.js

[App.js](./src/scripts/App.js)

* This class creates instance of `MqttClientHandler` and `UI` and performs cross-instance operations between them
* Attaches callbacks for `broker_button` and `input_form`, which are the basic 2 UI elements needed to load / change the configuration at `runtime`
* Attaches callbacks to manage mqtt and UI related when:
    * `on_connected`, `on_disconnected`, `on_reconnecting`, on `on_message_received`, etc

### UI.js

[UI.js](./src/scripts/UI.js)

* This class contains all methods for creating UI elements (vertical `tab-list`) with `buttons`, `badge` (color blink) and `text` (that shows the incoming / outgoing mqtt messages)
* Buttons of mqtt topics are initially disabled
* Once connected to mqtt broker buttons are enabled
* Broker colors:
    * `Green` connected successfully to mqtt broker (using `ui_setup.json` information)
    * `Red` disconnected successfully from mqtt broker
    * `Yellow` reconnecting
* Topics colors:
    * `Green` subscribed successfully
    * `Red` unsubscribed successfully
    * `Yellow` published 1 message successfully
* Text box content for each subscribed topic is updated as fast as broker sends messages
    * Or cleaned after 1 second if not received more messages
* At `add_buttons_cb()` the callback for each button is created and attached to the button
    * Depending on the topic it will add functionality for: `publish`, `subscribe` or `unsubscribe`

### main.js

[main.js](./src/scripts/main.js)

* It is the entry point of our App:
    1. Loads bootstrap js
    2. Loads boostrap predefined css colors and styles
    3. Bootstrap depends on jquery. jquery-global-var `$` can be used only after the page is fully loaded
        * So we need to instanciate it
    4. Finally it creates an instance of our App

## This repository

### NodeJS configuration

This project is buildt with NodeJS. The dependencies packages and configuration are locate at `package.json`

1. Working with versions:
    * npm: `6.14.17`
    * nodejs: `v16.15.0`
2. Install all dependencies
    * `npm install`
3. Two modes of "compiling" the code: `dev` and `build`
    * Running in development mode with a local webpack-dev-server
        * `npm run dev`
    * Building compressed / production code for deployment in a remote server
        * `npm run build`
        * Assets (images, index, etc.) and code will be placed at `./dist/`
        * You can use vs-code-plugin [live-server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) to simulate a remote server and view the result

### Webpack configuration

This project uses webpack-5 for building the final js code. Webpack configuration is done at [config/](./config)

* [paths.js](./config/paths.js)
    * `src`
        * Directory path for source files path (libgptjs, main scripts)
    * `build`
        * Directory path for production built files (compressed, images, html, etc.)
    * `static`
        * Directory path from which the assets will be copied to the build folder
* [webpack.common.js](./config/webpack.common.js)
    * Uses webpack-plugins to integrate all resources (js scripts, html, images, etc.)
    * `entry`
        * Defines the point as [index.js](./src/index.js), which also loads [index.scss](./src/styles/index.scss) and [main.js](./src/scripts/main.js)
            * This makes canvas background green and starts our app entry point (main.js)
    * `output`
        * Defines the final js code bundle `[name].bundle.js` which will be placed at `build`
    * `CopyWebpackPlugin`
        * Used to copy resources from origin to destination assets folders
    * `HtmlWebpackPlugin`
        * Used to load [init_template.html](./src/html/init_template.html), replaces some headers and __defines the div where our project will be embedded into__:
            * `<div id="container"></div>`
    * `webpack.ProvidePlugin`
        * Used to provide `jquery` global variables `$` before trying to use it on code (otherwise `$` doesn't exist)
    * `webpack.NormalModuleReplacementPlugin`
        * Used to tell Webpack whenever it sees `require("mtqq")` to replace it with `require("mqtt/dist/mqtt.js")` which is the minified version of the MQTT library that doesn't happen to have the #! line at the beginning.
* [webpack.dev.js](./config/webpack.dev.js)
    * Includes `webpack.common.js` and adds configuraiton for development server
* [webpack.prod.js](./config/webpack.prod.js)
    * Includes `webpack.common.js` and adds configuration for building production bundle (split in chunks, minify code, etc.)

### Compiling quick-ui-mqtt project

#### Compile instructions

```bash
git clone https://github.com/GiovannyJTT/quick-ui-mqtt.git
cd quick-ui-mqtt
npm install     # install all nodejs packages needed for this project (in node_modules/ folder)
npm run dev     # compile and run a development version
npm run build   # build an optimized website (html + javscript + images) in dist/ folder
```

## Testing with mosquitto local broker

### Install mosquitto client tools

```bash
sudo apt-get install mosquitto-clients
# this installs mosquitto_pub, mosquitto_sub
```

### Enable mosquitto 1.4.10 to use websockets

* Follow instructions at [link](https://gist.github.com/smoofit/dafa493aec8d41ea057370dbfde3f3fc)
* This installs `mosquitto` local broker
* Summary:
    * Download
        ```bash
        cd  ~/Downloads
        wget http://mosquitto.org/files/source/mosquitto-1.4.10.tar.gz
        tar zxvf mosquitto-1.4.10.tar.gz
        cd mosquitto-1.4.10/
        sudo nano config.mk
        ```
    * Edit `config.mk`
        * Add `WITH_WEBSOCKETS:=yes`
    * Compile and install
        ```bash
        make
        sudo make install
        cp mosquitto.conf /etc/mosquitto/
        ```
    * Configure ports
        ```bash
        sudo nano /etc/mosquitto/mosquitto.conf

        # add this in section "Default Listener" (ctrl + w to search)

        port 1883
        listener 9001
        protocol websockets
        ```
    * Add user mosquitto
        * `sudo adduser mosquitto`
    * Restart mosquitto
        * `sudo systemctl restart mosquitto.service`

### Enable mosquitto 2 to use websockets

* Mosquitto 2 already has support for websockets
* You need to add a websocket listener into `/etc/mosquitto/mosquitto.conf`
    ```bash
    sudo nano /etc/mosquitto/mosquitto.conf

    # add this at the end of file

    port 1883
    listener 9001
    protocol websockets
    ```
* Add user mosquitto
    * `sudo adduser mosquitto`
* Restart mosquitto
    * `sudo systemctl restart mosquitto.service`

### Test with mosquitto local broker

* Run this app
    * `npm run dev`
    * Since mosquitto local broker is now enabled to use port `9001` for websockets
        * When our web-app starts it can connect to `mqtt://localhost:9001` (configure `ui_setup.json`)
* You can send messages from a terminal to our web-app using the local broker
    1. We send a message to broker using the TCP port 1883 (enabled by default) by terminal
        ```bash
        mosquitto_pub -h "localhost" -p 1883 -t "/test" -m "new message"
        ```
    2. The broker finds the nodes that are subscribed to topic `/test` and transmits the message to them
    2. We can see the message is received into our web-app after it got subscribed to the topic
        * Check chrome-console (Ctrl + Shift + I)