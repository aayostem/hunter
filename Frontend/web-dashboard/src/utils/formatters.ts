// src/utils/formatters.ts

/**
 * Format a date with customizable options
 * @param date - The date to format (Date object, string, or timestamp)
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  options?: {
    format?: 'full' | 'long' | 'medium' | 'short';
    includeWeekday?: boolean;
    locale?: string;
  }
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Invalid date check
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const {
    format = 'medium',
    includeWeekday = false,
    locale = 'en-US',
  } = options || {};

  try {
    const dateOptions: Intl.DateTimeFormatOptions = {};

    // Set format based on option
    switch (format) {
      case 'full':
        dateOptions.weekday = 'long';
        dateOptions.year = 'numeric';
        dateOptions.month = 'long';
        dateOptions.day = 'numeric';
        break;
      case 'long':
        dateOptions.year = 'numeric';
        dateOptions.month = 'long';
        dateOptions.day = 'numeric';
        break;
      case 'medium':
        dateOptions.year = 'numeric';
        dateOptions.month = 'short';
        dateOptions.day = 'numeric';
        break;
      case 'short':
        dateOptions.year = '2-digit';
        dateOptions.month = '2-digit';
        dateOptions.day = '2-digit';
        break;
    }

    // Add weekday if requested and not already included
    if (includeWeekday && format !== 'full') {
      dateOptions.weekday = 'short';
    }

    return new Intl.DateTimeFormat(locale, dateOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallbackDateFormatter(dateObj, format, includeWeekday);
  }
};

/**
 * Format a date and time with customizable options
 * @param date - The date to format (Date object, string, or timestamp)
 * @param options - Formatting options
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string | number,
  options?: {
    dateFormat?: 'full' | 'long' | 'medium' | 'short';
    timeFormat?: 'full' | 'long' | 'medium' | 'short';
    hour12?: boolean;
    includeSeconds?: boolean;
    includeWeekday?: boolean;
    locale?: string;
  }
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Invalid date check
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const {
    dateFormat = 'medium',
    timeFormat = 'short',
    hour12 = true,
    includeSeconds = false,
    includeWeekday = false,
    locale = 'en-US',
  } = options || {};

  try {
    const dateTimeOptions: Intl.DateTimeFormatOptions = {};

    // Set date format
    switch (dateFormat) {
      case 'full':
        dateTimeOptions.weekday = 'long';
        dateTimeOptions.year = 'numeric';
        dateTimeOptions.month = 'long';
        dateTimeOptions.day = 'numeric';
        break;
      case 'long':
        dateTimeOptions.year = 'numeric';
        dateTimeOptions.month = 'long';
        dateTimeOptions.day = 'numeric';
        break;
      case 'medium':
        dateTimeOptions.year = 'numeric';
        dateTimeOptions.month = 'short';
        dateTimeOptions.day = 'numeric';
        break;
      case 'short':
        dateTimeOptions.year = '2-digit';
        dateTimeOptions.month = '2-digit';
        dateTimeOptions.day = '2-digit';
        break;
    }

    // Add weekday if requested and not already included
    if (includeWeekday && dateFormat !== 'full') {
      dateTimeOptions.weekday = 'short';
    }

    // Set time format
    switch (timeFormat) {
      case 'full':
      case 'long':
        dateTimeOptions.hour = '2-digit';
        dateTimeOptions.minute = '2-digit';
        dateTimeOptions.second = includeSeconds ? '2-digit' : undefined;
        dateTimeOptions.timeZoneName = 'short';
        break;
      case 'medium':
        dateTimeOptions.hour = '2-digit';
        dateTimeOptions.minute = '2-digit';
        dateTimeOptions.second = includeSeconds ? '2-digit' : undefined;
        break;
      case 'short':
        dateTimeOptions.hour = '2-digit';
        dateTimeOptions.minute = '2-digit';
        dateTimeOptions.second = includeSeconds ? '2-digit' : undefined;
        break;
    }

    dateTimeOptions.hour12 = hour12;

    return new Intl.DateTimeFormat(locale, dateTimeOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return fallbackDateTimeFormatter(dateObj, {
      dateFormat,
      timeFormat,
      hour12,
      includeSeconds,
      includeWeekday,
    });
  }
};

/**
 * Format a time only
 * @param date - The date to format (Date object, string, or timestamp)
 * @param options - Formatting options
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string | number,
  options?: {
    format?: 'full' | 'long' | 'medium' | 'short';
    hour12?: boolean;
    includeSeconds?: boolean;
    locale?: string;
  }
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid time';
  }

  const {
    format = 'short',
    hour12 = true,
    includeSeconds = false,
    locale = 'en-US',
  } = options || {};

  try {
    const timeOptions: Intl.DateTimeFormatOptions = {};

    switch (format) {
      case 'full':
      case 'long':
        timeOptions.hour = '2-digit';
        timeOptions.minute = '2-digit';
        timeOptions.second = includeSeconds ? '2-digit' : undefined;
        timeOptions.timeZoneName = 'short';
        break;
      case 'medium':
        timeOptions.hour = '2-digit';
        timeOptions.minute = '2-digit';
        timeOptions.second = includeSeconds ? '2-digit' : undefined;
        break;
      case 'short':
        timeOptions.hour = '2-digit';
        timeOptions.minute = '2-digit';
        timeOptions.second = includeSeconds ? '2-digit' : undefined;
        break;
    }

    timeOptions.hour12 = hour12;

    return new Intl.DateTimeFormat(locale, timeOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting time:', error);
    return fallbackTimeFormatter(dateObj, { format, hour12, includeSeconds });
  }
};

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - The date to format
 * @param baseDate - The reference date (defaults to now)
 * @returns Formatted relative time string
 */
