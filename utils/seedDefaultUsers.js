const User = require("../models/user");
const defaultUsers = require("../models/Default_users.json");

async function seedDefaultUsers() {
  try {
    for (const user of defaultUsers) {
      const result = await User.updateOne(
        { uid: user.uid },
        {
          $setOnInsert: {
            fullName: user.fullName,
            uid: user.uid,
            password: user.password,
            role: user.role,
            isActive: user.isActive,
            deviceSensors: user.deviceSensors || [],
          },
        },
        { upsert: true, runValidators: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`Default user created: ${user.uid}`);
      } else {
        console.log(`Default user already exists: ${user.uid}`);
      }
    }
  } catch (error) {
    console.error("Default user initialization failed:", error);
    throw error;
  }
}

module.exports = seedDefaultUsers;
