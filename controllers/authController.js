const User = require("../models/user");

// This is for login function

exports.login = async (req, res) => {
  console.log("//====== login func() got hit =====//");
  const { uid, password } = req.body;

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
