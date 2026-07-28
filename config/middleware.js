const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");

exports.checkauth = async (req, res, next) => {
  try {
    // 1. Read token from cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Authorization token missing in cookies",
      });
    }

    // 2. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id || decoded?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Invalid token payload",
      });
    }

    const redisKey = `session:${userId}`;

    // console.log("=====================>", redisKey);

    // 3. Get session from Redis
    const session = await redisClient.get(redisKey);

    if (!session) {
      return res.status(401).json({
        success: false,
        msg: "Session expired or not found",
      });
    }

    const sessionData = JSON.parse(session);

    // console.log("Redis Session:", sessionData);

    // 4. Check session status
    if (sessionData.status !== true) {
      return res.status(401).json({
        success: false,
        msg: "User is logged out",
      });
    }

    // 5. Verify token matches Redis
    if (sessionData.token !== token) {
      return res.status(401).json({
        success: false,
        msg: "Invalid session token",
      });
    }

    // 6. Attach user to request
    req.user = sessionData.user;

    next();
  } catch (error) {
    console.log("AUTH ERROR =>", error.message);

    return res.status(401).json({
      success: false,
      msg: "Session cookie invalid or expired",
    });
  }
};
