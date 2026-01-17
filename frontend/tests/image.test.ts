import { describe, it, expect } from 'vitest'
import { validateImageUrl, getSafeImageUrl } from '../lib/image'

describe('validateImageUrl', () => {
  describe('null/undefined handling', () => {
    it('should return null for null input', () => {
      expect(validateImageUrl(null)).toBe(null)
    })

    it('should return null for undefined input', () => {
      expect(validateImageUrl(undefined)).toBe(null)
    })

    it('should return null for empty string', () => {
      expect(validateImageUrl('')).toBe(null)
    })
  })

  describe('protocol validation', () => {
    it('should allow https URLs', () => {
      const url = 'https://i.scdn.co/image/test.jpg'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should reject http URLs (except localhost)', () => {
      const url = 'http://evil.com/tracking.gif'
      expect(validateImageUrl(url)).toBe(null)
    })

    it('should reject ftp URLs', () => {
      const url = 'ftp://example.com/image.jpg'
      expect(validateImageUrl(url)).toBe(null)
    })

    it('should reject javascript URLs', () => {
      const url = 'javascript:alert(1)'
      expect(validateImageUrl(url)).toBe(null)
    })
  })

  describe('trusted hosts', () => {
    it('should allow Apple Podcasts CDN', () => {
      const url = 'https://is1-ssl.mzstatic.com/image/thumb/test.jpg'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should allow Spotify CDN', () => {
      const url = 'https://i.scdn.co/image/ab67616d0000b273test'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should allow ListenNotes CDN', () => {
      const url = 'https://cdn-images-1.listennotes.com/podcasts/test.jpg'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should allow megaphone CDN', () => {
      const url = 'https://megaphone.imgix.net/podcasts/test.png'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should allow *.mzstatic.com wildcard', () => {
      const url = 'https://is99-ssl.mzstatic.com/image/thumb/test.jpg'
      expect(validateImageUrl(url)).toBe(url)
    })
  })

  describe('blocked hosts', () => {
    it('should block localhost with https', () => {
      const url = 'https://localhost/image.jpg'
      expect(validateImageUrl(url)).toBe(null)
    })

    it('should block 127.0.0.1', () => {
      const url = 'https://127.0.0.1/image.jpg'
      expect(validateImageUrl(url)).toBe(null)
    })

    it('should block private IP 10.x.x.x', () => {
      const url = 'https://10.0.0.1/image.jpg'
      expect(validateImageUrl(url)).toBe(null)
    })

    it('should block private IP 192.168.x.x', () => {
      const url = 'https://192.168.1.1/image.jpg'
      expect(validateImageUrl(url)).toBe(null)
    })

    it('should block private IP 172.x.x.x', () => {
      const url = 'https://172.16.0.1/image.jpg'
      expect(validateImageUrl(url)).toBe(null)
    })
  })

  describe('untrusted hosts with image paths', () => {
    it('should allow URLs with image extensions', () => {
      const url = 'https://example.com/podcast/cover.jpg'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should allow URLs with .png extension', () => {
      const url = 'https://example.com/artwork.png'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should allow URLs with /images/ path marker', () => {
      const url = 'https://example.com/images/podcast123'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should allow URLs with /artwork/ path marker', () => {
      const url = 'https://example.com/artwork/show'
      expect(validateImageUrl(url)).toBe(url)
    })

    it('should reject URLs without image indicators from untrusted hosts', () => {
      const url = 'https://evil.com/tracking-pixel'
      expect(validateImageUrl(url)).toBe(null)
    })

    it('should reject URLs that look like API endpoints', () => {
      const url = 'https://analytics.com/track?user=123'
      expect(validateImageUrl(url)).toBe(null)
    })
  })

  describe('invalid URLs', () => {
    it('should return null for malformed URLs', () => {
      expect(validateImageUrl('not-a-url')).toBe(null)
    })

    it('should return null for URLs without protocol', () => {
      expect(validateImageUrl('example.com/image.jpg')).toBe(null)
    })
  })
})

describe('getSafeImageUrl', () => {
  it('should return validated URL for valid input', () => {
    const url = 'https://i.scdn.co/image/test.jpg'
    expect(getSafeImageUrl(url)).toBe(url)
  })

  it('should return null for invalid input without fallback', () => {
    expect(getSafeImageUrl('https://evil.com/tracking')).toBe(null)
  })

  it('should return fallback for invalid input with fallback', () => {
    const fallback = '/placeholder.png'
    expect(getSafeImageUrl('https://evil.com/tracking', fallback)).toBe(fallback)
  })

  it('should return fallback for null input', () => {
    const fallback = '/placeholder.png'
    expect(getSafeImageUrl(null, fallback)).toBe(fallback)
  })
})
