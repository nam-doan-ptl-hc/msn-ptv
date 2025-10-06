import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import * as moment from 'moment-timezone';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private defaultHeaders = new HttpHeaders({
    accept: 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'en',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'x-doctella-app-id': environment.X_DOCTELLA_APP_ID,
    'x-doctella-app-key': environment.X_DOCTELLA_APP_KEY,
    'x-timezone': moment.tz.guess(),
  });

  constructor(private http: HttpClient) {}

  get(path: string, params?: any): Observable<any> {
    const url = `${environment.domain_api}${path}`;
    return this.http.get(url, {
      headers: this.defaultHeaders,
      params,
    });
  }

  post(path: string, body: any): Observable<any> {
    const url = `${environment.domain_api}${path}`;
    return this.http.post(url, body, {
      headers: this.defaultHeaders,
    });
  }

  postFormEncoded(path: string, body: Record<string, any>): Observable<any> {
    const url = `${environment.domain_api}${path}`;

    let params = new HttpParams();
    for (const key in body) {
      if (body.hasOwnProperty(key)) {
        const value = body[key];
        params = params.set(
          key,
          typeof value === 'object' ? JSON.stringify(value) : value
        );
      }
    }

    return this.http.post(url, params.toString(), {
      headers: this.defaultHeaders,
    });
  }
}
