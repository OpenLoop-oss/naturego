export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
