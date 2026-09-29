import express from 'express';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
import { SignupSchema, SigninSchema } from '../validators/zodValidator';
import { prisma } from 'shared';
import dotenv from "dotenv"
import { authRateLimiter } from '../middleware/rateLimitMiddleware';

const router = express.Router();
dotenv.config();
const saltRounds = 10;
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("Jwt Secret is not defined");
}

router.post("/signup", authRateLimiter, async (req, res) => {
  const parsedData = SignupSchema.safeParse(req.body);
  if (!parsedData.success) {
    const errors = parsedData.error.issues.map((issue: any) => issue.message);
    return res.status(400).json({
      message: errors.join(","),
    });
  }

  try {
    const password = parsedData.data.password;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const email = parsedData.data.email;
    const user = await prisma.user.create({
      data: {
        passwordHash: hashedPassword,
        email: email
      }
    })
    res.json({
      message: "You have been Signed Up",
      userId: user.id,
    });
  }
  catch (e) {
    console.log("Signup error:", e);
    res.status(500).json({
      message: "Something Went Wrong"
    });
  }

});

router.post("/signin", authRateLimiter, async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    const errors = parsedData.error.issues.map((issue: any) => issue.message);
    return res.status(400).json({
      message: errors.join(","),
    });
  }

  try {
    const email = parsedData.data.email;
    const password = parsedData.data.password;

    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });
    if (!user) {
      res.status(404).json({
        message: "User Not Found"
      });
      return;
    }
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    const userId = user.id;
    if (passwordMatch) {
      const token = jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
      res.json({
        token
      });
    }
    else {
      res.status(401).json({
        message: "Incorrect Password"
      });
    }
  }
  catch (e) {
    console.error("Signinerror:", e);
    res.status(500).json({
      message: "Something Went Wrong"
    });
  }
});

export default router;
