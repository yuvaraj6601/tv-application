import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  role: 'ADMIN' | 'DEVICE';
}

export const jwtHelper = {
  sign: (payload: JwtPayload): string => {
    return jwt.sign(payload, (process.env.JWT_ACCESS_SECRET || 'signage-secret') as jwt.Secret, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn']
    });
  },
  verify: (token: string): JwtPayload => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'signage-secret') as JwtPayload;
  }
};
