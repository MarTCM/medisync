const TOKEN_KEY = 'medisync_token';
const USER_KEY = 'medisync_user';

export const TokenStorage = {
  save(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  remove(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  saveUser(user: object): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
};
