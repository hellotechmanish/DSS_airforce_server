const mqtt = require("mqtt");

const brokerUrl = "mqtt://localhost:1883";
const topic = "b25saW5lcmVzbW9uaXRvcg==";

const clientId = "node_sim_" + Math.random().toString(16).substring(2, 8);

//    Only 2 nodes
// const nodeIds = [
//   1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013,
//   1014, 1015, 1016, 1017, 1018,
// ];
const nodeIds = [1001];

// 🔹 Random generators
const getRandomRES = () => Math.floor(Math.random() * 10);

const getRandomNER = () => parseFloat(Math.random().toFixed(3));

const getPhaseVoltage = () => Math.floor(210 + Math.random() * 20); // 210–230V

const getPhaseSpeed = () => Math.floor(1400 + Math.random() * 200); // RPM

const getTemp = () => parseFloat((20 + Math.random() * 15).toFixed(1));

const getHum = () => parseFloat((30 + Math.random() * 50).toFixed(1));

// 🔹 Encode function (same as Python)
const encodeData = (obj) => {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
};

// 🔹 MQTT connect
const client = mqtt.connect(brokerUrl, { clientId });

client.on("connect", () => {
  console.log("   Connected to MQTT Broker");

  // 🔁 Loop every 5 sec
  setInterval(() => {
    nodeIds.forEach((nodeId) => {
      publishNodeData(nodeId);
    });
  }, 5000);
});

// 🔹 Main publish function
function publishNodeData(nodeId) {
  const messages = [
    // 🔸 Start
    { initialStart: 1 },

    // 🔸 RES sensor
    {
      RES_0: getRandomRES(),
      alarm: 0,
      start: 1,
    },
    // 🔸 RES1 sensor
    // {
    //   RES_1: getRandomRES(),
    //   alarm: 0,
    //   start: 1,
    // },

    // 🔸 NER sensor
    {
      NER_0: getRandomNER(),
      alarm: 0,
      start: 1,
    },

    // 🔸 VMR (3 Phase Voltage)
    {
      VMR_R: getPhaseVoltage(),
      VMR_Y: getPhaseVoltage(),
      VMR_B: getPhaseVoltage(),
      start: 1,
    },

    // 🔸 SPD (3 Phase Speed)
    {
      SPD_R: getPhaseSpeed(),
      SPD_Y: getPhaseSpeed(),
      SPD_B: getPhaseSpeed(),
      start: 1,
    },

    // 🔸 Temperature & Humidity
    {
      Temp: getTemp(),
      Hum: getHum(),
      start: 1,
    },

    // 🔸 End
    { end: 1 },
  ];

  // 🔁 Publish all messages
  messages.forEach((msg) => {
    const payload = JSON.stringify({
      Node_Id: nodeId,
      data: encodeData(msg),
    });

    client.publish(topic, payload);

    console.log(`📤 Node ${nodeId} →`, msg);
  });
}

// 🔹 Error handling
client.on("error", (err) => {
  console.error("❌ MQTT Error:", err.message);
});
