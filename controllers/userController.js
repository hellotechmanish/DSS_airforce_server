const Device = require("../models/device");
const Site = require("../models/site");
const User = require("../models/user");
const validatePassword = require("../utils/passvalidator");
const bcrypt = require("bcryptjs");

// =========================== Create User ============================= //
exports.addUser = async (req, res) => {
  try {
    let { password, fullName, username, role, type } = req.body;

    // Normalize input
    fullName = fullName?.trim();
    username = username?.trim().toLowerCase();
    password = password?.trim();

    // Role mapping (support old type + new role)
    const roleMap = {
      0: "admin",
      1: "technician",
      2: "user",
    };

    const finalRole = roleMap[role] || roleMap[type] || role || type;

    if (!["admin", "technician", "user"].includes(finalRole)) {
      return res.status(400).json({ message: "Invalid role type" });
    }

    // Check username
    const userExist = await User.findOne({ username });
    if (userExist) {
      return res.status(400).json({ message: "Username already registered" });
    }

    // RBAC restriction
    if (req.user.role === "technician" && finalRole !== "user") {
      return res.status(403).json({
        message: "Technician can only create users",
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      username,
      password,
      role: finalRole,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("ADD USER ERROR =>", error);

    return res.status(500).json({
      success: false,
      message: error.message,
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
exports.resetPassword = async (req, res) => {
  const { password, userId } = req.body;

  console.log("req.body", req.body);

  try {
    if (!password || !userId) {
      return res.status(400).json({
        msg: "Password and userId are required",
      });
    }

    const { isValid, errors } = validatePassword(password);

    if (!isValid) {
      return res.status(400).json({
        msg: "Weak password",
        errors,
      });
    }

    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    // ✅ NO HASH HERE
    user.password = password;

    await user.save(); // 🔐 pre-save hook will hash

    return res.status(200).json({
      msg: "Password Updated Successfully",
    });
  } catch (error) {
    console.log("Error from resetPassword", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
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
    const users = await User.find({ role: userRole }).lean();

    for (let item of users) {
      //  get sites for this user
      const sites = await Site.find(
        { userId: { $in: [item._id] } },
        { _id: 1, siteName: 1, uid: 1 }, //  only required fields
      ).lean();

      //  attach data
      item.siteCount = sites.length;
      item.sites = sites; // 🔥 send to frontend
    }

    return res.status(200).json({ msg: users });
  } catch (error) {
    console.log("error from getUserList ==>", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ============================== Edit User =================================== //
exports.editUser = async (req, res, next) => {
  const { userId, userRole, fullName, username } = req.body;
  console.log("=========== Edit function got hit () =============");
  if (userRole === 1) {
    console.log("edit Technician Profile");
    try {
      let user = await User.findByIdAndUpdate(
        userId,
        {
          fullName,
          username,
        },
        {
          new: true,
        },
      );

      return res
        .status(200)
        .json({ message: "user edited successfully", data: user });
      // sendToken(user, 201, res);
    } catch (error) {
      console.log("error from addUser By technician==>", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }

  if (userRole === 2) {
    console.log("edit User Profile");
    try {
      let user = await User.findByIdAndUpdate(
        userId,
        {
          fullName,
          username,
        },
        {
          new: true,
        },
      );

      return res
        .status(200)
        .json({ message: "user edited successfully", data: user });
      // sendToken(user, 201, res);
    } catch (error) {
      console.log("error from addUser By admin==>", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
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
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// =============================== Assign Site ============================== //
exports.assignSite = async (req, res) => {
  const { userId, siteIds, deviceIds } = req.body;

  console.log("Incoming:", req.body);

  try {
    // ✅ 1. Assign multiple sites
    await Site.updateMany(
      { _id: { $in: siteIds } },
      { $addToSet: { userId: userId } },
    );

    // ✅ 2. Assign devices (IMPORTANT)
    if (deviceIds && deviceIds.length > 0) {
      await Device.updateMany(
        { _id: { $in: deviceIds } },
        { $set: { userId: userId } },
      );
    }

    return res.status(200).json({
      msg: "Sites & Devices assigned successfully",
    });
  } catch (error) {
    console.error("assignSite error:", error);
    return res.status(500).json({
      msg: "Something went wrong",
    });
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
    return res.status(500).json({
      message: "Something went wrong",
    });
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
    return res.status(500).json({
      message: "Something went wrong",
    });
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
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

exports.gettest = async (req, res, next) => {
  console.log("test function got hit");
  try {
    const resp = "test function executed successfully";
    return res.status(200).json({ msg: resp });
  } catch (error) {
    console.log("error from test function ==>", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
