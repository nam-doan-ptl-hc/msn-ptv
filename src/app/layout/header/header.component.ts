import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Utils } from '../../utils/utils';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  user: any = {};
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const userInfoStr = localStorage.getItem('user_info');
      this.user = JSON.parse(userInfoStr || '{}');
    }
  }

  getNameAccount() {
    return (
      (!Utils.isEmpty(this.user.first_name) ? this.user.first_name + ' ' : '') +
      (!Utils.isEmpty(this.user.last_name) ? this.user.last_name : '')
    );
  }
  checkAvatarAccount() {
    if (!Utils.isEmpty(this.user.user_name)) {
      return this.user.user_name[0];
    }
    if (!Utils.isEmpty(this.user.first_name)) {
      return this.user.first_name[0];
    }
    if (!Utils.isEmpty(this.user.last_name)) {
      return this.user.last_name[0];
    }
    if (!Utils.isEmpty(this.user.email)) {
      return this.user.email[0];
    }
    if (!Utils.isEmpty(this.user.phone_number)) {
      return this.user.phone_number[0];
    }
    return '';
  }
  logOut() {
    const req_time = new Date().setHours(0, 0, 0, 0);
    const userInfoStr = localStorage.getItem('user_info');
    const user = JSON.parse(userInfoStr || '{}');
    const body = {
      token: user.token || '',
      req_time: req_time,
    };

    this.api.postFormEncoded('/signout', body).subscribe({
      next: (res) => {
        if (res.code != 0) {
          this.snackBar.open(res.msg, 'x', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
          return;
        }
        localStorage.removeItem('user_info');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.snackBar.open('Error logout', 'close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
