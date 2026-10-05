import jwt from 'jsonwebtoken';

// Verifies the Bearer token and exposes the signed-in profile as req.userId.
// Every personal query must be scoped with it.
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_lifeos_key');
    if (!decoded.userId) throw new Error('Token has no user');
    req.user = decoded; // { userId }
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};
