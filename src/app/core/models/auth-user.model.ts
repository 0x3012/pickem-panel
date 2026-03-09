export interface AuthUser {
  id: number;
  email: string;
  username: string;
  roles: string[];
  name?: string;
}
