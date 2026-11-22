import type * as Schema from "./generated";

export type User = Schema.UserFieldsFragment;
export type AuthPayload = Schema.LoginMutation["login"];

export type RegisterInput = Schema.RegisterInput;
export type UpdateUserInput = Schema.UpdateUserInput;
export type CreateMediaUploadInput = Schema.CreateMediaUploadInput;
export type CompleteMediaUploadInput = Schema.CompleteMediaUploadInput;
export type MediaUpload = Schema.CreateMediaUploadMutation["createMediaUpload"];
