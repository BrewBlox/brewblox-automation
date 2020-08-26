import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import parseDuration from 'parse-duration';

// repeated number + time unit
// 'm' for minute is allowed here
export const durationExp = /^(\s*\d*\.?\d+\s*(ms|milliseconds?|s|seconds?|m|mins?|minutes?|h|hours?|d|days?)\s*)*$/;

export const isDurationString =
  (v: any): v is string =>
    isString(v) && durationExp.test(v);

export const durationMs =
  (duration: number | string): number => {
    if (!duration) {
      return 0;
    }
    if (isNumber(duration)) {
      return duration;
    }
    if (isDurationString(duration)) {
      return parseDuration(duration);
    }
    throw new Error(`Invalid input: ${JSON.stringify(duration)}`);
  };

export const durationString =
  (duration: number | string): string => {
    const ms = durationMs(duration);
    const secondsTotal = Number(ms) / 1000;
    const days = Math.floor(secondsTotal / 86400);
    const hours = Math.floor((secondsTotal - (days * 86400)) / 3600);
    const minutes =
      Math.floor((secondsTotal - (days * 86400) - (hours * 3600)) / 60);
    const seconds = Math.floor(
      secondsTotal - (days * 86400) - (hours * 3600) - (minutes * 60));
    const milliseconds = (secondsTotal < 10) ? Math.floor((secondsTotal - Math.floor(secondsTotal)) * 1000) : 0;
    const values = [
      [days, 'd'],
      [hours, 'h'],
      [minutes, 'm'],
      [seconds, 's'],
      [milliseconds, 'ms'],
    ];

    const strVal = values
      .filter(([val]) => !!val)
      .map(([val, unit]) => `${val}${unit}`)
      .join(' ');
    return strVal || '0s';
  };
