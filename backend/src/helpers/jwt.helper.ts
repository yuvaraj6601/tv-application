import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  role: 'ADMIN' | 'DEVICE';
}

export const jwtHelper = {
  sign: (payload: JwtPayload): string => {
    return jwt.sign(payload, (process.env.JWT_ACCESS_SECRET || 'signage-secret') as jwt.Secret);
  },
  verify: (token: string): JwtPayload => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'signage-secret') as JwtPayload;
  }
};
