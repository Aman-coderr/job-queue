import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      message: "Server Configuration Error",
    });
  }
  const token = req.headers.token as string | undefined
  if (!token) {
    return res.status(401).json({
      message: "No token Provided"
    });
  }

  try {
    const decodedData = jwt.verify(token, secret) as JwtPayload;

    if (decodedData && decodedData.id) {
      req.id = decodedData.id;
      next();
    }
    else {
      return res.status(401).json({
        message: "Invalid Credentials"
      })
    }

  }
  catch (e) {
    console.log(e);
    return res.status(401).json({
      message: "Invalid or Expired token"
    });
  }

}
