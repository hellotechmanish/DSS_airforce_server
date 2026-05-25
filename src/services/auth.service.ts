import userModal from "../models/user.modal.js";
import validatePassword from "../utils/passvalidator.js";

export const signup = async (payload: any) => {
  let { fullName, username, password, role } = payload;

  fullName = fullName?.trim();

  username = username?.trim();

  password = password?.trim();

  if (!fullName || !username || !password) {
    throw {
      statusCode: 400,

      message: "Please provide all required fields",
    };
  }

  const existingUser = await userModal.findOne({
    username,
  });

  if (existingUser) {
    throw {
      statusCode: 400,

      message: "Username already exists",
    };
  }

  const validation = validatePassword(password);

  if (!validation.isValid) {
    throw {
      statusCode: 400,

      message: "Weak password",

      errors: validation.errors,
    };
  }

  const safeRole = ["admin", "technician", "user"].includes(role)
    ? role
    : "technician";

  const user = await userModal.create({
    fullName,

    username,

    password,

    role: safeRole,
  });

  const token = user.getSignedToken();

  return {
    success: true,

    message: "User created successfully",

    data: {
      user: {
        id: user._id,

        fullName: user.fullName,

        username: user.username,

        role: user.role,
      },

      token,
    },
  };
};

export const login = async (payload: any) => {
  let { username, password } = payload;

  username = username?.trim();

  password = password?.trim();

  if (!username || !password) {
    throw {
      statusCode: 400,

      message: "Please provide username and password",
    };
  }

  const user = await userModal.findOne({ username }).select("+password");

  if (!user) {
    throw {
      statusCode: 401,

      message: "Invalid credentials",
    };
  }

  const isMatch = await user.matchPasswords(password);

  if (!isMatch) {
    throw {
      statusCode: 401,

      message: "Invalid credentials",
    };
  }

  const token = user.getSignedToken();

  return {
    success: true,

    message: "Login successful",

    data: {
      user: {
        id: user._id,

        fullName: user.fullName,

        username: user.username,

        role: user.role,
      },

      token,
    },
  };
};

export const forgotPassword = async (payload: any) => {
  let { username, newPassword } = payload;

  username = username?.trim();

  newPassword = newPassword?.trim();

  if (!username || !newPassword) {
    throw {
      statusCode: 400,

      message: "Please provide username and new password",
    };
  }

  const validation = validatePassword(newPassword);

  if (!validation.isValid) {
    throw {
      statusCode: 400,

      message: "Weak password",

      errors: validation.errors,
    };
  }

  const user = await userModal.findOne({ username });

  if (!user) {
    throw {
      statusCode: 404,

      message: "User not found",
    };
  }

  user.password = newPassword;

  await user.save();

  return {
    success: true,

    message: "Password updated successfully",
  };
};
