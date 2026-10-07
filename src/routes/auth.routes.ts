import express from "express";
import { register, login, getDemoCredentials } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimit.middleware.js";
import { registerSchema, loginSchema } from "../schemas/auth.schemas.js";

const router = express.Router();

// --- AUTHENTICATION PATHS ---

// Obtener credenciales de acceso de prueba (GET público; sin rate limit para
// no bloquear la exploración demo de evaluadores con IP compartida)
/**
 * @openapi
 * /api/v1/auth/demo:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get demo credentials for public trial access
 *     responses:
 *       200:
 *         description: Demo credentials returned. 'enabled' is false when not configured
 *       500:
 *         description: Internal server error
 */
router.get("/demo", getDemoCredentials);

// Registrar un nuevo usuario (POST /api/v1/auth/register)
/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@empresa.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SuperSecreta123!"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Internal server error
 */
router.post("/register", authRateLimiter, validateSchema(registerSchema), asyncHandler(register));

// Iniciar sesión y obtener token (POST /api/v1/auth/login)
/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Authenticate user and obtain a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@empresa.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SuperSecreta123!"
 *     responses:
 *       200:
 *         description: Login successful. Returns the authorization token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post("/login", authRateLimiter, validateSchema(loginSchema), asyncHandler(login));

export default router;
