
export interface loginRes {
    token: string;
    email: string;
    username: string;
    refreshToken?: string;
}

export interface userSliceState {
    username: string;
    email: string;
}

export interface postAuth {
	username: string;
    email: string;
	password: string;
}

export interface AuthResponse {
  token: string;
  username?: string;
  email?: string;
  refreshToken?: string;
}

export interface UpdateProfilePayload {
    username: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
}
