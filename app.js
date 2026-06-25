const express = require("express");
var cors = require("cors");
const cookieParser = require("cookie-parser");
const Device = require("./models/device");
const util = require("util");
const { series } = require("async");
const exec = util.promisify(require("child_process").exec);
const { spawn } = require("child_process");
const moment = require("moment");
const getRangebetweenDates = require("./helperFunction/getdatelist");
var ObjectId = require("mongodb").ObjectId;
const morgan = require("morgan");
const { checkauth } = require("./config/middleware");
const helmet = require("helmet");
const connectDB = require("./config/db"); // Database module imported here
const DeviceMsg = require("./models/deviceMsg");
const redisClient = require("./config/redis");

const app = express();

require("dotenv").config();

const PORT = process.env.PORT || 5009;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(helmet.frameguard({ action: "deny" }));
app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(morgan("dev"));

/* 🔓 AUTH */
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

app.use("/api/auth", require("./routes/auth.routes"));

/* 🔒 PROTECTED ROUTES */
app.use("/api/user", checkauth, require("./routes/userRoutes"));
app.use("/api/site", checkauth, require("./routes/siteRoutes"));
app.use("/api/device", checkauth, require("./routes/deviceRoutes"));
app.use("/api/alarm", checkauth, require("./routes/alarmRoutes"));

/* START SERVER */
const startServer = async () => {
  try {
    await connectDB();

    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Redis Connected");
    }

    app.listen(PORT, () => {
      console.log(`[->] Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
};

startServer();

/* ========================================= */
/* EXISTING FUNCTIONS BELOW */
/* ========================================= */

async function frontendStart() {
  let masterTimer = setTimeout(async () => {
    if (true) {
      console.log("//============== Frontend Has Been Started ============//");

      let timer2 = setTimeout(async () => {
        console.log("//========= fireFox has been started =========//");

        let timer3 = setTimeout(() => {
          let { stdout } = exec(
            "xdotool search --sync --onlyvisible --name firefox key F11",
          );

          if (stdout) {
            console.log("//========= F11 Command has been executed ====//");
          }

          clearTimeout(timer3);
        }, 6000);

        clearTimeout(timer2);
        clearTimeout(masterTimer);
      }, 5000);
    }
  }, 5000);
}

function genRand(min, max, decimalPlaces) {
  return (Math.random() * (max - min) + min).toFixed(decimalPlaces) * 1;
}

async function feedData(NodeID, deviceNumber, param) {
  console.log("creating One Year Data");

  let deviceId = await Device.findOne({
    nodeUid: NodeID,
  });

  let startDate = moment().subtract(1, "year").format("YYYY-MM-DD");
  let endDate = moment().format("YYYY-MM-DD");

  let dateList = getRangebetweenDates(startDate, endDate, "days");

  dateList.pop();

  for (let item of dateList) {
    let hour = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23,
    ];

    for (let item2 of hour) {
      let today = moment(item).add(item2, "hours").format();

      let time = [
        0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840,
        900, 960, 1020, 1080, 1140, 1200, 1260, 1320, 1380, 1440, 1500, 1560,
        1620, 1680, 1740, 1800, 1860, 1920, 1980, 2040, 2100, 2160, 2220, 2280,
        2340, 2400, 2460, 2520, 2580, 2640, 2700, 2760, 2820, 2880, 2940, 3000,
        3030, 3090, 3150, 3210, 3270, 3330, 3390, 3450, 3510, 3570,
      ];

      for (let item3 of time) {
        let dataStream = [...new Array(deviceNumber)].map((_, i) => ({
          deviceNumber: `${param}_${i}`,
          value: genRand(0, 1, 2),
        }));

        await DeviceMsg.create([
          {
            deviceId: deviceId._id,
            msg: {
              DEVICE_TYPE: param,
              DATASTREAMS: dataStream,
            },
            date: item,
            time: moment(today).add(item3, "seconds").format("hh:mm"),
            dateAndTime: moment(moment(today).add(item3, "seconds")).format(),
            createdAt: moment(today).add(item3, "seconds"),
            updatedAt: moment(today).add(item3, "seconds"),
          },
        ]);
      }
    }

    console.log(`Data for Date - ${item} created`);
  }

  console.log("Data Added for One Year - Completed");
}

// feedData("1452", 1, "RES");
// feedData("1453", 1, "RES");
// feedData("1454", 1, "RES");
// feedData("1455", 1, "RES");
