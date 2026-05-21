import crypto from 'crypto';

export const passwordHelper = {
  hash: (value: string): string => {
    return crypto.createHash('sha256').update(value).digest('hex');
  },
  isMatch: (plainValue: string, hashedValue: string): boolean => {
    return passwordHelper.hash(plainValue) === hashedValue;
  }
};
