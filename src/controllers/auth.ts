import { RequestHandler } from "express";
import newError from "../helpers/newError";
import User from "../models/authentication/user";
import { compare, hash } from "bcrypt";
import { sign } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const user = await User.findOne({ email: email });
    if (!user) throw newError(404, "User not found", "user");

    const isValidPassword = await compare(password, user.password);

    if (!isValidPassword) throw newError(401, "Incorrect Password");

    const token = sign(
      {
        id: user.id,
        iat: new Date().getTime(),
      },
      process.env.JWT_KEY!,
      {
        issuer: "alt.apis",
      }
    );

    return res.status(200).json({
      message: "Success",
      token: token,
      accType: user.accType,
    });
  } catch (err) {
    next(err);
  }
};

const allowedService = ["timetables"];
export const decodeToken: RequestHandler = async (req, res, next) => {
  const service = req.query.service?.toString() ?? "";

  const respond = {
    base: {
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
      accType: req.user.accType,
    },
  };

  if (service === "timetables") {
    respond["timetables"] = {
      primaryClass: req.user.timetables.primaryClass,
      starred: req.user.timetables.starred,
      modalId: req.user.timetables.modalId ?? false,
    };
  }

  res.status(201).json(respond);
};

export const fotgetPassword: RequestHandler = async (req, res, next) => {
  try {
    if (!req.query.email) next();

    const user = await User.findOne({
      email: req.query.email,
      status: "active",
    });
    if (!user) throw newError(404, "User not found");

    const token = uuidv4();
    user.passwordR = { token, exp: new Date(Date.now() + 7200000) };

    await user.save();

    return res.status(201).json({
      passwordR: user.passwordR,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPasswordToken: RequestHandler = async (req, res, next) => {
  try {
    if (!req.query.token)
      throw newError(
        400,
        "Both Token and Email are not present in the request"
      );

    const user = await User.findOne({
      "passwordR.token": req.query.token,
      status: "active",
    });
    console.log(user);
    if (!user) throw newError(400, "Invalid Token");
    if (!user.passwordR) throw newError(500, "Something went wrong");

    if (Date.now() > user.passwordR.exp.getTime()) {
      user.passwordR.token = "";
      await user.save();
      throw newError(401, "Token Expried (2 hrs.)");
    }
    return res.status(201).json({
      base: {
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        accType: user.accType,
      },
    });
  } catch (error) {
    next(error);
  }
};

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/i;
export const changePassWithToken: RequestHandler = async (req, res, next) => {
  try {
    const token = req.body.token;
    const password = req.body.password;
    const cpassword = req.body.cpassword;

    if (password !== cpassword)
      throw newError(400, "Confirm password does not match");

    if (!passwordRegex.test(password))
      throw newError(400, "Password does not match the specification");

    const user = await User.findOne({
      "passwordR.token": token,
      status: "active",
    });
    if (!user) throw newError(400, "Invalid Token");

    const newPassword = await hash(password, 12);

    user.password = newPassword;
    user.passwordLastChanged = new Date();
    user.passwordR = undefined;

    await user.save();

    const jwt = sign(
      {
        id: user.id,
        iat: new Date().getTime() + 100,
      },
      process.env.JWT_KEY!,
      {
        issuer: "alt.apis",
      }
    );

    return res.status(201).json({
      message: "Success!",
      token: jwt,
    });
  } catch (error) {
    next(error);
  }
};
