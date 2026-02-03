const User = require("../models/user");

// This is for login function

exports.login = async (req, res) => {
  console.log("//====== login func() got hit =====//");
  const { uid, password } = req.body;
  console.log("body", req.body);

  if (!uid || !password) {
    return res.status(400).json({ msg: "Please provide credentials" });
  }

  try {
    const user = await User.findOne({ uid }).select("+password");

    if (!user) {
      return res.status(403).json({ msg: "UID not found" });
    }

    const isMatch = await user.matchPasswords(password);
    if (!isMatch) {
      return res.status(403).json({ msg: "Wrong credentials" });
    }

    const token = user.getSignedToken();

    return res.status(200).json({
      user,
      token,
    });
  } catch (error) {
    console.log("error from login ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  console.log("//====== forgotPassword func() got hit =====//");
  const { uid, secretKey, newPassword, confirmPassword } = req.body;

  console.log("body", req.body);
  if (!uid || !secretKey || !newPassword || !confirmPassword) {
    return res.status(400).json({ msg: "Please provide all required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ msg: "Passwords do not match" });
  }
  try {
    const user = await User.findOne({ uid });
    // console.log("user", user);

    if (!user) {
      return res.status(403).json({ msg: "UID not found" });
    }
    const secret =
      process.env.PASSWORD_RESET_SECRET || "DSS_PASSWORD_RESET_KEY";

    // console.log("secret", secret);

    if (secretKey !== secret) {
      return res.status(403).json({ msg: "Invalid secret key" });
    }

    user.password = newPassword;
    await user.save();

    // console.log("done", done);
    return res.status(200).json({ msg: "Password reset successful" });
  } catch (error) {
    console.error("error from forgotPassword ==>", error);
    return res.status(500).json({ msg: error.message });
  }
};
