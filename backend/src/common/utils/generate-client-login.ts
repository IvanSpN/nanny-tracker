import { randomInt } from 'crypto';

const LOGIN_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateClientLogin(length = 10): string {
  const suffix = Array.from({ length }, () => LOGIN_CHARS[randomInt(LOGIN_CHARS.length)]).join('');

  return `client_${suffix}`;
}
