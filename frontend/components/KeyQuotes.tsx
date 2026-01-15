import { getTranslations } from '@/lib/api'

interface KeyQuote {
  text: string
  speaker: string | null
}

interface KeyQuotesProps {
  quotes: KeyQuote[]
  isRTL?: boolean
  languageCode?: string | null
}

export default function KeyQuotes({ quotes, isRTL = false, languageCode }: KeyQuotesProps) {
  if (!quotes || quotes.length === 0) return null

  const directionClass = isRTL ? 'rtl text-right' : ''
  const borderClass = isRTL ? 'border-r-4 pr-4 border-l-0 pl-0' : 'border-l-4 pl-4'
  const t = getTranslations(languageCode)

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${directionClass}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.quotes}</h2>
      <div className="space-y-4">
        {quotes.map((quote, index) => (
          <blockquote key={index} className={`${borderClass} border-primary-500 py-2`}>
            <p className="text-gray-700 italic">&ldquo;{quote.text}&rdquo;</p>
            {quote.speaker && (
              <cite className="text-sm text-gray-500 mt-1 block not-italic">
                — {quote.speaker}
              </cite>
            )}
          </blockquote>
        ))}
      </div>
    </div>
  )
}
