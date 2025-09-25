import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Utils } from '../../utils/utils';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
declare var bootstrap: any;
@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [FormsModule],
})
export class HeaderComponent {
  user: any = {};
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private userService = inject(UserService);
  temperature_unit = '';
  height_unit = '';
  weight_unit = '';
  blood_glucose_unit = '';
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const userInfoStr = localStorage.getItem('user_info');
      this.user = JSON.parse(userInfoStr || '{}');
      this.temperature_unit = this.user.extended_attributes.temperature_unit;
      this.height_unit = this.user.extended_attributes.height_unit;
      this.weight_unit = this.user.extended_attributes.weight_unit;
      this.blood_glucose_unit =
        this.user.extended_attributes.blood_glucose_unit;
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
  onPopupSetting() {
    const modal = new bootstrap.Modal(document.getElementById('modalSeting'));
    modal.show();
  }

  onConfirmBulkAction() {
    if (!isPlatformBrowser(this.platformId)) return;
    const userInfoStr = localStorage.getItem('user_info');
    const user = JSON.parse(userInfoStr || '{}');

    const body = {
      token: user.token || '',
      req_time: new Date().setHours(0, 0, 0, 0),
      locale: 'en',
      temperature_unit: this.temperature_unit,
      height_unit: this.height_unit,
      weight_unit: this.weight_unit,
      blood_glucose_unit: this.blood_glucose_unit,
    };

    this.userService.updateUserInfo(body).subscribe({
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
        if (!Utils.isEmpty(user)) {
          user.extended_attributes.temperature_unit = this.temperature_unit;
          user.extended_attributes.height_unit = this.height_unit;
          user.extended_attributes.weight_unit = this.weight_unit;
          user.extended_attributes.blood_glucose_unit = this.blood_glucose_unit;

          this.userService.setUserInfo(user); // 🔥 gọi service để notify
        }
      },
      error: (err) => {
        console.error('Error process setting:', err);
      },
    });
    const modal = bootstrap.Modal.getInstance(
      document.getElementById('modalSeting')
    );
    modal.hide();
  }
}
