import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn(): boolean {
    const userInfoStr = localStorage.getItem('user_info');
    if (!userInfoStr) return false;
    try {
      const user = JSON.parse(userInfoStr);
      return !!user?.token;
    } catch {
      return false;
    }
  }
}
