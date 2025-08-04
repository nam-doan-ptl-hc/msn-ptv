import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';

export class Utils {
  static googleToken(inpStr: string): string {
    const hash = CryptoJS.MD5(inpStr + environment.WS_TOKEN);
    return hash.toString();
  }

  static hashPassword(password: string): string {
    const hash = CryptoJS.SHA256(password);
    return hash.toString();
  }

  static isDateType(value: any): boolean {
    return Object.prototype.toString.call(value) === '[object Date]';
  }

  static isDateObj(value: any): boolean {
    return value instanceof Date && !isNaN(value.getTime());
  }

  static isEmpty(value: any): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === 'object') {
      if (this.isDateType(value)) {
        return !this.isDateObj(value);
      }

      return Object.keys(value).length === 0;
    }

    if (typeof value === 'string') {
      return value.trim() === '';
    }

    return false;
  }

  static inArray(item: any, list: any[]): boolean {
    if (this.isEmpty(item) || this.isEmpty(list) || !Array.isArray(list)) {
      return false;
    }
    return list.includes(item);
  }
}
