// src/config/mqtt.ts

import mqtt from "mqtt";
import dotenv from "dotenv";

import Device from "../models/device.model.js";

import {
    saveLatestData,
    compareThresholdValue,
} from "../services/device.service.js";

dotenv.config();

/* ============================== MQTT CONFIG ============================== */

const MQTT_URL =
    process.env.MQTT_URL ||
    "mqtt://127.0.0.1:1883";

const MQTT_TOPIC =
    process.env.MQTT_TOPIC ||
    "b25saW5lcmVzbW9uaXRvcg==";

const client = mqtt.connect(
    MQTT_URL,
);

/* ============================== GLOBAL STORAGE ============================== */

const DataObject: Record<
    string,
    any
> = {};

const initialstart: Record<
    string,
    boolean
> = {};

const spdValue: Record<
    string,
    any
> = {};

/* ============================== SENSOR STRUCTURES ============================== */

const createSensorObject = (
    type: string,
) => ({
    DEVICE_TYPE: type,
    DATASTREAMS: [],
});

/* ============================== MQTT CONNECT ============================== */

client.on("connect", () => {
    console.log(
        "✅ MQTT Connected",
    );

    client.subscribe(
        MQTT_TOPIC,
        (err) => {
            if (err) {
                console.log(
                    "❌ MQTT Subscribe Error",
                    err.message,
                );
            } else {
                console.log(
                    "✅ MQTT Topic Subscribed",
                );
            }
        },
    );
});

/* ============================== MQTT MESSAGE ============================== */

