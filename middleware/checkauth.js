const jwt = require("jsonwebtoken");
const User = require("../models/user");

// exports.checkauth = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         success: false,
//         msg: "Authorization token missing",
//       });
//     }

//     const token = authHeader.split(" ")[1];

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const user = await User.findById(decoded.id).select("-password");

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         msg: "Invalid token (user not found)",
//       });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({
//       success: false,
//       msg: "Invalid or expired token",
//     });
//   }
// };

exports.checkauth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        msg: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        msg: "Invalid token payload",
      });
    }

    const user = await User.findById(decoded.id).select("role").lean();
    // console.log("role mid", user);

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User not found",
      });
    }

    req.user = {
      id: user._id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.log("AUTH ERROR =>", error.message);

    return res.status(401).json({
      success: false,
      msg: "Invalid or expired token",
    });
  }
};
