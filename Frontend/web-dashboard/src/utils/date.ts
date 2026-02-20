// src/utils/date.ts

/**
 * Format a date as a relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date - The date to format
 * @param baseDate - The reference date (defaults to now)
 * @returns Formatted relative time string
 */
export const formatRelative = (date: Date | string | number, baseDate: Date | string | number = new Date()): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const baseObj = baseDate instanceof Date ? baseDate : new Date(baseDate);
  
  // Invalid date check
  if (isNaN(dateObj.getTime()) || isNaN(baseObj.getTime())) {
    return 'Invalid date';
  }

  const diffMs = dateObj.getTime() - baseObj.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  // Future dates
  if (diffMs > 0) {
    if (diffSec < 60) {
      return diffSec === 1 ? 'in 1 second' : `in ${diffSec} seconds`;
    } else if (diffMin < 60) {
      return diffMin === 1 ? 'in 1 minute' : `in ${diffMin} minutes`;
    } else if (diffHour < 24) {
      return diffHour === 1 ? 'in 1 hour' : `in ${diffHour} hours`;
    } else if (diffDay < 7) {
      return diffDay === 1 ? 'in 1 day' : `in ${diffDay} days`;
    } else if (diffWeek < 4) {
      return diffWeek === 1 ? 'in 1 week' : `in ${diffWeek} weeks`;
    } else if (diffMonth < 12) {
      return diffMonth === 1 ? 'in 1 month' : `in ${diffMonth} months`;
    } else {
      return diffYear === 1 ? 'in 1 year' : `in ${diffYear} years`;
    }
  }
  
  // Past dates
  const absDiffSec = Math.abs(diffSec);
  const absDiffMin = Math.abs(diffMin);
  const absDiffHour = Math.abs(diffHour);
  const absDiffDay = Math.abs(diffDay);
  const absDiffWeek = Math.abs(diffWeek);
  const absDiffMonth = Math.abs(diffMonth);
  const absDiffYear = Math.abs(diffYear);

  if (absDiffSec < 60) {
    return absDiffSec <= 5 ? 'just now' : `${absDiffSec} seconds ago`;
  } else if (absDiffMin < 60) {
    return absDiffMin === 1 ? '1 minute ago' : `${absDiffMin} minutes ago`;
  } else if (absDiffHour < 24) {
    return absDiffHour === 1 ? '1 hour ago' : `${absDiffHour} hours ago`;
  } else if (absDiffDay < 7) {
    return absDiffDay === 1 ? 'yesterday' : `${absDiffDay} days ago`;
  } else if (absDiffWeek < 4) {
    return absDiffWeek === 1 ? 'last week' : `${absDiffWeek} weeks ago`;
  } else if (absDiffMonth < 12) {
    return absDiffMonth === 1 ? 'last month' : `${absDiffMonth} months ago`;
  } else {
    return absDiffYear === 1 ? 'last year' : `${absDiffYear} years ago`;
  }
};

