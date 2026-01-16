# Recap Rabbit SEO Roadmap

## Goal
Make Recap Rabbit discoverable via search engines by making episode summaries publicly indexable.

## Key Insight
Each processed episode = a new page that can rank for "[podcast] [episode] summary" searches.

---

## Metrics Dashboard

### Primary Metrics
- [ ] Organic Traffic (Google Analytics)
- [ ] Indexed Pages (Google Search Console)
- [ ] Organic Signups (conversion tracking)

### Secondary Metrics
- [ ] Keyword Rankings
- [ ] Click-Through Rate
- [ ] Core Web Vitals
- [ ] Backlinks

---

## Phase 1: Technical Foundation
**Status**: 🔄 In Progress

- [ ] Add meta tags to all pages (title, description, OG tags)
- [ ] Create dynamic sitemap.xml
- [ ] Add robots.txt
- [ ] Add JSON-LD schema markup
- [ ] Connect Google Search Console (manual)
- [ ] Connect Google Analytics 4 (manual)

## Phase 2: Public Summary Pages
**Status**: ⏳ Planned

- [ ] Create public summary route `/summary/[podcast]/[episode]`
- [ ] Add sharing functionality (copy link, social)
- [ ] Schema markup for PodcastEpisode
- [ ] OG tags for social previews
- [ ] User toggle: make summary public/private
- [ ] Teaser content for non-logged-in users (full summary requires signup)

## Phase 3: Directory & Discovery
**Status**: ⏳ Planned

- [ ] Podcast directory pages `/podcast/[slug]`
- [ ] Topic/category pages `/topics/[slug]`
- [ ] Internal linking between related summaries
- [ ] "Related episodes" recommendations

## Phase 4: Content Marketing
**Status**: ⏳ Planned

- [ ] Blog infrastructure
- [ ] "Best podcasts" list pages
- [ ] Industry trend content
- [ ] Link building outreach

---

## URL Structure

```
/                           # Home (public landing)
/summary/[podcast]/[episode] # Public summary page
/podcast/[slug]             # Podcast directory
/topics/[slug]              # Topic pages
/blog/[slug]                # Blog posts
/episode/[id]               # Private processing page (authenticated)
```

---

## Schema Markup Types

- `WebSite` - Home page
- `Article` - Summary pages
- `PodcastEpisode` - Episode summaries
- `BreadcrumbList` - Navigation
- `Organization` - About Recap Rabbit

---

## Changelog

### 2026-01-16
- Created SEO roadmap
- Starting Phase 1 implementation
