/**
 * Shared date formatting utilities.
 * Consolidates duplicate formatDate functions across the codebase.
 */

export interface FormatDateOptions {
  includeTime?: boolean;    // default: false
  includeYear?: boolean;    // default: true
  nullFallback?: string;    // default: ''
}

/**
 * Format a date string with configurable options.
 *
 * @param dateStr - ISO date string or null/undefined
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  dateStr: string | null | undefined,
  options: FormatDateOptions = {}
): string {
  const {
    includeTime = false,
    includeYear = true,
    nullFallback = ''
  } = options;

  if (!dateStr) {
    return nullFallback;
  }

  const date = new Date(dateStr);

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (includeYear) {
    formatOptions.year = 'numeric';
  }

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  return date.toLocaleDateString('en-US', formatOptions);
}

/**
 * Pre-configured date formatters for common use cases.
 */
export const dateFormatters = {
  /**
   * For "Last checked" timestamps - includes time, shows "Never" if null.
   * Used in: subscription detail page (full view)
   */
  lastChecked: (dateStr: string | null | undefined): string =>
    formatDate(dateStr, { includeTime: true, nullFallback: 'Never' }),

  /**
   * For "Last checked" in compact views - no time, shows "Never" if null.
   * Used in: SubscriptionCard (list view)
   */
  lastCheckedShort: (dateStr: string | null | undefined): string =>
    formatDate(dateStr, { includeTime: false, nullFallback: 'Never' }),

  /**
   * For "Created at" timestamps - includes time, shows "Never" if null.
   * Used in: subscription detail page
   */
  createdAt: (dateStr: string | null | undefined): string =>
    formatDate(dateStr, { includeTime: true, nullFallback: 'Never' }),

  /**
   * For episode publish dates - no time, shows "Unknown" if null.
   * Used in: EpisodeSelector
   */
  publishDate: (dateStr: string | null | undefined): string =>
    formatDate(dateStr, { includeTime: false, nullFallback: 'Unknown' }),

  /**
   * For activity/history timestamps - includes time, empty string if null.
   * Used in: history page
   */
  activityTime: (dateStr: string | null | undefined): string =>
    formatDate(dateStr, { includeTime: true, nullFallback: '' }),

  /**
   * For usage log timestamps - includes time but no year (for recent logs).
   * Used in: usage page
   */
  usageLog: (dateStr: string | null | undefined): string =>
    formatDate(dateStr, { includeTime: true, includeYear: false }),
};
