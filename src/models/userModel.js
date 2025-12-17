const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

var userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      match: [/\S+@\S+.\S+/, "Please enter a valid email address"],
    },
    mobile: {
      type: Number,
      match: [/^\d{10}$/, "Please provide a valid 10-digit mobile number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    dob: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    isGoogleUser: {
      type: Boolean,
    },
    walletBalance: {
      type: Number,
    },
    walletTransactions: [
      {
        transactionType: {
          type: String,
          enum: ["Credit", "Debit"], // Credit for adding to wallet, Debit for using wallet money
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      }
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSaltSync(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.isPasswordMatched = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema, "users");
