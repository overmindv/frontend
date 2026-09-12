export interface Avatar {
  fileId: string;
  smallUrl: string;
  mediumUrl: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  avatar: Avatar | null;
  roles: string[];
  isAdmin: boolean;
  isSuperuser: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface CreateMediaUploadInput {
  originalName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  purpose: "avatar" | "catalog_logo" | "content_image" | "attachment" | "archive";
  visibility: "public" | "private";
}

export interface MediaFormField {
  name: string;
  value: string;
}

export interface MediaUpload {
  fileId: string;
  mode: "single" | "multipart";
  url: string;
  fields: MediaFormField[];
  headers: MediaFormField[];
  multipartUploadId: string;
  partSize: number;
  expiresAt: string;
}

export interface CompleteMediaUploadInput {
  fileId: string;
  parts: { partNumber: number; etag: string }[];
}

export interface MediaFile {
  id: string;
  ownerUserId: string;
  purpose: string;
  visibility: string;
  originalName: string;
  declaredContentType: string;
  detectedContentType: string;
  sizeBytes: number;
  status: "pending_upload" | "quarantined" | "processing" | "ready" | "rejected" | "deleted";
  failureCode: string;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
