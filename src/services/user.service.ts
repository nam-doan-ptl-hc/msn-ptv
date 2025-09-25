import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class UserService {
  private userInfoSource: BehaviorSubject<any>;
  userInfo$;

  constructor(
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    let initialUser: any = {};

    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user_info');
      initialUser = userStr ? JSON.parse(userStr) : {};
    }

    this.userInfoSource = new BehaviorSubject<any>(initialUser);
    this.userInfo$ = this.userInfoSource.asObservable();
  }

  updateUserInfo(body: any) {
    return this.api.postFormEncoded('/updateUserInfo', body);
  }

  setUserInfo(user: any) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user_info', JSON.stringify(user));
    }
    this.userInfoSource.next(user);
  }

  getUserInfo() {
    return this.userInfoSource.value;
  }
}
