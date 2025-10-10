import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';
import { conversionObject } from './metrics';
import { initCharts } from '../shared/constants';
var Util = {
  blood_glucose_unit: {
    mg: 'mg/dL',
    mmol: 'mmol/L',
    conversionRate: 18.018,
  },
};
// Các mảng dữ liệu mặc định
const defaultWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const defaultMonths = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const defaultTT = ['am', 'pm'];
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

  static isBoolean(value: any): boolean {
    return typeof value === 'boolean' ? value === true : value === 'true';
  }
  static getBodyTypeTopType(bodyType: string): any {
    let body = { body_type: 'avg', top_type: 'avg' };
    if (bodyType === 'STEP_AZ' || bodyType === 'HF_TREND') {
      body.top_type = 'none';
    } else if (bodyType === 'STEP') {
      body.body_type = 'total';
      body.top_type = 'total';
    } else if (bodyType === 'HEIGHT') {
      body.body_type = 'last';
      body.top_type = 'last';
    } else if (Utils.inArray(bodyType, initCharts.minMaxCharts)) {
      body.body_type = 'list_value';
      body.top_type = 'min_max';
    }
    return body;
  }
  static removeLineEmpty(
    str: string,
    richEditor: string = 'no',
    regExp: string
  ): string {
    if (this.isEmpty(str)) return str;

    if (richEditor === 'yes') {
      str = str
        .replace(/\n/gm, '')
        .replace(/<\/br>|<\/ br>|<br\/>|<br \/>/gm, '<br>');
    } else {
      str = str.replace(/\r?\n/gm, '<br>');
    }

    let regex = new RegExp(regExp, 'gm');
    while (str !== str.replace(regex, '')) {
      str = str.replace(regex, '');
    }

    return str.trim();
  }

  static removeBeginOrEndLineEmpty(
    str: string,
    richEditor: string = 'no'
  ): string {
    return this.removeLineEmpty(
      str,
      richEditor,
      '^<br>|^ |^&nbsp;|<br>$| $|&nbsp;$'
    );
  }

  static stripTags(
    input: string,
    isLower?: boolean,
    allowed?: string,
    options?: { get_text?: boolean }
  ): string {
    if (!input || typeof input !== 'string') return input;

    const replaceChar = this.isBoolean(options?.get_text) ? ' ' : '';
    allowed =
      ((allowed || '') + '')
        .toLowerCase()
        .match(/<[a-z][a-z0-9]*>/g)
        ?.join('') || '';

    const tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

    let str = input.replace(commentsAndPhpTags, '').replace(tags, (_$0, $1) => {
      return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1
        ? _$0
        : replaceChar;
    });

    if (this.isBoolean(options?.get_text)) {
      str = str.replace(/\s\s+|&nbsp;/g, ' ');
      str = this.removeBeginOrEndLineEmpty(str);
    }

    if (isLower) str = str.toLowerCase();

    return str;
  }

  static findObject(
    list: any[],
    attr: string,
    value: any,
    caseInsensitive: boolean = false
  ): { pos: number; obj: any } {
    const result = { pos: -1, obj: {} };
    let d_terms = this.stripTags(value);

    if (this.isEmpty(list)) return result;
    if (this.isEmpty(d_terms)) d_terms = '';

    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      if (this.isEmpty(v)) continue;

      let s_terms = !this.isEmpty(attr)
        ? this.stripTags(v[attr])
        : this.stripTags(v);
      if (this.isEmpty(s_terms)) s_terms = '';

      if (
        caseInsensitive &&
        typeof s_terms === 'string' &&
        typeof d_terms === 'string'
      ) {
        s_terms = s_terms.toLowerCase();
        d_terms = d_terms.toLowerCase();
      }

      if (s_terms.toString().trim() === d_terms.toString().trim()) {
        result.pos = i;
        result.obj = v;
        break;
      }
    }

    return result;
  }
  static findObjects(
    list: any[],
    attr: string,
    value: any,
    caseInsensitive: boolean = false
  ): any[] {
    let d_terms = this.stripTags(value);
    if (this.isEmpty(d_terms)) d_terms = '';

    return list.filter((v) => {
      if (this.isEmpty(v)) return false;

      let s_terms = !this.isEmpty(attr)
        ? this.stripTags(v[attr])
        : this.stripTags(v);
      if (this.isEmpty(s_terms)) s_terms = '';

      if (
        caseInsensitive &&
        typeof s_terms === 'string' &&
        typeof d_terms === 'string'
      ) {
        s_terms = s_terms.toLowerCase();
        d_terms = d_terms.toLowerCase();
      }

      return s_terms.toString().trim() === d_terms.toString().trim();
    });
  }
  static getStringTimeSync(date: Date | string): string {
    const d = new Date(date);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${month} ${day}, ${hours}:${minutes}`;
  }
  static formatNumber(val: any): string | number | null | undefined {
    if (val === null || val === undefined || val === '') return val;

    const symbol = { thousand: ',', decimal: '.' };

    const num = Number(val);
    if (isNaN(num)) return val;

    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, symbol.thousand);

    return parts.join(symbol.decimal);
  }
  static roundDecimals(value: number, decimals: number = 5): number {
    if (this.isEmpty(value)) return value;
    if (!Number.isInteger(decimals)) decimals = parseInt(decimals as any);
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
  }
  static isInteger(number: any): boolean {
    return typeof number === 'number' && Number.isInteger(number);
  }

  static isFloat(number: any): boolean {
    return (
      typeof number === 'number' &&
      !Number.isNaN(number) &&
      !Number.isInteger(number)
    );
  }

  static BMICalculator(
    _weight: number,
    _height: number,
    options: { type?: string; decimals?: number } = {}
  ): number | false {
    let dataBMI = 0;
    const type = options.type ?? 'lb-ft';
    console.log('_weight', _weight, 'from', 'lbs', 'to', 'kg');
    console.log('_height', _height, 'from', 'lbs', 'to', 'kg');
    if (type === 'lb-ft') {
      const weightKg = Utils.convertUnit.massWeight(_weight, 'lbs', 'kg');
      const heightM = Utils.convertUnit.distanceLength(_height, 'ft', 'm');

      if (weightKg === false || heightM === false || heightM === 0) {
        return false;
      }
      dataBMI = weightKg / (heightM * heightM);
    } else {
      return false;
    }
    if (options.decimals !== undefined && options.decimals !== null) {
      dataBMI = Utils.roundDecimals(dataBMI, options.decimals);
    }
    return dataBMI;
  }

  static convertUnit = {
    massWeight: (
      value: number,
      from: string,
      to: string,
      options: any = {}
    ): number | false => {
      const measure_unit: Record<string, string> = {
        kg: 'Kilogram',
        g: 'Gram',
        lbs: 'Pound',
      };

      if (typeof from !== 'string' || typeof to !== 'string') {
        return false;
      }

      const normalizedFrom = from.toLowerCase();
      const normalizedTo = to.toLowerCase();

      const unitFrom = normalizedFrom === 'lb' ? 'lbs' : normalizedFrom;
      const unitTo = normalizedTo === 'lb' ? 'lbs' : normalizedTo;

      if (!measure_unit[unitFrom] || !measure_unit[unitTo]) {
        return false;
      }

      const result = conversionObject.functions.converter(
        'Weight',
        measure_unit[unitFrom],
        measure_unit[unitTo],
        value
      );

      if (result === false) {
        return false;
      }

      if (!this.isEmpty(options.decimals)) {
        return this.roundDecimals(result, options.decimals);
      }

      return result;
    },

    distanceLength: (
      value: number,
      from: string,
      to: string,
      options: any = {}
    ): number | false => {
      const measure_unit: Record<string, string> = {
        m: 'Meter',
        cm: 'Centimeter',
        ft: 'Foot',
        in: 'Inch',
      };

      if (typeof from !== 'string' || typeof to !== 'string') {
        return false;
      }

      if (!measure_unit[from] || !measure_unit[to]) {
        return false;
      }

      const result = conversionObject.functions.converter(
        'Length',
        measure_unit[from],
        measure_unit[to],
        value
      );

      if (result === false) {
        console.error('Conversion failed for:', {
          category: 'Length',
          fromUnit: measure_unit[from],
          toUnit: measure_unit[to],
          value,
        });
        return false;
      }

      if (!this.isEmpty(options.decimals)) {
        return this.roundDecimals(result, options.decimals);
      }

      return result;
    },

    temperature: (
      value: number,
      from: string,
      to: string,
      options: any = {}
    ): number | false => {
      const measure_unit: Record<string, string> = {
        C: 'Celsius',
        F: 'Fahrenheit',
      };

      if (!measure_unit[from] || !measure_unit[to]) return false;

      const result = conversionObject.functions.converter(
        'Temperature',
        measure_unit[from],
        measure_unit[to],
        value
      );

      if (result === false) return false;

      if (!this.isEmpty(options.decimals)) {
        return this.roundDecimals(result, options.decimals);
      }

      return result;
    },

    glucose: (value: any, from: string, to: string, options: any = {}) => {
      let result: string | number = '';

      if (this.isEmpty(options)) {
        options = {};
        options.decimals = to === Util.blood_glucose_unit.mg ? 0 : 1;
      }

      if (this.isFloat(value) || this.isInteger(value)) {
        result =
          to === Util.blood_glucose_unit.mg
            ? value * Util.blood_glucose_unit.conversionRate
            : value / Util.blood_glucose_unit.conversionRate;
        return this.roundDecimals(result, options.decimals);
      } else {
        const valueTmp = value.trim().split('-');
        result = parseFloat(valueTmp[0]);
        result =
          to === Util.blood_glucose_unit.mg
            ? result * Util.blood_glucose_unit.conversionRate
            : result / Util.blood_glucose_unit.conversionRate;
        result = this.roundDecimals(result, options.decimals);

        if (!this.isEmpty(valueTmp[1])) {
          const valueMax =
            to === Util.blood_glucose_unit.mg
              ? parseFloat(valueTmp[1]) * Util.blood_glucose_unit.conversionRate
              : parseFloat(valueTmp[1]) /
                Util.blood_glucose_unit.conversionRate;
          result = `${result} - ${this.roundDecimals(
            valueMax,
            options.decimals
          )}`;
        }
      }

      return result;
    },
    showHeightInch(value: number): string {
      if (value === null || value === undefined || isNaN(Number(value)))
        return '';
      let num = Number(value);

      // xử lý khi giá trị đã ở dạng inches? (nếu cần) - ở đây giả định num là feet.decimal
      let feet = Math.floor(num);
      let inches = Math.round((num - feet) * 12);

      // nếu rounding làm inches == 12 thì tăng feet 1 và set inches = 0
      if (inches === 12) {
        feet += 1;
        inches = 0;
      }

      return `${feet}' ${inches}"`;
    },
  };

  // Hàm chính
  static getDateString(
    date: string | Date,
    format: string,
    full_months?: boolean,
    full_weekday?: boolean,
    options: any = {}
  ): string {
    // Kiểm tra date có rỗng không
    if (Utils.isEmpty(date)) return '';

    // Chuyển đổi string thành Date object nếu cần
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    // Kiểm tra options
    if (Utils.isEmpty(options)) options = {};

    // Xác định weekdays và months dựa trên tham số và options
    let weekdays = defaultWeekdays;
    let months = defaultMonths;
    let tt = defaultTT;

    // Xử lý weekdays
    if (!Utils.isEmpty(options.weekdays) && options.weekdays.length === 7) {
      weekdays = options.weekdays;
    } else if (Utils.isBoolean(full_weekday) && full_weekday) {
      weekdays = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
    }

    // Xử lý months
    if (!Utils.isEmpty(options.months) && options.months.length === 12) {
      months = options.months;
    } else if (Utils.isBoolean(full_months) && full_months) {
      months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
    }

    // Hàm định dạng thành phần với zero-padding nếu cần
    const getPaddedComp = (
      comp: number,
      isPadLeft?: boolean
    ): string | number => {
      if (format.indexOf('ff') > -1) return comp.toString();

      if (Utils.isBoolean(isPadLeft) || typeof isPadLeft === 'undefined') {
        return comp < 10 ? '0' + comp : comp.toString();
      } else {
        return comp;
      }
    };

    // Hàm xác định hậu tố thứ tự (st, nd, rd, th)
    const getOrdinalSuffix = (value: number): string => {
      const hunRem = value % 100;
      const tenRem = value % 10;

      if (hunRem - tenRem === 10) return 'th';

      switch (tenRem) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };

    // Đối tượng ánh xạ các thành phần ngày tháng
    const components: { [key: string]: string | number } = {
      'y+': dateObj.getFullYear(), // year
      'Y+': dateObj.getFullYear(), // year
      'd+': getPaddedComp(dateObj.getDate(), options.is_padleft_date), // day: 01-09, 10-31
      'D+': dateObj.getDate(), // day: 1-9, 10-31
      'w+': weekdays[dateObj.getDay()], // weekday
      'h+': getPaddedComp(
        dateObj.getHours() > 12 ? dateObj.getHours() % 12 : dateObj.getHours(),
        options.is_padleft_hour
      ), // hour
      'H+': getPaddedComp(dateObj.getHours(), options.is_padleft_hour), // hour
      'i+': getPaddedComp(dateObj.getMinutes(), options.is_padleft_minute), // minute
      's+': getPaddedComp(dateObj.getSeconds(), options.is_padleft_second), // second
      'S+': getPaddedComp(
        dateObj.getMilliseconds(),
        options.is_padleft_millisecond
      ), // millisecond
      'tt+': dateObj.getHours() >= 12 ? tt[1] : tt[0], // am/pm
      'TT+':
        dateObj.getHours() >= 12 ? tt[1].toUpperCase() : tt[0].toUpperCase(), // AM/PM
      'ff+': getOrdinalSuffix(dateObj.getDate()), // ordinal suffix
      'm+': getPaddedComp(dateObj.getMonth() + 1, options.is_padleft_month), // month
      'M+': months[dateObj.getMonth()], // month name
    };

    // Thay thế các placeholder trong format string
    let formattedDate = format;
    for (const key in components) {
      if (components.hasOwnProperty(key)) {
        const regex = new RegExp('(' + key + ')');
        if (regex.test(formattedDate)) {
          formattedDate = formattedDate.replace(
            regex,
            components[key].toString()
          );
        }
      }
    }

    return formattedDate;
  }
  parseDate(date: any, def: any = new Date('1900-01-01')): any {
    // Xử lý giá trị mặc định
    if (typeof def === 'undefined') {
      def = new Date('1900-01-01');
    } else if (def === 'now') {
      def = new Date();
    } else if (def === '') {
      def = '';
    }

    // Kiểm tra nếu date rỗng
    if (Utils.isEmpty(date)) {
      return def;
    }

    // Nếu date đã là đối tượng Date hợp lệ
    if (this.isDateObj(date)) {
      return date;
    }

    // Xử lý khi date là string
    try {
      const dateStr = String(date).replace(/[a-zA-Z]/g, ' ');
      const parts = dateStr.split(' ');
      const datePart = parts[0].split('-');
      const timePart = !Utils.isEmpty(parts[1])
        ? parts[1].split(':')
        : ['00', '00', '00'];

      const year = parseInt(datePart[0], 10);
      const month = parseInt(datePart[1], 10) - 1; // Tháng trong JavaScript là 0-11
      const day = parseInt(datePart[2], 10);

      // Đảm bảo các phần tử time có giá trị mặc định
      const hours = Utils.isEmpty(timePart[0]) ? 0 : parseInt(timePart[0], 10);
      const minutes = Utils.isEmpty(timePart[1])
        ? 0
        : parseInt(timePart[1], 10);
      const seconds = Utils.isEmpty(timePart[2])
        ? 0
        : parseInt(timePart[2], 10);

      // Tạo đối tượng Date mới
      const newDate = new Date(year, month, day, hours, minutes, seconds);

      // Kiểm tra tính hợp lệ của Date
      if (this.isValidDate(newDate)) {
        return newDate;
      } else {
        // Thử parse bằng cách khác nếu cách trên không thành công
        const parsedDate = new Date(date);
        return this.isValidDate(parsedDate) ? parsedDate : def;
      }
    } catch (ex) {
      // Nếu có lỗi, thử parse bằng Date.parse
      const parsedDate = new Date(date);
      return this.isValidDate(parsedDate) ? parsedDate : def;
    }
  }

  // Hàm kiểm tra xem một giá trị có phải là đối tượng Date hợp lệ không
  private isDateObj(value: any): boolean {
    return value instanceof Date && !isNaN(value.getTime());
  }

  // Hàm kiểm tra tính hợp lệ của Date
  isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }
  static parseDateToLocale(date: any, def: any = new Date('1900-01-01')): any {
    // Xử lý giá trị mặc định
    if (typeof def === 'undefined') {
      def = new Date('1900-01-01');
    } else if (def === 'now') {
      def = new Date();
    } else if (def === '') {
      def = '';
    }

    // Kiểm tra nếu date rỗng
    if (Utils.isEmpty(date)) {
      return def;
    }

    // Chuyển đổi date thành string
    const dateString = String(date);

    // Thử parse bằng Date.parse
    const parsedTimestamp = Date.parse(dateString);

    if (!isNaN(parsedTimestamp)) {
      // Nếu Date.parse thành công, tạo Date object từ timestamp
      return new Date(parsedTimestamp);
    } else {
      // Nếu Date.parse thất bại, thử parse thủ công
      try {
        const dateStr = dateString.replace(/[a-zA-Z]/g, ' ');
        const parts = dateStr.split(' ');
        const datePart = parts[0].split('-');
        const timePart =
          parts.length > 1 && !Utils.isEmpty(parts[1])
            ? parts[1].split(':')
            : ['00', '00', '00'];

        const year = parseInt(datePart[0], 10);
        const month = parseInt(datePart[1], 10) - 1; // Tháng trong JavaScript là 0-11
        const day = parseInt(datePart[2], 10);

        // Đảm bảo các phần tử time có giá trị mặc định
        const hours = Utils.isEmpty(timePart[0])
          ? 0
          : parseInt(timePart[0], 10);
        const minutes = Utils.isEmpty(timePart[1])
          ? 0
          : parseInt(timePart[1], 10);
        const seconds = Utils.isEmpty(timePart[2])
          ? 0
          : parseInt(timePart[2], 10);

        // Tạo đối tượng Date mới
        const newDate = new Date(year, month, day, hours, minutes, seconds);

        // Điều chỉnh timezone offset
        const offset = newDate.getTimezoneOffset();
        const adjustedDate = new Date(newDate.getTime() - offset * 60 * 1000);

        return adjustedDate instanceof Date && !isNaN(adjustedDate.getTime())
          ? adjustedDate
          : def;
      } catch (ex) {
        console.error('Error parsing date:', ex);
        return def;
      }
    }
  }
  static getUserUnits() {
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) return null;

    try {
      const user = JSON.parse(userInfo);
      return {
        temperature: user.extended_attributes?.temperature_unit ?? 'degF',
        height: user.extended_attributes?.height_unit ?? 'ft',
        weight: user.extended_attributes?.weight_unit ?? 'lbs',
        glucose: user.extended_attributes?.blood_glucose_unit ?? 'mg/dL',
      };
    } catch {
      return {
        temperature: 'degC',
        height: 'cm',
        weight: 'kg',
        glucose: 'mg/dL',
      };
    }
  }
  static formatValueByUnit(
    sampleType: string,
    value: number,
    isShowUnit: boolean = false
  ): string | number {
    const units = this.getUserUnits();

    switch (sampleType) {
      case 'WEIGHT': {
        if (units && units.weight === 'kg') {
          const converted = Utils.convertUnit.massWeight(value, 'lbs', 'kg', {
            decimals: 1,
          });
          return converted ? converted : '';
        }
        return this.roundDecimals(value, 1);
      }

      case 'HEIGHT': {
        if (units && units.height === 'cm') {
          const converted = Utils.convertUnit.distanceLength(
            value,
            'ft',
            'cm',
            {
              decimals: 1,
            }
          );
          return converted ? converted : '';
        }
        return (
          Utils.convertUnit.showHeightInch(value) + (isShowUnit ? "'" : '')
        );
      }

      case 'BODY_TEMPER': {
        if (units && units.temperature === 'degC') {
          const converted = Utils.convertUnit.temperature(value, 'F', 'C', {
            decimals: 1,
          });
          return converted ? converted : '';
        }
        return this.roundDecimals(value, 1);
      }

      case 'BLOOD_GLUCOSE': {
        if (units && units.glucose === 'mmol/L') {
          const converted = Utils.convertUnit.glucose(
            value,
            'mg/dL',
            'mmol/L',
            {
              decimals: 2,
            }
          );
          return converted ? converted : '';
        }
        return this.roundDecimals(value, 0);
      }
      case 'STEP': {
        const formatted = this.formatNumber(this.roundDecimals(value, 0));
        return formatted != null ? formatted : '';
      }
      default:
        return value != null ? this.roundDecimals(value, 1) : '';
    }
  }
  static showUnit(sample_type: string, unit: string) {
    const units = this.getUserUnits();
    if (sample_type === 'HEIGHT') {
      return (units?.height === 'cm' ? units?.height : '') ?? '';
    } else if (sample_type === 'WEIGHT') {
      return units?.weight ?? 'lbs';
    } else if (sample_type === 'BODY_TEMPER') {
      return units?.temperature ?? 'degF';
    } else if (sample_type === 'BLOOD_GLUCOSE') {
      return units?.glucose ?? 'mg/dL';
    }
    return unit;
  }
}
