import mongoose, { Schema, Document, Model } from "mongoose";

import jwt from "jsonwebtoken";

import bcrypt from "bcryptjs";

/* ================= INTERFACE ================= */

export interface IUser extends Document {
  fullName: string;

  username: string;

  password: string;

  role: "admin" | "technician" | "user";

  assignedSites: mongoose.Types.ObjectId[];

  getSignedToken(): string;

  matchPasswords(password: string): Promise<boolean>;
}

/* ================= MODEL TYPE ================= */

interface IUserModel extends Model<IUser> {}

/* ================= SCHEMA ================= */

const userSchema = new Schema<IUser>(
  {
    fullName: String,

    username: {
      type: String,

      unique: true,
    },

    password: {
      type: String,

      select: false,
    },

    role: {
      type: String,

      enum: ["admin", "technician", "user"],

      default: "user",
    },

    assignedSites: [
      {
        type: Schema.Types.ObjectId,

        ref: "Site",
      },
    ],
  },

  {
    timestamps: true,
  },
);

/* ================= HASH PASSWORD ================= */

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

/* ================= METHODS ================= */

userSchema.methods.getSignedToken = function (): string {
  return jwt.sign(
    {
      id: this._id,

      role: this.role,
    },

    process.env.JWT_SECRET as string,

    {
      expiresIn: "7d",
    },
  );
};

userSchema.methods.matchPasswords = async function (
  enteredPassword: string,
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
};

/* ================= EXPORT ================= */

const User = mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;
