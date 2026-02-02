
const mqtt = require('mqtt');

// MQTT broker URL (local, no authentication)
const brokerUrl = 'mqtt://localhost:1883';

// Topic (decoded from base64: 'b25saW5lcmVzbW9uaXRvcg==' → 'onlineresmmonitor')
const topic = 'b25saW5lcmVzbW9uaXRvcg==';

// Unique client ID
const clientId = 'emqx_nodejs_' + Math.random().toString(16).substring(2, 8);

// Base message templates
const baseMessages = [
    ' {"data":"eyJpbml0aWFsU3RhcnQiOjF9"} ',
  //  ' {"data":"eyJSRVNfMyI6MTIzLCJhbGFybSI6MCwic3RhcnQiOjF9"} ',
  //res_0 : 5
   // ' {"data":"eyJSRVNfMCI6NTAsImFsYXJtIjowLCJzdGFydCI6MX0"} ',
    //res0: 6
    ' {"data":"eyJSRVNfMCI6NjAsImFsYXJtIjowLCJzdGFydCI6MX0"} ',
    
    //res0: 7

   //  ' {"data":"eyJSRVNfMCI6NzAsImFsYXJtIjowLCJzdGFydCI6MX0"} ',
    //res 8
   // ' {"data":"eyJSRVNfMCI6ODAsImFsYXJtIjowLCJzdGFydCI6MX0"} ',
    //ner 5
   // '{"data":"eyJORVJfMCI6MC4wNSwiYWxhcm0iOjAsInN0YXJ0IjoxfQ"} ',
    //ner 6
   //' {"data":"eyJORVJfMCI6MC4wNiwiYWxhcm0iOjAsInN0YXJ0IjoxfQ"} ',
    //ner 7
 //   ' {"data":"eyJORVJfMCI6MC4wNywiYWxhcm0iOjAsInN0YXJ0IjoxfQ"} ',
    //ner 8
        ' {"data":"eyJORVJfMCI6MC4wOCwiYWxhcm0iOjAsInN0YXJ0IjoxfQ"} ',
    ' {"data":"eyJlbmQiOjF9"} '
];

// Array of specific Node IDs
const nodeIds = [1001,1002,1003];

// Connect to the MQTT broker (no username/password)
const client = mqtt.connect(brokerUrl, {
    clientId
});

client.on('connect', () => {
    console.log('Connected to MQTT broker');

    // Start publishing messages in a continuous loop
    setInterval(() => {
        console.log('Restarting message publishing loop...');
        publishMessagesForNodes(0); // Start with first index of nodeIds array
    }, 15000); // Every 15 seconds
});

// Function to publish messages for all Node IDs sequentially
function publishMessagesForNodes(currentNodeIndex) {
    if (currentNodeIndex >= nodeIds.length) {
        console.log('Finished one round of Node IDs.');
        return;
    }

    const currentNodeId = nodeIds[currentNodeIndex];
    console.log(`Starting to publish messages for Node ID: ${currentNodeId}`);
    let messageIndex = 0;

    const intervalId = setInterval(() => {
        if (messageIndex < baseMessages.length) {
            // Add Node_Id to message
            const message = JSON.stringify({
                Node_Id: currentNodeId,
                ...JSON.parse(baseMessages[messageIndex])
            });

            client.publish(topic, message, (err) => {
                if (err) {
                    console.error(`Failed to publish for Node ${currentNodeId}, Msg ${messageIndex + 1}: ${err.message}`);
                } else {
                    console.log(`Published Node ${currentNodeId}, Msg ${messageIndex + 1}: ${message}`);
                }
            });

            messageIndex++;
        } else {
            clearInterval(intervalId);
            publishMessagesForNodes(currentNodeIndex + 1); // Move to next node in array
        }
    }, 1000); // 1-second delay
}

client.on('error', (err) => {
    console.error(`MQTT error: ${err.message}`);
});