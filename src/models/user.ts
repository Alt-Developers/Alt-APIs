import express from "express";
import { model, Types, Schema, connection } from "mongoose";
import { User } from "./types";

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  DOB: Date,
  bio: String,
  system13: {
    players: [Types.ObjectId],
  },
  avatar: {
    type: String,
    required: true,
  },
});

const userDb = connection.useDb("ss_Account");

export default userDb.model<User>("User", userSchema);