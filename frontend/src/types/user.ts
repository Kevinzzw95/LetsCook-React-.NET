
export interface loginRes {
    token: string;
    email: string;
    username:string;
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
}