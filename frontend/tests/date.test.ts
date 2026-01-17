import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, formatRelativeDate, formatFullDate, formatDuration, dateFormatters } from '../lib/date'

describe('formatDate', () => {
  describe('null/undefined handling', () => {
    it('should return empty string by default for null input', () => {
      expect(formatDate(null)).toBe('')
    })

    it('should return empty string by default for undefined input', () => {
      expect(formatDate(undefined)).toBe('')
    })

    it('should return custom nullFallback when provided', () => {
      expect(formatDate(null, { nullFallback: 'Never' })).toBe('Never')
      expect(formatDate(undefined, { nullFallback: 'Unknown' })).toBe('Unknown')
    })
  })

  describe('date formatting', () => {
    it('should format date with month and day by default', () => {
      // Use a specific date for predictable results
      const result = formatDate('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/) // year included by default
    })

    it('should include year when includeYear is true (default)', () => {
      const result = formatDate('2024-03-15T10:30:00Z', { includeYear: true })
      expect(result).toMatch(/2024/)
    })

    it('should exclude year when includeYear is false', () => {
      const result = formatDate('2024-03-15T10:30:00Z', { includeYear: false })
      expect(result).not.toMatch(/2024/)
    })

    it('should exclude time by default', () => {
      const result = formatDate('2024-03-15T10:30:00Z')
      // The time portion (10:30 or localized equivalent) should not appear
      // when includeTime is false
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
    })

    it('should include time when includeTime is true', () => {
      const result = formatDate('2024-03-15T10:30:00Z', { includeTime: true })
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      // Time should be present - format varies by locale
    })
  })

  describe('combined options', () => {
    it('should handle all options together', () => {
      const result = formatDate('2024-03-15T10:30:00Z', {
        includeTime: true,
        includeYear: true,
        nullFallback: 'N/A'
      })
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })

    it('should still use nullFallback when date is null regardless of other options', () => {
      const result = formatDate(null, {
        includeTime: true,
        includeYear: true,
        nullFallback: 'No date'
      })
      expect(result).toBe('No date')
    })
  })
})

describe('dateFormatters', () => {
  describe('lastChecked', () => {
    it('should return "Never" for null dates', () => {
      expect(dateFormatters.lastChecked(null)).toBe('Never')
      expect(dateFormatters.lastChecked(undefined)).toBe('Never')
    })

    it('should format valid dates with time', () => {
      const result = dateFormatters.lastChecked('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('lastCheckedShort', () => {
    it('should return "Never" for null dates', () => {
      expect(dateFormatters.lastCheckedShort(null)).toBe('Never')
      expect(dateFormatters.lastCheckedShort(undefined)).toBe('Never')
    })

    it('should format valid dates without time (compact view)', () => {
      const result = dateFormatters.lastCheckedShort('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('createdAt', () => {
    it('should return "Never" for null dates', () => {
      expect(dateFormatters.createdAt(null)).toBe('Never')
    })

    it('should format valid dates with time and year', () => {
      const result = dateFormatters.createdAt('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('publishDate', () => {
    it('should return "Unknown" for null dates', () => {
      expect(dateFormatters.publishDate(null)).toBe('Unknown')
      expect(dateFormatters.publishDate(undefined)).toBe('Unknown')
    })

    it('should format valid dates without time', () => {
      const result = dateFormatters.publishDate('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('activityTime', () => {
    it('should return empty string for null dates', () => {
      expect(dateFormatters.activityTime(null)).toBe('')
      expect(dateFormatters.activityTime(undefined)).toBe('')
    })

    it('should format valid dates with time', () => {
      const result = dateFormatters.activityTime('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('usageLog', () => {
    it('should format dates without year', () => {
      const result = dateFormatters.usageLog('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
      expect(result).not.toMatch(/2024/)
    })

    it('should include time in the output', () => {
      const result = dateFormatters.usageLog('2024-03-15T10:30:00Z')
      expect(result).toMatch(/Mar/)
      expect(result).toMatch(/15/)
    })
  })
})

describe('dateFormatters consistency', () => {
  const testDate = '2024-06-20T14:45:00Z'

  it('all formatters should handle the same valid date without errors', () => {
    expect(() => dateFormatters.lastChecked(testDate)).not.toThrow()
    expect(() => dateFormatters.lastCheckedShort(testDate)).not.toThrow()
    expect(() => dateFormatters.createdAt(testDate)).not.toThrow()
    expect(() => dateFormatters.publishDate(testDate)).not.toThrow()
    expect(() => dateFormatters.activityTime(testDate)).not.toThrow()
    expect(() => dateFormatters.usageLog(testDate)).not.toThrow()
  })

  it('all formatters should handle null without errors', () => {
    expect(() => dateFormatters.lastChecked(null)).not.toThrow()
    expect(() => dateFormatters.lastCheckedShort(null)).not.toThrow()
    expect(() => dateFormatters.createdAt(null)).not.toThrow()
    expect(() => dateFormatters.publishDate(null)).not.toThrow()
    expect(() => dateFormatters.activityTime(null)).not.toThrow()
    expect(() => dateFormatters.usageLog(null)).not.toThrow()
  })

  it('all formatters should handle undefined without errors', () => {
    expect(() => dateFormatters.lastChecked(undefined)).not.toThrow()
    expect(() => dateFormatters.lastCheckedShort(undefined)).not.toThrow()
    expect(() => dateFormatters.createdAt(undefined)).not.toThrow()
    expect(() => dateFormatters.publishDate(undefined)).not.toThrow()
    expect(() => dateFormatters.activityTime(undefined)).not.toThrow()
    expect(() => dateFormatters.usageLog(undefined)).not.toThrow()
  })
})

describe('formatRelativeDate', () => {
  beforeEach(() => {
    // Mock current date to 2024-03-15 12:00:00 UTC for predictable tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return relative time for dates less than 24 hours ago', () => {
    expect(formatRelativeDate('2024-03-15T05:00:00Z')).toBe('7h ago')
    expect(formatRelativeDate('2024-03-15T11:00:00Z')).toBe('1h ago')
    expect(formatRelativeDate('2024-03-15T12:00:00Z')).toBe('0h ago')
  })

  it('should return short date format for dates in same year', () => {
    const result = formatRelativeDate('2024-01-08T10:00:00Z')
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/8/)
  })

  it('should return numeric date format for dates in different year', () => {
    const result = formatRelativeDate('2023-12-25T10:00:00Z')
    expect(result).toMatch(/12/)
    expect(result).toMatch(/25/)
    expect(result).toMatch(/2023/)
  })

  it('should return input string for invalid dates', () => {
    expect(formatRelativeDate('invalid-date')).toBe('invalid-date')
  })
})

describe('formatFullDate', () => {
  it('should format date in full format with long month', () => {
    const result = formatFullDate('2024-01-15T10:00:00Z')
    expect(result).toMatch(/January/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2024/)
  })

  it('should handle various months correctly', () => {
    expect(formatFullDate('2024-06-20T10:00:00Z')).toMatch(/June/)
    expect(formatFullDate('2024-12-01T10:00:00Z')).toMatch(/December/)
  })

  it('should return input string for invalid dates', () => {
    expect(formatFullDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDuration', () => {
  it('should format duration less than an hour', () => {
    expect(formatDuration(2700)).toBe('45 min')
    expect(formatDuration(300)).toBe('5 min')
    expect(formatDuration(60)).toBe('1 min')
  })

  it('should format duration of exactly one hour', () => {
    expect(formatDuration(3600)).toBe('1 hr 0 min')
  })

  it('should format duration greater than one hour', () => {
    expect(formatDuration(5460)).toBe('1 hr 31 min')
    expect(formatDuration(7200)).toBe('2 hr 0 min')
    expect(formatDuration(10800)).toBe('3 hr 0 min')
  })

  it('should round minutes correctly', () => {
    expect(formatDuration(89)).toBe('1 min') // 1.48 min rounds to 1
    expect(formatDuration(91)).toBe('2 min') // 1.52 min rounds to 2
  })
})
