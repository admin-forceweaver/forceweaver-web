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

const solutionOrigins = [
  'https://app.forceweaver.com',
  'https://marketplace.visualstudio.com/publishers/forceweaver',
] as const;

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ForceWeaver',
    url: siteOrigin(),
    logo: `${siteOrigin()}/forceweaver-logo.png`,
    description: 'Professional tools and content for Salesforce Revenue Cloud teams.',
    sameAs: [...solutionOrigins],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: siteOrigin(),
    },
  };
}

export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteOrigin(),
    publisher: {
      '@type': 'Organization',
      name: siteTitle,
      url: siteOrigin(),
    },
  };
}

export function generateSolutionsItemListSchema() {
  const solutions = [
    {
      name: 'ForceWeaver App',
      url: 'https://app.forceweaver.com',
      description:
        'Free browser-based toolkit for Salesforce Revenue Cloud and Core Cloud practitioners.',
    },
    {
      name: 'RevCloud Blueprint',
      url: 'https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint',
      description:
        'VS Code extension for Revenue Cloud pricing test automation with CI/CD integration.',
    },
    {
      name: 'CML Deployer — Advanced Configurator',
      url: 'https://marketplace.visualstudio.com/items?itemName=forceweaver.cml-migrator-advanced',
      description:
        'VS Code extension for automating Advanced Configurator (ExpressionSet) migrations between Salesforce orgs.',
    },
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ForceWeaver solutions',
    description: 'Products and channels from ForceWeaver.',
    numberOfItems: solutions.length,
    itemListElement: solutions.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      description: item.description,
      item: item.url,
    })),
  };
}

function stripJsonLdContext<T extends Record<string, unknown>>(node: T): Omit<T, '@context'> {
  const copy = { ...node };
  delete copy['@context'];
  return copy as Omit<T, '@context'>;
}

function organizationNodeForGraph() {
  return stripJsonLdContext(generateOrganizationSchema() as Record<string, unknown>);
}

function webSiteNodeForGraph() {
  return stripJsonLdContext(generateWebSiteSchema() as Record<string, unknown>);
}

function solutionsItemListNodeForGraph() {
  return stripJsonLdContext(generateSolutionsItemListSchema() as Record<string, unknown>);
}

export function generateHomePageJsonLdGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationNodeForGraph(), webSiteNodeForGraph(), solutionsItemListNodeForGraph()],
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
