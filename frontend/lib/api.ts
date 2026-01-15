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
  description: string | null
  audio_url: string
  thumbnail: string | null
  duration_seconds: number | null
  publish_date: string | null
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