export const formatRelative = (
  date: Date | string | number,
  baseDate: Date | string | number = new Date()
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const baseObj = baseDate instanceof Date ? baseDate : new Date(baseDate);
  
  if (isNaN(dateObj.getTime()) || isNaN(baseObj.getTime())) {
    return 'Invalid date';
  }

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffMs = dateObj.getTime() - baseObj.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  } else if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  } else if (Math.abs(diffDay) < 7) {
    return rtf.format(diffDay, 'day');
  } else if (Math.abs(diffWeek) < 4) {
    return rtf.format(diffWeek, 'week');
  } else if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, 'month');
  } else {
    return rtf.format(diffYear, 'year');
  }
};

// Fallback formatters for older browsers
function fallbackDateFormatter(
  date: Date,
  format: string,
  includeWeekday: boolean
): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fullWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();

  let result = '';

  if (includeWeekday) {
    result += fullWeekdays[weekday] + ', ';
  }

  switch (format) {
    case 'full':
      result = includeWeekday ? result : fullWeekdays[weekday] + ', ';
      result += fullMonths[month] + ' ' + day + ', ' + year;
      break;
    case 'long':
      result += fullMonths[month] + ' ' + day + ', ' + year;
      break;
    case 'medium':
      result += months[month] + ' ' + day + ', ' + year;
      break;
    case 'short':
      result += (month + 1).toString().padStart(2, '0') + '/' + 
                day.toString().padStart(2, '0') + '/' + 
                year.toString().slice(-2);
      break;
    default:
      result += months[month] + ' ' + day + ', ' + year;
  }

  return result;
}

function fallbackDateTimeFormatter(
  date: Date,
  options: {
    dateFormat: string;
    timeFormat: string;
    hour12: boolean;
    includeSeconds: boolean;
    includeWeekday: boolean;
  }
): string {
  const { dateFormat, timeFormat, hour12, includeSeconds, includeWeekday } = options;
  
  const datePart = fallbackDateFormatter(date, dateFormat, includeWeekday);
  const timePart = fallbackTimeFormatter(date, { 
    format: timeFormat, 
    hour12, 
    includeSeconds 
  });
  
  return `${datePart} at ${timePart}`;
}

function fallbackTimeFormatter(
  date: Date,
  options: {
    format: string;
    hour12: boolean;
    includeSeconds: boolean;
  }
): string {
  const {  hour12, includeSeconds } = options;
  
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = includeSeconds ? ':' + date.getSeconds().toString().padStart(2, '0') : '';
  
  if (hour12) {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes}${seconds} ${ampm}`;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}${seconds}`;
}