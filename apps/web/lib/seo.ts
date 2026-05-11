import { Metadata } from 'next';
import { siteOrigin } from './site';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
  };
}

const defaultOGImage = '/forceweaver-logo.png';
const siteTitle = 'ForceWeaver';
const siteName = 'ForceWeaver — Salesforce Revenue Cloud tools';

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    ogImage = defaultOGImage,
    ogType = 'website',
    article,
  } = config;

  const fullTitle = title.includes(siteTitle) ? title : `${title} | ${siteTitle}`;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    authors: [{ name: 'ForceWeaver', url: siteOrigin() }],
    creator: 'ForceWeaver',
    publisher: 'ForceWeaver',
    metadataBase: new URL(siteOrigin()),
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: ogType,
      ...(article && ogType === 'article'
        ? {
            publishedTime: article.publishedTime,
            modifiedTime: article.modifiedTime,
            authors: article.author ? [article.author] : undefined,
            tags: article.tags,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@forceweaver',
      site: '@forceweaver',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    category: 'technology',
  };

  return metadata;
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ForceWeaver',
    url: siteOrigin(),
    logo: `${siteOrigin()}/forceweaver-logo.png`,
    description: 'Professional tools and content for Salesforce Revenue Cloud teams.',
    sameAs: ['https://marketplace.visualstudio.com/publishers/forceweaver'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: siteOrigin(),
    },
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image || defaultOGImage,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Person',
      name: article.author || 'ForceWeaver Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ForceWeaver',
      logo: {
        '@type': 'ImageObject',
        url: `${siteOrigin()}/forceweaver-logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
