export type UserRole = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  isSuspended: boolean;
}

export interface AuthResponse {
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface UpdateProfileInput {
  name: string;
  email: string;
  phone: string;
}
