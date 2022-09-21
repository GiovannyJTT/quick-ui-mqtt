# quick-ui-mqtt

The main purpose of this project is to provide a simple boilerplate for an `html UI` that helps to use `mqtt publish / subscribe` on background

* Use the example of pub / sub buttons and add your own behaviours to the `onClick` events

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
    * Reboot computer

### Test with mosquitto local broker

* Run this app
    * `npm run dev`
    * Since mosquitto local broker is now enabled to use port `9001` for websockets
        * When our web-app starts it will connect to `mqtt://localhost:9001`
* You can send messages from a terminal to our web-app using the local broker
    1. We send a message to broker using the TCP port 1883 (enabled by default)
        ```bash
        mosquitto_pub -t "/test" -p 1883 -m "new message"
        ```
    2. The broker finds the nodes that are subscribed to that topic `/test` and transmits the message to them
    2. We can see the message is received into our web-app after it got subscribed to the topic
        * Check chrome-console (Ctrl + Shift + I)