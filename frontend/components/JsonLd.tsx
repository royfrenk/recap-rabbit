interface JsonLdProps {
  data: Record<string, any>
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// Pre-built schema types

export function WebsiteSchema({ url, name }: { url: string; name: string }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name,
        url,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${url}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  )
}

export function OrganizationSchema({
  url,
  name,
  logo,
}: {
  url: string
  name: string
  logo: string
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name,
        url,
        logo,
        sameAs: [],
      }}
    />
  )
}

export function PodcastEpisodeSchema({
  name,
  description,
  url,
  datePublished,
  duration,
  podcastName,
  image,
}: {
  name: string
  description: string
  url: string
  datePublished?: string
  duration?: number
  podcastName: string
  image?: string
}) {
  // Convert seconds to ISO 8601 duration
  const isoDuration = duration
    ? `PT${Math.floor(duration / 60)}M${duration % 60}S`
    : undefined

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'PodcastEpisode',
        name,
        description,
        url,
        ...(datePublished && { datePublished }),
        ...(isoDuration && { timeRequired: isoDuration }),
        ...(image && { image }),
        partOfSeries: {
          '@type': 'PodcastSeries',
          name: podcastName,
        },
      }}
    />
  )
}

export function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  image,
  authorName,
}: {
  headline: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  image?: string
  authorName?: string
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline,
        description,
        url,
        datePublished,
        dateModified: dateModified || datePublished,
        ...(image && { image }),
        author: {
          '@type': 'Organization',
          name: authorName || 'Recap Rabbit',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Recap Rabbit',
          logo: {
            '@type': 'ImageObject',
            url: 'https://recaprabbit.com/logo-full.png',
          },
        },
      }}
    />
  )
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[]
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  )
}
