import { getTranslations } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryCardProps {
  paragraph: string
  takeaways: string[]
  isRTL?: boolean
  languageCode?: string | null
}

export default function SummaryCard({ paragraph, takeaways, isRTL = false, languageCode }: SummaryCardProps) {
  const t = getTranslations(languageCode)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.summary}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(
            "text-muted-foreground leading-relaxed",
            isRTL && "rtl text-right"
          )}>
            {paragraph}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.takeaways}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {takeaways.map((takeaway, index) => (
              <li key={index} className={cn(
                "flex items-start gap-3",
                isRTL && "flex-row-reverse rtl text-right"
              )}>
                <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-muted-foreground">{takeaway}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
