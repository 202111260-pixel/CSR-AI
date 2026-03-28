declare namespace Express {
  interface User {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'employee' | 'viewer';
  }
  interface Request {
    user?: User;
  }
}
