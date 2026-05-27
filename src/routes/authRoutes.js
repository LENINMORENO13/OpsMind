import express from "express";
import { register, login } from "../controllers/authController.js";
import { validateSchema } from "../middlewares/validatorMiddleware.js";
import { registerSchema, loginSchema } from "../schemas/authSchemas.js";

const router = express.Router();

router.post("/register", validateSchema(registerSchema), register);

router.post("/login", validateSchema(loginSchema), login);

export default router;
