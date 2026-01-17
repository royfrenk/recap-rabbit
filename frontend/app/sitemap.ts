import { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.recaprabbit.com'
const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

interface PublicSummaryItem {
  id: string
  slug: string
  title: string | null
  podcast_name: string | null
  updated_at: string | null
}

async function getPublicSummaries(): Promise<PublicSummaryItem[]> {
  try {
    const res = await fetch(`${apiUrl}/api/public/summaries?limit=1000`, {
      next: { revalidate: 3600 } // Revalidate every hour
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Fetch public summary pages
  const summaries = await getPublicSummaries()
  const summaryPages: MetadataRoute.Sitemap = summaries.map(summary => ({
    url: `${siteUrl}/summary/${summary.slug}`,
    lastModified: summary.updated_at ? new Date(summary.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    ...staticPages,
    ...summaryPages,
  ]
}
