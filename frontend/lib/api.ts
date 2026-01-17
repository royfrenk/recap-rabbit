import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Add auth token to all requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  speaker: string | null
  speaker_label?: string  // Original label (A, B, C) for manual override
  speaker_gender?: string // male, female, unknown
}

export interface KeyQuote {
  text: string
  speaker: string | null
  timestamp?: number
}

export interface EpisodeSummary {
  paragraph: string
  takeaways: string[]
  key_quotes: KeyQuote[]
  paragraph_en?: string | null  // English translation for non-English podcasts
  takeaways_en?: string[] | null
}

// RTL languages for display direction
export const RTL_LANGUAGES = new Set(['he', 'ar', 'fa', 'ur', 'yi'])

// Translations for UI labels by language code
export const TRANSLATIONS: Record<string, { summary: string; takeaways: string; quotes: string; transcript: string }> = {
  en: { summary: 'Summary', takeaways: 'Key Takeaways', quotes: 'Key Quotes', transcript: 'Transcript' },
  he: { summary: 'סיכום', takeaways: 'נקודות עיקריות', quotes: 'ציטוטים נבחרים', transcript: 'תמליל' },
  ar: { summary: 'ملخص', takeaways: 'النقاط الرئيسية', quotes: 'اقتباسات مهمة', transcript: 'النص' },
  es: { summary: 'Resumen', takeaways: 'Puntos clave', quotes: 'Citas destacadas', transcript: 'Transcripción' },
  fr: { summary: 'Résumé', takeaways: 'Points clés', quotes: 'Citations clés', transcript: 'Transcription' },
  de: { summary: 'Zusammenfassung', takeaways: 'Wichtige Erkenntnisse', quotes: 'Wichtige Zitate', transcript: 'Transkript' },
  pt: { summary: 'Resumo', takeaways: 'Pontos principais', quotes: 'Citações importantes', transcript: 'Transcrição' },
  it: { summary: 'Riepilogo', takeaways: 'Punti chiave', quotes: 'Citazioni importanti', transcript: 'Trascrizione' },
  ru: { summary: 'Резюме', takeaways: 'Ключевые выводы', quotes: 'Ключевые цитаты', transcript: 'Транскрипция' },
  ja: { summary: '要約', takeaways: '重要ポイント', quotes: '注目の引用', transcript: '文字起こし' },
  zh: { summary: '摘要', takeaways: '要点', quotes: '精选语录', transcript: '文字记录' },
  ko: { summary: '요약', takeaways: '핵심 요점', quotes: '주요 인용문', transcript: '대본' },
}

export function getTranslations(languageCode: string | null | undefined) {
  return TRANSLATIONS[languageCode || 'en'] || TRANSLATIONS.en
}

export interface EpisodeResult {
  id: string
  title: string | null
  podcast_name: string | null
  description: string | null
  status: 'pending' | 'downloading' | 'transcribing' | 'diarizing' | 'cleaning' | 'summarizing' | 'completed' | 'failed'
  progress: number
  status_message: string | null
  transcript: TranscriptSegment[] | null
  cleaned_transcript: string | null
  summary: EpisodeSummary | null
  error: string | null
  duration_seconds: number | null
  audio_url: string | null
  language_code: string | null  // Detected language (e.g., 'he', 'en', 'es')
  created_at: string | null
  updated_at: string | null
}

export interface EpisodeListItem {
  id: string
  title: string | null
  podcast_name: string | null
  status: string
  progress: number
  created_at: string | null
  duration_seconds: number | null
}

export interface EpisodeListResponse {
  episodes: EpisodeListItem[]
  total: number
}

export interface PDFExportOptions {
  include_summary: boolean
  include_takeaways: boolean
  include_quotes: boolean
  include_transcript: boolean
}

export interface SearchResult {
  id: string
  title: string
  podcast_name: string
  podcast_id?: string
  description: string | null
  audio_url: string
  thumbnail: string | null
  duration_seconds: number | null
  publish_date: string | null
}

export interface PodcastLookupResult {
  results: SearchResult[]
  total: number
  podcast_id?: string
  podcast_name?: string
  podcast_thumbnail?: string
  feed_url?: string
  message?: string
}

