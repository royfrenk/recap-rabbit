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
 * Format a date in Apple Podcasts style with relative time for recent dates.
 * - Less than 24 hours ago: "7h ago"
 * - Same year: "Jan 8"
 * - Different year: "12/25/2024"
 *
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Less than 24 hours ago
    if (diffHours < 24 && diffHours >= 0) {
      return `${diffHours}h ago`;
    }

    // Same year - show "Jan 8" format
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Different year - show "12/25/2024" format
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Format a date in full format (e.g., "January 15, 2024").
 *
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatFullDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format duration in seconds to human readable format.
 * - Less than 1 hour: "45 min"
 * - 1 hour or more: "1 hr 31 min"
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
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
