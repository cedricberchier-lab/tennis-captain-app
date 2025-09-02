import jwt from 'jsonwebtoken';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'tennis-captain-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateToken(user: Omit<User, 'password'>): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Middleware helper for API routes
export async function authenticateRequest(request: Request): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}