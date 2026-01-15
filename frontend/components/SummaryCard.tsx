import { getTranslations } from '@/lib/api'

interface SummaryCardProps {
  paragraph: string
  takeaways: string[]
  isRTL?: boolean
  languageCode?: string | null
}

export default function SummaryCard({ paragraph, takeaways, isRTL = false, languageCode }: SummaryCardProps) {
  const directionClass = isRTL ? 'rtl text-right' : ''
  const t = getTranslations(languageCode)

  return (
    <div className="space-y-6">
      <div className={`bg-white rounded-lg shadow p-6 ${directionClass}`}>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.summary}</h2>
        <p className="text-gray-700 leading-relaxed">{paragraph}</p>
      </div>

      <div className={`bg-white rounded-lg shadow p-6 ${directionClass}`}>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.takeaways}</h2>
        <ul className="space-y-2">
          {takeaways.map((takeaway, index) => (
            <li key={index} className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <svg className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
