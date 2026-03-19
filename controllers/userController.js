const Device = require("../models/device");
const Site = require("../models/site");
const User = require("../models/user");

// =========================== Create User ============================= //
exports.addUser = async (req, res) => {
  let { password, fullName, uid, type, role, sites } = req.body;

  try {
    // 🔥 Convert numeric role to string
    if (role === 0 || role === "0") role = "admin";
    if (role === 1 || role === "1") role = "technician";
    if (role === 2 || role === "2") role = "user";

    if (type === 0 || type === "0") type = "admin";
    if (type === 1 || type === "1") type = "technician";
    if (type === 2 || type === "2") type = "user";

    const finalRole = role || type;

    if (!["admin", "technician", "user"].includes(finalRole)) {
      return res.status(400).json({ msg: "Invalid role type" });
    }

    const userExist = await User.findOne({ uid });
    if (userExist) {
      return res.status(403).json({ msg: "UID already registered" });
    }

    let user;

    // ================= TECHNICIAN =================
    if (finalRole === "technician") {
      user = await User.create({
        password,
        fullName,
        uid,
        role: "technician",
      });
    }

    // ================= USER =================
    if (finalRole === "user") {
      if (!sites || sites.length === 0) {
        return res.status(400).json({
          msg: "Site required for user",
        });
      }

      // create user first
      user = await User.create({
        password,
        fullName,
        uid,
        role: "user",
      });

      // 🔥 loop through sites
      for (const site of sites) {
        const { siteId, devices } = site;

        // assign user to site
        await Site.findByIdAndUpdate(siteId, {
          $addToSet: { userId: user._id },
        });

        // assign user to devices if exist
        if (devices && devices.length > 0) {
          for (const deviceId of devices) {
            await Device.findByIdAndUpdate(deviceId, {
              $addToSet: { userId: user._id },
            });
          }
        }
      }
    }

    // ================= ADMIN =================
    if (finalRole === "admin") {
      user = await User.create({
        password,
        fullName,
        uid,
        role: "admin",
      });
    }

    return res.status(201).json({
      msg: "User created successfully",
    });
  } catch (error) {
    console.log("ADD USER ERROR =>", error);

    return res.status(500).json({
      msg: error.message,
    });
  }
};

// =========================== login User ============================= //
exports.login = async (req, res, next) => {
  console.log("//====== login func() got hit =====//");
  const { uid, password } = req.body;

  if (!uid || !password) {
    return res.status(400).json({
      msg: "Please provide credential",
    });
  }

  try {
    const user = await User.findOne({ uid }).select("+password");

    if (!user) {
      return res.status(403).json({ msg: "uid not found" });
    }

    const isMatch = await user.matchPasswords(password);

    if (!isMatch) {
      return res.status(403).json({ msg: "Wrong credentials" });
    } else {
      let users = await User.findOne({ uid });
      sendToken(users, 200, res);
    }
  } catch (error) {
    console.log("error from login ==>", error);
    res.status(500).json({
      msg: error.message,
    });
  }
};

