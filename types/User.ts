export interface UserDetails {
  _id: string;
  name: string;
  username: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDetailContextValue {
  userDetails: UserDetails | null;
  setUserDetails: (details: UserDetails | null) => void;
  isLoading: boolean;
}
