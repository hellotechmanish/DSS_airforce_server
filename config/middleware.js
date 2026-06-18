const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Path verify kar lein

exports.checkauth = async (req, res, next) => {
  try {
    // console.log("================ INCOMING REQUEST ================");
    // console.log("URL:", req.originalUrl);
    // console.log("All Cookies Received:", req.cookies);
    // console.log("Specific Token Cookie:", req.cookies?.token);
    // console.log("==================================================");

    // 1. Directly read token from browser cookies
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Authorization token missing in cookies",
      });
    }

    // 2. Cryptographically verify the cookie token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //   FIXED: Check both 'id' and '_id' configurations safely to prevent structure mismatches
    const userId = decoded?.id || decoded?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Invalid token payload structures",
      });
    }

    // 3. Database Fallback: Read only required fields from MongoDB via lean query
    //   FIXED: Used the dynamic unified userId variable
    const user = await User.findById(userId).select("role fullName uid").lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User account session no longer exists",
      });
    }

    // 4. Inject clean normalized dataset into request stack for downstream routes
    req.user = {
      id: user._id.toString(),
      role: user.role,
      fullName: user.fullName,
      uid: user.uid,
    };

    next();
  } catch (error) {
    console.log("AUTH ERROR EXCEPTION =>", error.message);

    return res.status(401).json({
      success: false,
      msg: "Session cookie invalid or expired",
    });
  }
};
