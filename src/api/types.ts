export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  avatar: UserAvatar | null;
  roles: string[];
  isAdmin: boolean;
  isSuperuser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAvatar {
  fileId: string;
  smallUrl: string;
  mediumUrl: string;
}

export interface PublicUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: UserAvatar | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthPayload {
  token: string;
  expiresAt: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateUserInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  clearBirthDate?: boolean;
  phone?: string;
}
