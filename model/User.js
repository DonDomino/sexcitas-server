const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

const userSchema = mongoose.Schema({
    name: {
      type: String,
      required: [true, 'is required'],
      trim: true,
      match: [/^[a-zA-Z]+$/, 'Invalid character']
    },
    gender: {
      type: String,
      required: [true, 'is required']
    },
    age: {
      type: String,
      required: [true, 'is required'],
      match: [/^(1[89]|[2-7][0-9])/, 'Invalid age']
    },
    email: {
      type: String,
      required: [true, 'is required'],
      trim: true,
      unique: true,
      lowercase: true,
      match: [/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, "Invalid email"]
    },
    password: {
      type: String,
      required: [true, 'is required']
    }
    
  });
  
  // hashes the password
  userSchema.pre("save", function (next) {
    if (!this.isModified('password')) return next();
    bcrypt.hash(this.password, 10, (err, hash) => {
      if (err) {
        return next(err);
      }
      this.password = hash;
      next();
    });
  });
  
  // used for authentication
  userSchema.statics.authenticate = async (email, password) => {
    const user = await mongoose.model("User").findOne({ email: email });
    if (user) {
      return new Promise((resolve, reject) => {
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) reject(err);
          resolve(result === true ? user : null);
        });
      });
      return user;
    }  
    return null;
  };
  
  const User = mongoose.model("User", userSchema);
  module.exports = User;
  