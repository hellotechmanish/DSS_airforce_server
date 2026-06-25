const mqtt = require("mqtt");

// MQTT broker URL (local, no authentication)
const brokerUrl = "mqtt://localhost:1883";

// Topic (decoded from base64: 'b25saW5lcmVzbW9uaXRvcg==' → 'onlineresmmonitor')
const topic = "b25saW5lcmVzbW9uaXRvcg==";

// Unique client ID
const clientId = "emqx_nodejs_" + Math.random().toString(16).substring(2, 8);

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

  ' {"data":"eyJlbmQiOjF9"} ',
];

// Array of specific Node IDs
// const nodeIds = [1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020];
const nodeIds = [1001, 1002];

// Utility → timestamp for logs
function logTime() {
  return new Date().toISOString();
}

// Connect to the MQTT broker (no username/password)
console.log(`[${logTime()}] Connecting to MQTT broker → ${brokerUrl}`);

const client = mqtt.connect(brokerUrl, {
  clientId,
});

client.on("connect", () => {
  console.log(`[${logTime()}]    Connected to MQTT broker`);
  console.log(`[${logTime()}] Client ID → ${clientId}`);
  console.log(`[${logTime()}] Topic → ${topic}`);

  // Start publishing messages in a continuous loop
  setInterval(() => {
    console.log(`\n[${logTime()}] 🔁 Restarting message publishing loop...`);
    publishMessagesForNodes(0); // Start with first index of nodeIds array
  }, 15000); // Every 15 seconds
});

// Function to publish messages for all Node IDs sequentially
function publishMessagesForNodes(currentNodeIndex) {
  if (currentNodeIndex >= nodeIds.length) {
    console.log(`[${logTime()}]    Finished one round of Node IDs.\n`);
    return;
  }

  const currentNodeId = nodeIds[currentNodeIndex];
  console.log(
    `[${logTime()}] 🚀 Starting messages for Node ID → ${currentNodeId}`,
  );

  let messageIndex = 0;

  const intervalId = setInterval(() => {
    if (messageIndex < baseMessages.length) {
      try {
        // Add Node_Id to message
        const message = JSON.stringify({
          Node_Id: currentNodeId,
          ...JSON.parse(baseMessages[messageIndex]),
        });

        console.log(
          `[${logTime()}] 📤 Publishing message ${messageIndex + 1}/${baseMessages.length}`,
        );

        client.publish(topic, message, (err) => {
          if (err) {
            console.error(
              `[${logTime()}] ❌ Failed to publish for Node ${currentNodeId}, Msg ${messageIndex + 1}: ${err.message}`,
            );
          } else {
            console.log(
              `[${logTime()}]    Published → Node ${currentNodeId}, Msg ${messageIndex + 1}`,
            );
            console.log(`Payload: ${message}\n`);
          }
        });
      } catch (error) {
        console.error(`[${logTime()}] ❌ JSON Parse Error: ${error.message}`);
      }

      messageIndex++;
    } else {
      clearInterval(intervalId);

      console.log(
        `[${logTime()}] ✔ Completed all messages for Node ${currentNodeId}`,
      );

      publishMessagesForNodes(currentNodeIndex + 1); // Move to next node in array
    }
  }, 1000); // 1-second delay
}

client.on("error", (err) => {
  console.error(`[${logTime()}] ❌ MQTT error: ${err.message}`);
});
