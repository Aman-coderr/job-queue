import * as z from "zod"
const passwordSchema = z
  .string()
  .min(8, { message: "Password must contain atleast 8 characters" })
  .regex(/[a-z]/, { message: "Password must contain atleast one lowercase letter" })
  .regex(/[A-Z]/, { message: "Password must contain atleast one uppercase letter" })
  .regex(/\d/, { message: "Password must contain atleast one number" })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain atleast one Special Character" });

export const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "Invalid Email Address" }),
  password: passwordSchema,
});

export const SigninSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "Invalid Email Address" }),
  password: z.string().min(1, "Password is Required"),
})
