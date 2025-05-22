const mqtt = require('mqtt');
let client = mqtt.connect(process.env.MQTT_HOST);

client.on('message', (topic, message) => {
    MQTTService.onMessage(topic, message);
})

class MQTTService {
    static subscribedTopics = [];

    static subscribeToTopic(topic, callback, onError = () => {}, asBuffer = false) {
        if (!client) {
            this.connectClient();
        }

        client.subscribe(topic, onError);
        this.subscribedTopics.push({ topic, callback, asBuffer });
    }

    static publishToTopic(topic, message) {
        if (!client) {
            this.connectClient();
        }

        client.publish(topic, message);
    }

    static connectClient() {
        client = mqtt.connect(process.env.MQTT_HOST)
    }

    static onMessage(topic, message) {
        for (let i = 0; i < this.subscribedTopics.length; i++) {
            const subscribedTopic = this.subscribedTopics[i];
            if (subscribedTopic.topic === topic) {
                if (!subscribedTopic.asBuffer) {
                    try {
                        subscribedTopic.callback(JSON.parse(message));
                    } catch {
                        subscribedTopic.callback(message.toString());
                    }
                } else {
                    subscribedTopic.callback(message);
                }
            }
        }
    }
}

module.exports = MQTTService;
