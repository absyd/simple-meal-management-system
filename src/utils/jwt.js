import jwt from 'jsonwebtoken';
import { getEnvConfig } from '../config/database.js';

const envConfig = getEnvConfig();

export const generateToken = (payload) => {
  return jwt.sign(payload, envConfig.JWT_SECRET, {
    expiresIn: envConfig.JWT_EXPIRE || '7d'
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, envConfig.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided or invalid format');
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};
