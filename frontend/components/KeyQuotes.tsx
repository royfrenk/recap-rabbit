import { getTranslations } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

  const t = getTranslations(languageCode)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t.quotes}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quotes.map((quote, index) => (
            <blockquote
              key={index}
              className={cn(
                "py-2",
                isRTL ? "border-r-4 pr-4 border-l-0 pl-0 rtl text-right" : "border-l-4 pl-4",
                "border-primary"
              )}
            >
              <p className="text-muted-foreground italic">&ldquo;{quote.text}&rdquo;</p>
              {quote.speaker && (
                <cite className="text-sm text-muted-foreground/70 mt-2 block not-italic">
                  — {quote.speaker}
                </cite>
              )}
            </blockquote>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
