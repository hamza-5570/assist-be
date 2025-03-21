import { z } from "zod";

const emailValidation = z.string().email("Invalid email format");

const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((value) => /[A-Z]/.test(value), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((value) => /[!@#$%^&*(),.?":{}|<>]/.test(value), {
    message: "Password must contain at least one special character",
  });

const userValidation = z.object({
  email: emailValidation,
  password: passwordValidation,
});

export { userValidation };