export async function uploadEpisode(file: File, title?: string, podcastName?: string): Promise<{ id: string }> {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (podcastName) formData.append('podcast_name', podcastName)

  const response = await api.post('/episodes/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export async function processUrl(
  url: string,
  title?: string,
  podcastName?: string,
  description?: string
): Promise<{ id: string }> {
  const response = await api.post('/episodes/url', {
    url,
    title,
    podcast_name: podcastName,
    description,
  })
  return response.data
}

export async function getEpisodeStatus(id: string): Promise<{
  id: string;
  status: string;
  progress: number;
  error: string | null;
  status_message: string | null;
  duration_seconds: number | null;
}> {
  const response = await api.get(`/episodes/${id}/status`)
  return response.data
}

export async function getEpisode(id: string): Promise<EpisodeResult> {
  const response = await api.get(`/episodes/${id}`)
  return response.data
}

export async function searchPodcasts(query: string, limit: number = 10): Promise<{ results: SearchResult[]; total: number }> {
  const response = await api.get('/search', { params: { q: query, limit } })
  return response.data
}

export async function getPopularSearches(limit: number = 6): Promise<string[]> {
  const response = await api.get('/search/popular', { params: { limit } })
  return response.data
}

export async function lookupPodcastByUrl(url: string, limit: number = 20): Promise<PodcastLookupResult> {
  const response = await api.get('/search/podcast/lookup', { params: { url, limit } })
  return response.data
}

export async function getPodcastEpisodes(podcastId: string, limit: number = 50): Promise<PodcastLookupResult> {
  const response = await api.get(`/search/podcast/${podcastId}`, { params: { limit } })
  return response.data
}

// Helper to detect if a URL is a podcast platform URL (vs direct audio URL)
export function isPodcastPlatformUrl(url: string): boolean {
  const platformPatterns = [
    /podcasts\.apple\.com/,
    /itunes\.apple\.com.*podcast/,
  ]
  return platformPatterns.some(pattern => pattern.test(url))
}

export async function getEpisodeHistory(
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<EpisodeListResponse> {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.append('status', status)
  params.append('limit', String(limit))
  params.append('offset', String(offset))

  const response = await api.get(`/episodes?${params.toString()}`)
  return response.data
}

export async function resumeEpisode(id: string): Promise<{ message: string; id: string }> {
  const response = await api.post(`/episodes/${id}/resume`)
  return response.data
}

export async function exportPDF(episodeId: string, options: PDFExportOptions): Promise<Blob> {
  const response = await api.post(`/episodes/${episodeId}/export/pdf`, options, {
    responseType: 'blob'
  })
  return response.data
}

export interface UsageLogEntry {
  service: string
  operation: string
  episode_id: string | null
  input_units: number
  output_units: number
  cost_usd: number
  created_at: string
}

export interface ServiceUsage {
  calls: number
  input_units: number
  output_units: number
  cost_usd: number
}

export interface DailyUsage {
  total: number
  by_service: Record<string, number>
}

export interface UsageStats {
  period_days: number
  total_cost_usd: number
  by_service: Record<string, ServiceUsage>
  daily: Record<string, DailyUsage>
  recent_logs: UsageLogEntry[]
}

export async function getUsageStats(days: number = 30): Promise<UsageStats> {
  const response = await api.get('/usage', { params: { days } })
  return response.data
}

export async function updateSpeakers(
  episodeId: string,
  speakerMap: Record<string, string>
): Promise<void> {
  await api.put(`/episodes/${episodeId}/speakers`, {
    speaker_map: speakerMap
  })
}

// Public summary types and functions

export interface PublicSummary {
  slug: string
  title: string | null
  podcast_name: string | null
  description: string | null
  summary: EpisodeSummary | null
  duration_seconds: number | null
  language_code: string | null
  created_at: string | null
}

export interface PublicSummaryListItem {
  id: string
  slug: string
  title: string | null
  podcast_name: string | null
  updated_at: string | null
}

export async function getPublicSummary(slug: string): Promise<PublicSummary> {
  const response = await api.get(`/public/summary/${slug}`)
  return response.data
}

export async function listPublicSummaries(limit: number = 100): Promise<PublicSummaryListItem[]> {
  const response = await api.get('/public/summaries', { params: { limit } })
  return response.data
}

export async function setEpisodePublic(episodeId: string, isPublic: boolean): Promise<{
  is_public: boolean
  slug: string | null
  share_url: string | null
}> {
  const response = await api.put(`/episodes/${episodeId}/public`, { is_public: isPublic })
  return response.data
}

export async function getEpisodePublicStatus(episodeId: string): Promise<{
  is_public: boolean
  slug: string | null
}> {
  const response = await api.get(`/episodes/${episodeId}/public-status`)
  return response.data
}

// ============ Subscription Types ============

export type SubscriptionEpisodeStatus = 'pending' | 'processing' | 'completed' | 'skipped' | 'failed'

export interface SubscriptionEpisode {
  id: number
  subscription_id: string
  episode_guid: string
  episode_title: string | null
  audio_url: string | null
  publish_date: string | null
  duration_seconds: number | null
  episode_id: string | null  // Linked processed episode
  status: SubscriptionEpisodeStatus
  created_at: string | null
}

export interface Subscription {
  id: string
  user_id: string
  podcast_id: string
  podcast_name: string
  feed_url: string
  artwork_url: string | null
  is_active: boolean
  last_checked_at: string | null
  last_episode_date: string | null
  created_at: string | null
  total_episodes: number
  processed_episodes: number
}

export interface SubscriptionWithEpisodes {
  subscription: Subscription
  episodes: SubscriptionEpisode[]
  total_episodes: number
}

export interface SubscriptionCreateRequest {
  podcast_id: string
  podcast_name: string
  feed_url: string
  artwork_url?: string
}

export interface CheckEpisodesResponse {
  new_episodes: number
  auto_processed: number
}

// ============ Subscription API Functions ============

export async function listSubscriptions(): Promise<{ subscriptions: Subscription[] }> {
  const response = await api.get('/subscriptions')
  return response.data
}

export async function createSubscription(data: SubscriptionCreateRequest): Promise<Subscription> {
  const response = await api.post('/subscriptions', data)
  return response.data
}

export async function getSubscription(
  subscriptionId: string,
  options?: {
    status?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }
): Promise<SubscriptionWithEpisodes> {
  const params = new URLSearchParams()
  if (options?.status) params.append('status', options.status)
  if (options?.start_date) params.append('start_date', options.start_date)
  if (options?.end_date) params.append('end_date', options.end_date)
  if (options?.limit) params.append('limit', String(options.limit))
  if (options?.offset) params.append('offset', String(options.offset))

  const url = params.toString()
    ? `/subscriptions/${subscriptionId}?${params.toString()}`
    : `/subscriptions/${subscriptionId}`
  const response = await api.get(url)
  return response.data
}

export async function updateSubscription(
  subscriptionId: string,
  data: { is_active?: boolean }
): Promise<Subscription> {
  const response = await api.put(`/subscriptions/${subscriptionId}`, data)
  return response.data
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await api.delete(`/subscriptions/${subscriptionId}`)
}

export async function getSubscriptionEpisodes(
  subscriptionId: string,
  options?: {
    status?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }
): Promise<{ episodes: SubscriptionEpisode[]; total: number }> {
  const params = new URLSearchParams()
  if (options?.status) params.append('status', options.status)
  if (options?.start_date) params.append('start_date', options.start_date)
  if (options?.end_date) params.append('end_date', options.end_date)
  if (options?.limit) params.append('limit', String(options.limit))
  if (options?.offset) params.append('offset', String(options.offset))

  const url = params.toString()
    ? `/subscriptions/${subscriptionId}/episodes?${params.toString()}`
    : `/subscriptions/${subscriptionId}/episodes`
  const response = await api.get(url)
  return response.data
}

export async function checkSubscriptionForNewEpisodes(
  subscriptionId: string
): Promise<CheckEpisodesResponse> {
  const response = await api.post(`/subscriptions/${subscriptionId}/check`)
  return response.data
}

export async function batchProcessEpisodes(
  subscriptionId: string,
  episodeIds: number[]
): Promise<{ message: string; episode_count: number }> {
  const response = await api.post(`/subscriptions/${subscriptionId}/process-batch`, {
    episode_ids: episodeIds
  })
  return response.data
}

export interface QueuedEpisode {
  id: number
  subscription_id: string
  episode_guid: string
  episode_title: string | null
  audio_url: string | null
  publish_date: string | null
  duration_seconds: number | null
  episode_id: string | null
  status: string
  created_at: string | null
  podcast_name: string
  artwork_url: string | null
}

export async function getProcessingQueue(
  limit: number = 100
): Promise<{ episodes: QueuedEpisode[]; total: number }> {
  const response = await api.get('/subscriptions/queue', { params: { limit } })
  return response.data
}

export async function resetStuckEpisodes(
  subscriptionId: string
): Promise<{ message: string; reset_count: number; episode_ids: number[] }> {
  const response = await api.post(`/subscriptions/${subscriptionId}/reset-stuck`)
  return response.data
}
