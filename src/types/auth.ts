// User role type
export type UserRole = 'admin' | 'user';

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  isActive: boolean;
}

// User without sensitive fields (for client)
export interface PublicUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date | null;
}

// JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Auth request/response types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
  token?: string;
}

export interface AuthError {
  error: string;
  field?: string;
}

// Session with owner
export interface SessionOwnership {
  ownerId: string;
  isPublic: boolean;
}
