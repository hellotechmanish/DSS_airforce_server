const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Path to your MongoDB User model
const redisClient = require("../config/redis"); // Path to your Redis connection file

exports.checkauth = async (req, res, next) => {
  try {
    // 1. Directly read token from browser cookies
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Authorization token missing in cookies",
      });
    }

    // 2. Cryptographically verify the cookie token structure
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id || decoded?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Invalid token payload structures",
      });
    }

    const redisKey = `session:${userId}`;

    console.log("=====================>", redisKey);

    // 3. ATTEMPT REDIS LOOKUP FIRST (Primary Cache Layer)
    let cachedUser = await redisClient.get(redisKey);
    console.log("cachedUser", cachedUser);

    if (cachedUser) {
      console.log(
        "Cache Hit: Serving user session data directly from Redis RAM",
      );

      // Inject data from Redis straight into the request stack object
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // 4. CACHE MISS FALLBACK: If data is not available in Redis, query MongoDB
    console.log(
      "Cache Miss: Session not found in Redis. Querying MongoDB fallback layer...",
    );

    const user = await User.findById(userId).select("role fullName uid").lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User account session no longer exists in database",
      });
    }

    // 5. Normalize clean dataset structure
    const safeUser = {
      id: user._id.toString(),
      role: user.role,
      fullName: user.fullName,
      uid: user.uid,
    };

    // 6. RE-SEED REDIS CACHE: Store the missing session back into Redis memory for future requests
    // Saved with a 24-hour expiration window (86400 seconds)
    await redisClient.setEx(redisKey, 86400, JSON.stringify(safeUser));
    console.log(`Redis cache successfully re-populated for key: ${redisKey}`);

    // Inject normalized MongoDB dataset into request stack for downstream nodes
    req.user = safeUser;

    next();
  } catch (error) {
    console.log("AUTH ERROR EXCEPTION =>", error.message);

    return res.status(401).json({
      success: false,
      msg: "Session cookie invalid or expired",
    });
  }
};
