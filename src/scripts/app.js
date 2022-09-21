import * as mqtt from 'mqtt'

/**
 * Adding callback to button with #ID
 */
$('#b1').on('click', function (e) {
 
    console.log("bootstrap button onclick!")
})

allmqttstuff();

/**
 * Create mqtt-client
 * https://www.cloudamqp.com/docs/nodejs_mqtt.html
 */
function allmqttstuff () {
    const _options = {
        clientId: "mqtt_client_01",
        clean: true,
        connectTimeout: 4000,
        username: 'emqx',
        password: 'public',
        reconnectPeriod: 1000,
    }
    
    // port for websockets
    const client = mqtt.connect("mqtt://localhost:9001");
    
    // when connected
    client.on(
        'connect', function () {
            console.warn("mqtt.client: connected: " + client.connected);
    
            // subscribe to a topic
            client.subscribe('hello/world', function () {
                // when a message arrives, do something with it
                client.on('message', function (topic, message, packet) {
                    console.log("Received '" + message + "' on '" + topic + "'");
                });
            });
        
            // publish a message to a topic
            client.publish('hello/world', 'my message', function () {
                console.log("Message is published");
            });

            // client.end(); // Close the connection
        }
    );
} 
