// metrics.ts
export type TemperatureUnit = 'Kelvin' | 'Celsius' | 'Fahrenheit' | 'Rankine';

interface TemperatureConversion {
  toKelvin: (e: number) => number;
  toCelsius: (e: number) => number;
  toFahrenheit: (e: number) => number;
  toRankine: (e: number) => number;
}

interface SpecialConversions {
  Temperature: Record<TemperatureUnit, TemperatureConversion>;
}

type MasterConversions = Record<string, Record<string, number>>;

export interface ConversionObject {
  special: SpecialConversions;
  master: MasterConversions;
  functions: {
    converter: (
      context: string,
      from: string,
      to: string,
      subject: number
    ) => number | false;
  };
}

const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const conversionObject: ConversionObject = {
  special: {
    Temperature: {
      Kelvin: {
        toKelvin: (e) => e,
        toCelsius: (e) => e - 273.15,
        toFahrenheit: (e) => e * (9 / 5) - 459.67,
        toRankine: (e) => e * (9 / 5),
      },
      Celsius: {
        toKelvin: (e) => e + 273.15,
        toCelsius: (e) => e,
        toFahrenheit: (e) => e * (9 / 5) + 32,
        toRankine: (e) => (e + 273.15) * (9 / 5),
      },
      Fahrenheit: {
        toKelvin: (e) => ((e + 459.67) * 5) / 9,
        toCelsius: (e) => ((e - 32) * 5) / 9,
        toFahrenheit: (e) => e,
        toRankine: (e) => e + 459.67,
      },
      Rankine: {
        toKelvin: (e) => (e * 5) / 9,
        toCelsius: (e) => ((e - 491.67) * 5) / 9,
        toFahrenheit: (e) => e - 459.67,
        toRankine: (e) => e,
      },
    },
  },

  master: {
    Length: {
      Meter: 1,
      Centimeter: 100,
      Millimeter: 1000,
      Kilometer: 0.001,
      Inch: 39.3701,
      Foot: 3.28084,
      Yard: 1.09361,
      Mile: 0.000621371,
    },
    Weight: {
      Kilogram: 1,
      Gram: 1000,
      Milligram: 1000000,
      Pound: 2.20462,
      Ounce: 35.274,
      Ton: 0.001,
    },
    Area: {
      'Square Meter': 1,
      'Square Kilometer': 0.000001,
      'Square Centimeter': 10000,
      'Square Millimeter': 1000000,
      'Square Mile': 3.861e-7,
      'Square Yard': 1.19599,
      'Square Foot': 10.7639,
      'Square Inch': 1550,
      Hectare: 0.0001,
      Acre: 0.000247105,
    },
    Volume: {
      Liter: 1,
      Milliliter: 1000,
      CubicMeter: 0.001,
      CubicCentimeter: 1000,
      CubicInch: 61.0237,
      CubicFoot: 0.0353147,
      CubicYard: 0.00130795,
      Gallon: 0.264172,
      Quart: 1.05669,
      Pint: 2.11338,
      Cup: 4.22675,
      FluidOunce: 33.814,
      Tablespoon: 67.628,
      Teaspoon: 202.884,
    },
    Speed: {
      'Meter/Second': 1,
      'Kilometer/Hour': 3.6,
      'Mile/Hour': 2.23694,
      Knot: 1.94384,
      'Foot/Second': 3.28084,
    },
    Time: {
      Second: 1,
      Millisecond: 1000,
      Microsecond: 1000000,
      Nanosecond: 1000000000,
      Minute: 1 / 60,
      Hour: 1 / 3600,
      Day: 1 / 86400,
      Week: 1 / 604800,
      Month: 1 / 2628000,
      Year: 1 / 31536000,
    },
  },

  functions: {
    converter: (context, from, to, subject) => {
      const ctx = capitalize(context);
      const fromU = capitalize(from);
      const toU = capitalize(to);

      // Special conversions
      if (ctx in conversionObject.special) {
        const specialCtx =
          conversionObject.special[ctx as keyof SpecialConversions];
        const fromConv = (specialCtx as any)[fromU];
        if (fromConv && typeof fromConv[`to${toU}`] === 'function') {
          return fromConv[`to${toU}`](subject);
        }
        return false;
      }

      // Master conversions
      const masterCtx = conversionObject.master[ctx];
      if (
        masterCtx &&
        masterCtx[toU] !== undefined &&
        masterCtx[fromU] !== undefined
      ) {
        return (masterCtx[toU] / masterCtx[fromU]) * subject;
      }

      return false;
    },
  },
};
