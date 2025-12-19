// User role type
export type UserRole = 'admin' | 'user';

// Credential mode type
export type CredentialMode = 'global' | 'custom';

// User credentials (API keys)
export interface UserCredentials {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  [key: string]: string | undefined;
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  credentialMode: CredentialMode;
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
  credentialMode: CredentialMode;
  createdAt: Date;
  lastLoginAt: Date | null;
}

// User credentials info (masked for display)
export interface UserCredentialsInfo {
  mode: CredentialMode;
  credentials: Array<{
    key: string;
    hasValue: boolean;
    maskedValue?: string;
  }>;
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