// =========================== RESET Password ========================== //
exports.resetPassword = async (req, res, next) => {
  const { password, userId } = req.body;
  try {
    let updatePass = await User.findById(userId);
    updatePass.password = password;
    await updatePass.save();
    return res.status(200).json({ msg: "Password Updated Successfully" });
  } catch (error) {
    console.log("Error from resetPassword", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ======================== Send token function ========================== //
const sendToken = (users, statusCode, res) => {
  const token = users.getSignedToken();
  return res.status(statusCode).json({ user: users, token: token });
};

// ============================== get all user List according to role ============================== //
exports.getUserList = async (req, res, next) => {
  const { userRole } = req.params;
  try {
    let resp = await User.find({ role: userRole }).lean();
    for (let item of resp) {
      let siteCount = await Site.countDocuments({
        userId: { $in: [item._id.toString()] },
      });
      // console.log("device count ==>", deviceCount)
      item.siteCount = siteCount;
    }
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from getUserList ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================== Edit User =================================== //
exports.editUser = async (req, res, next) => {
  const { userId, userRole, fullName, uid } = req.body;
  console.log("=========== Edit function got hit () =============");
  if (userRole === 1) {
    console.log("edit Technician Profile");
    try {
      let user = await User.findByIdAndUpdate(
        userId,
        {
          fullName,
          uid,
        },
        {
          new: true,
        },
      );

      return res
        .status(200)
        .json({ msg: "user edited successfully", data: user });
      // sendToken(user, 201, res);
    } catch (error) {
      console.log("error from addUser By technician==>", error);
      return res.status(500).json({ msg: error.message });
    }
  }

  if (userRole === 2) {
    console.log("edit User Profile");
    try {
      let user = await User.findByIdAndUpdate(
        userId,
        {
          fullName,
          uid,
        },
        {
          new: true,
        },
      );

      return res
        .status(200)
        .json({ msg: "user edited successfully", data: user });
      // sendToken(user, 201, res);
    } catch (error) {
      console.log("error from addUser By admin==>", error);
      return res.status(500).json({ msg: error.message });
    }
  }
};

// ============================== delete User =================================== //
exports.deleteUser = async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ msg: "Please! provide all required data" });
  }

  try {
    let resp = await User.findByIdAndDelete(userId);
    if (resp) {
      return res.status(200).json({ msg: " User deleted successfully" });
    }
  } catch (error) {
    console.log("error from deleteUser ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

// =============================== Assign Site ============================== //
exports.assignSite = async (req, res, next) => {
  const { userId, siteId } = req.body;
  console.log("=== Assign Site to user () ===");
  // console.table(req.body);
  try {
    let siteAssign = await Site.findByIdAndUpdate(siteId, {
      $addToSet: { userId: userId },
    });
    if (siteAssign) {
      return res.status(200).json({ msg: "Site Assigned successfully" });
    }
  } catch (error) {
    console.log("error from assignSite ==> ", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ============================== check user UID exists or not ============================== //
exports.checkUserUid = async (req, res, next) => {
  const { uid } = req.body;
  try {
    let resp = await User.findOne({ uid });
    if (!resp) {
      return res
        .status(200)
        .json({ msg: "This UID is available", status: true });
    }
    if (resp) {
      return res
        .status(200)
        .json({ msg: "This UID is not available", status: false });
    }
  } catch (error) {
    console.log("error from checkUserUid", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ================================== Assign DeviceSensor to User ================================== //
exports.assignDeviceSensor = async (req, res, next) => {
  const {
    deviceId,
    userId,
    phaseNumber,
    resistanceNumber,
    spdNumber,
    gnNumber,
  } = req.body;
  console.log(" === assignDeviceSensor === ");

  // deviceSensor => {deviceId: "hjkbh564fgyh", phaseNumber: [], resistanceNumber: [], spdNumber: [], gnNumber: []}

  let newDeviceSensors = {
    deviceId: deviceId,
    phaseNumber: phaseNumber,
    resistanceNumber: resistanceNumber,
    spdNumber: spdNumber,
    gnNumber: gnNumber,
  };

  try {
    let user = await User.findById(userId);

    let userdeviceFilter = user.deviceSensors.filter(
      (item) => item.deviceId === deviceId,
    );
    if (userdeviceFilter.length > 0) {
      await User.findOneAndUpdate(
        {
          _id: userId,
          deviceSensors: { $elemMatch: { deviceId: deviceId } },
        },

        {
          $set: {
            "deviceSensors.$.phaseNumber": phaseNumber,
            "deviceSensors.$.resistanceNumber": resistanceNumber,
            "deviceSensors.$.spdNumber": spdNumber,
            "deviceSensors.$.gnNumber": gnNumber,
          },
        },
      );

      await Device.findByIdAndUpdate(deviceId, { $push: { userId: userId } });
    } else {
      await User.findByIdAndUpdate(userId, {
        $push: { deviceSensors: newDeviceSensors },
      });

      await Device.findByIdAndUpdate(deviceId, { $push: { userId: userId } });
    }
    return res.status(200).json({ msg: "Assigned device Sensor" });
  } catch (error) {
    console.log("error from assignDeviceSensor", error);
    return res.status(500).json({ msg: error.message });
  }
};

// ==================================== Get Assigned Sensor acc. to user ==================================== //
exports.getassignSensor = async (req, res, next) => {
  const { userId, deviceId } = req.body;
  console.log("=== getassignSensor func got hit() ===");

  if (!userId || !deviceId) {
    console.log("ID NOT FOUND");
  }

  try {
    let resp = await User.findById(userId, {
      deviceSensors: { $elemMatch: { deviceId: deviceId } },
    });
    // let resp = await User.findById(userId)

    // console.log("user found ==>", resp)
    return res.status(200).json({ msg: resp?.deviceSensors });
  } catch (error) {
    console.log("error from getassignSensor ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.gettest = async (req, res, next) => {
  console.log("test function got hit");
  try {
    const resp = "test function executed successfully";
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from test function ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};
