import mongoose, { Schema, Document, Model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { HydratedDocument } from "mongoose";

/* ===================== INTERFACES ===================== */

// document fields
export interface IUser extends Document {
  fullName: string;
  uid: string;
  password: string;
  role: string;

  matchPasswords(password: string): Promise<boolean>;
  getSignedToken(): string;
}

// model type
interface IUserModel extends Model<IUser> {}

/* ===================== SCHEMA ===================== */

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "technician", "user"],
      default: "technician",
    },
  },
  { timestamps: true },
);

/* ===================== HOOK ===================== */

userSchema.pre("save", async function (this: HydratedDocument<IUser>) {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ===================== METHODS ===================== */

userSchema.methods.matchPasswords = async function (
  enteredPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedToken = function (): string {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

/* ===================== EXPORT ===================== */

const User = mongoose.model<IUser, IUserModel>("User", userSchema);

export default User;