client.on(
    "message",
    async (topic, message) => {
        try {
            console.log(
                "📩 Topic =>",
                topic,
            );

            /* ============================== PARSE MQTT MESSAGE ============================== */

            const raw = JSON.parse(
                message.toString(),
            );

            const nodeId =
                raw.Node_Id;

            console.log(
                "📌 NodeId =>",
                nodeId,
            );

            const device =
                await Device.findOne({
                    nodeUid: nodeId,
                });

            if (!device) {
                console.log(
                    "❌ Device not found",
                );

                return;
            }

            console.log(
                "✅ Device Found",
            );

            /* ============================== DECODE BASE64 ============================== */

            const parsedData =
                JSON.parse(
                    Buffer.from(
                        raw.data,
                        "base64",
                    ).toString("utf8"),
                );

            console.log(
                "📦 Parsed Data =>",
                parsedData,
            );

            /* ============================== INITIAL START ============================== */

            if (
                parsedData.initialStart
            ) {
                initialstart[nodeId] =
                    true;
            }

            if (
                !initialstart[nodeId]
            ) {
                return;
            }

            /* ============================== INIT OBJECT ============================== */

            if (!DataObject[nodeId]) {
                DataObject[nodeId] = {
                    RES: createSensorObject(
                        "RES",
                    ),

                    NER: createSensorObject(
                        "NER",
                    ),

                    SPD: createSensorObject(
                        "SPD",
                    ),

                    VMR: createSensorObject(
                        "VMR",
                    ),

                    TEMP:
                        createSensorObject(
                            "TEMP",
                        ),

                    HUM: createSensorObject(
                        "HUM",
                    ),
                };
            }

            /* ============================== FILTER KEYS ============================== */

            const keys =
                Object.keys(
                    parsedData,
                ).filter(
                    (k) =>
                        ![
                            "start",
                            "end",
                            "initialStart",
                            "alarm",
                        ].includes(k),
                );

            const key = keys[0];

            if (!key) {
                return;
            }

            const type = key.split("_")[0];

            /* ============================== PUSH DATA HELPER ============================== */

            const pushData = (
                type: string,
                value: any,
                deviceKey = key,
            ) => {
                if (
                    !DataObject[nodeId][
                    type
                    ]
                ) {
                    DataObject[nodeId][
                        type
                    ] = {
                        DEVICE_TYPE:
                            type,
                        DATASTREAMS: [],
                    };
                }

                DataObject[nodeId][
                    type
                ].DATASTREAMS.push({
                    deviceNumber:
                        deviceKey,
                    value,
                });
            };

            /* ============================== RES ============================== */

            if (
                type === "RES" &&
                DataObject[nodeId]
                    ?.RES
                    ?.DATASTREAMS
                    .length +
                1 <=
                device.resSensors
            ) {
                pushData(
                    "RES",
                    parsedData[
                        key
                    ]?.toFixed(2),
                );
            }

            /* ============================== NER ============================== */

            if (
                type === "NER" &&
                DataObject[nodeId]
                    ?.NER
                    ?.DATASTREAMS
                    .length +
                1 <=
                device.nerSensors
            ) {
                pushData(
                    "NER",
                    parsedData[
                        key
                    ]?.toFixed(2),
                );
            }

            /* ============================== SPD ============================== */

            if (
                type === "SPD" &&
                DataObject[nodeId]
                    ?.SPD
                    ?.DATASTREAMS
                    .length +
                1 <=
                device.spdSensors
            ) {
                const latestSurge =
                    await Device.findOne({
                        _id: device._id,
                    });

                const value =
                    parsedData[key];

                if (
                    latestSurge &&
                    spdValue[nodeId] ===
                    value
                ) {
                    pushData(
                        "SPD",
                        0,
                    );
                } else {
                    spdValue[nodeId] =
                        value;

                    pushData(
                        "SPD",
                        value,
                    );
                }
            }

            /* ============================== TEMP ============================== */

            if (
                parsedData.Temp
            ) {
                pushData(
                    "TEMP",
                    parsedData.Temp.toFixed(
                        2,
                    ),
                    "Temp",
                );
            }

            /* ============================== HUM ============================== */

            if (
                parsedData.Hum
            ) {
                pushData(
                    "HUM",
                    parsedData.Hum.toFixed(
                        2,
                    ),
                    "Hum",
                );
            }

            /* ============================== VMR ============================== */

            if (
                type === "VMR" &&
                DataObject[nodeId]
                    ?.VMR
                    ?.DATASTREAMS
                    .length +
                1 <=
                device.vmrSensors
            ) {
                delete parsedData.start;

                delete parsedData.alarm;

                const values =
                    Object.values(
                        parsedData,
                    );

                const arr = [
                    {
                        phaseNumber: "r",
                        value:
                            Number(
                                values[0],
                            ) / 100,
                    },
                    {
                        phaseNumber: "y",
                        value:
                            Number(
                                values[1],
                            ) / 100,
                    },
                    {
                        phaseNumber: "b",
                        value:
                            Number(
                                values[2],
                            ) / 100,
                    },
                    {
                        phaseNumber:
                            "ry",
                        value:
                            Number(
                                values[3],
                            ) / 100,
                    },
                    {
                        phaseNumber:
                            "yb",
                        value:
                            Number(
                                values[4],
                            ) / 100,
                    },
                    {
                        phaseNumber:
                            "rb",
                        value:
                            Number(
                                values[5],
                            ) / 100,
                    },
                ];

                pushData(
                    "VMR",
                    arr,
                    key.split("_")[1],
                );
            }

            /* ============================== END ============================== */

            if (
                parsedData.end &&
                DataObject[nodeId]
            ) {
                try {
                    /* ============================== SAVE DATA ============================== */

                    await Promise.all([
                        saveLatestData(
                            DataObject[nodeId]
                                .RES,
                            device._id.toString(),
                            "ResValues",
                        ),

                        saveLatestData(
                            DataObject[nodeId]
                                .NER,
                            device._id.toString(),
                            "NerValues",
                        ),

                        saveLatestData(
                            DataObject[nodeId]
                                .SPD,
                            device._id.toString(),
                            "SpdValues",
                        ),

                        saveLatestData(
                            DataObject[nodeId]
                                .VMR,
                            device._id.toString(),
                            "VmrValues",
                        ),

                        saveLatestData(
                            DataObject[nodeId]
                                .TEMP,
                            device._id.toString(),
                            "TempValues",
                        ),

                        saveLatestData(
                            DataObject[nodeId]
                                .HUM,
                            device._id.toString(),
                            "HumValues",
                        ),
                    ]);

                    /* ============================== THRESHOLD CHECK ============================== */

                    await Promise.all([
                        compareThresholdValue(
                            DataObject[nodeId]
                                .RES,
                            device._id.toString(),
                            "ResValues",
                            device,
                        ),

                        compareThresholdValue(
                            DataObject[nodeId]
                                .NER,
                            device._id.toString(),
                            "NerValues",
                            device,
                        ),

                        compareThresholdValue(
                            DataObject[nodeId]
                                .SPD,
                            device._id.toString(),
                            "SpdValues",
                            device,
                        ),

                        compareThresholdValue(
                            DataObject[nodeId]
                                .VMR,
                            device._id.toString(),
                            "VmrValues",
                            device,
                        ),
                    ]);

                    console.log(
                        "✅ Data Saved Successfully",
                    );
                } catch (error: any) {
                    console.log(
                        "❌ DB Error =>",
                        error.message,
                    );
                }

                delete DataObject[
                    nodeId
                ];

                delete initialstart[
                    nodeId
                ];
            }
        } catch (error: any) {
            console.log(
                "❌ MQTT Error =>",
                error.message,
            );
        }
    },
);

/* ============================== EXPORT ============================== */

export default client;