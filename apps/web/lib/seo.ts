import { Metadata } from 'next';

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

const defaultOGImage = '/images/toolkit-brand.png';
const siteTitle = 'Forceweaver';
const siteName = 'Forceweaver - Professional Salesforce Solutions';

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
    authors: [{ name: 'Forceweaver', url: 'https://forceweaver.com' }],
    creator: 'Forceweaver',
    publisher: 'Forceweaver',
    metadataBase: new URL('https://forceweaver.com'),
    alternates: canonical ? {
      canonical,
    } : undefined,
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
      ...(article && ogType === 'article' ? {
        publishedTime: article.publishedTime,
        modifiedTime: article.modifiedTime,
        authors: article.author ? [article.author] : undefined,
        tags: article.tags,
      } : {}),
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

// JSON-LD Structured Data Generators

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Forceweaver',
    url: 'https://forceweaver.com',
    logo: 'https://forceweaver.com/forceweaver-logo.png',
    description: 'Professional tools and solutions for Salesforce developers and consultants',
    sameAs: [
      'https://marketplace.visualstudio.com/publishers/forceweaver',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: 'https://forceweaver.com',
    },
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Rev Cloud Blueprint',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '1',
    },
    description: 'Automated testing framework for Salesforce Revenue Cloud. Catch pricing regressions instantly and deploy with total confidence.',
    url: 'https://blueprint.forceweaver.com',
    downloadUrl: 'https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint',
    screenshot: 'https://blueprint.forceweaver.com/images/toolkit-brand.png',
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
      name: article.author || 'Forceweaver Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Forceweaver',
      logo: {
        '@type': 'ImageObject',
        url: 'https://forceweaver.com/forceweaver-logo.png',
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