/**
 * Format a date and time with customizable options
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string | number,
  options?: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
    hour12?: boolean;
    includeWeekday?: boolean;
    includeTime?: boolean;
    locale?: string;
  }
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Invalid date check
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const {
    dateStyle = 'medium',
    timeStyle = 'short',
    hour12 = true,
    includeWeekday = false,
    includeTime = true,
    locale = 'en-US',
  } = options || {};

  try {
    // Check if Intl is available
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const dateOptions: Intl.DateTimeFormatOptions = {};
      
      // Set date style if needed
      if (includeTime && dateStyle) {
        dateOptions.year = 'numeric';
        dateOptions.month = dateStyle === 'short' ? 'short' : 
                           dateStyle === 'full' ? 'long' : 
                           dateStyle === 'long' ? 'long' : '2-digit';
        dateOptions.day = '2-digit';
      } else if (!includeTime) {
        // Use dateStyle for date-only formatting
        switch (dateStyle) {
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
      }
      
      // Set time style if needed
      if (includeTime) {
        switch (timeStyle) {
          case 'full':
          case 'long':
            dateOptions.hour = '2-digit';
            dateOptions.minute = '2-digit';
            dateOptions.second = '2-digit';
            break;
          case 'medium':
            dateOptions.hour = '2-digit';
            dateOptions.minute = '2-digit';
            dateOptions.second = '2-digit';
            break;
          case 'short':
            dateOptions.hour = '2-digit';
            dateOptions.minute = '2-digit';
            break;
        }
        dateOptions.hour12 = hour12;
      }

      // Add weekday if requested
      if (includeWeekday) {
        dateOptions.weekday = dateStyle === 'full' ? 'long' : 'short';
      }

      return new Intl.DateTimeFormat(locale, dateOptions).format(dateObj);
    }

    // Fallback for older browsers
    return fallbackDateFormat(dateObj, { includeTime, includeWeekday, hour12 });
  } catch {
    // Fallback for any errors
    return fallbackDateFormat(dateObj, { includeTime, includeWeekday, hour12 });
  }
};

/**
 * Format a date only (without time)
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  options?: {
    style?: 'full' | 'long' | 'medium' | 'short';
    includeWeekday?: boolean;
    locale?: string;
  }
): string => {
  const {
    style = 'medium',
    includeWeekday = false,
    locale = 'en-US',
  } = options || {};

  return formatDateTime(date, {
    dateStyle: style,
    includeTime: false,
    includeWeekday,
    locale,
  });
};

/**
 * Format a time only (without date)
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string | number,
  options?: {
    style?: 'full' | 'long' | 'medium' | 'short';
    hour12?: boolean;
    locale?: string;
  }
): string => {
  const {
    style = 'short',
    hour12 = true,
    locale = 'en-US',
  } = options || {};

  // For time-only formatting, we need to use a different approach
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid time';
  }

  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const timeOptions: Intl.DateTimeFormatOptions = {};
      
      switch (style) {
        case 'full':
        case 'long':
        case 'medium':
          timeOptions.hour = '2-digit';
          timeOptions.minute = '2-digit';
          timeOptions.second = '2-digit';
          break;
        case 'short':
          timeOptions.hour = '2-digit';
          timeOptions.minute = '2-digit';
          break;
      }
      
      timeOptions.hour12 = hour12;
      
      return new Intl.DateTimeFormat(locale, timeOptions).format(dateObj);
    }
    
    // Fallback
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    if (hour12) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12Value = hours % 12 || 12;
      return `${hour12Value}:${minutes} ${ampm}`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  } catch {
    return dateObj.toLocaleTimeString();
  }
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is tomorrow
 */
export const isTomorrow = (date: Date | string | number): boolean => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return (
    dateObj.getDate() === tomorrow.getDate() &&
    dateObj.getMonth() === tomorrow.getMonth() &&
    dateObj.getFullYear() === tomorrow.getFullYear()
  );
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: Date | string | number): boolean => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Get the start of a day (midnight)
 */
export const startOfDay = (date: Date | string | number): Date => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
};

/**
 * Get the end of a day (23:59:59.999)
 */
export const endOfDay = (date: Date | string | number): Date => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);
};

/**
 * Fallback date formatter for older browsers
 */
function fallbackDateFormat(
  date: Date,
  options: { includeTime?: boolean; includeWeekday?: boolean; hour12?: boolean }
): string {
  const { includeTime = true, includeWeekday = false, hour12 = true } = options;
  
//   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
//   const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const year = date.getFullYear();
//   const month = months[date.getMonth()];
  const fullMonth = fullMonths[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  const fullWeekday = fullWeekdays[date.getDay()];
  
  let result = '';
  
  if (includeWeekday) {
    result += `${fullWeekday}, `;
  }
  
  result += `${fullMonth} ${day}, ${year}`;
  
  if (includeTime) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    if (hour12) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12Value = hours % 12 || 12;
      result += ` at ${hour12Value}:${minutes}:${seconds} ${ampm}`;
    } else {
      result += ` at ${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
    }
  }
  
  return result;
}