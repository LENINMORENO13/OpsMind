import jwt from "jsonwebtoken";

export const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Access denied. Token not provided.",
    });
  }

  const token = header.split(" ")[1];

  try {
    const verify = jwt.verify(token, process.env.JWT_SECRET);

    req.user = verify;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
};
