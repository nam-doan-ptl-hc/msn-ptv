import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import {
  FormControl,
  Validators,
  ReactiveFormsModule,
  FormGroup,
} from '@angular/forms';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ApiService } from '../../../../services/api.service';
import { Utils } from '../../../utils/utils';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [ReactiveFormsModule, CommonModule],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;

  private api = inject(ApiService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      if (userInfo && userInfo.token) {
        this.router.navigate(['/dashboard']);
      }
      setTimeout(() => {
        document.body.classList.add('login-background');
      });
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('login-background');
    }
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = this.loginForm.get('email')?.value || '';
    const password = this.loginForm.get('password')?.value || '';
    const req_time = new Date().setHours(0, 0, 0, 0);

    const body = {
      token: Utils.googleToken(req_time.toString()),
      req_time: req_time,
      account: email,
      pwd: Utils.hashPassword(password),
      device_info: {
        name: '',
        device_type: 'Linux',
        os: 'Linux',
        os_version: '',
        manufacturer: '',
        model: '',
        browser: 'Chrome',
        browser_version: '134.0.0.0',
      },
      keep_logged_in: false,
      domain_name: 'www.doctellaqa.com',
    };

    this.api.postFormEncoded('signin', body).subscribe({
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
        localStorage.setItem('user_info', JSON.stringify(res.data));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.snackBar.open('Error login', 'close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
