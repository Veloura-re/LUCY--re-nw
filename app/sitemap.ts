import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lucy-re-nw.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    // High Priority Public Pages (Core Brand & Services)
    const corePages: MetadataRoute.Sitemap = [
        {
            url: `${BASE_URL}`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/features`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/about`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/pricing`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/schools`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/demo`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
    ];

    // Secondary Public Pages (Content, Ecosystem, Community)
    const secondaryPages: MetadataRoute.Sitemap = [
        {
            url: `${BASE_URL}/blog`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/docs`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/partners`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/security`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/careers`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/community`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/changelog`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/roadmap`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/compliance`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/status`,
            lastModified,
            changeFrequency: 'always',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/support`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/intelligence`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/deck`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/press`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/network`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/wall`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/insurance`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    // Legal & Policy Pages
    const legalPages: MetadataRoute.Sitemap = [
        {
            url: `${BASE_URL}/terms`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/privacy`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/sla`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/dpa`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/msa`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
    ];

    // Auth & Access Portals
    const authPages: MetadataRoute.Sitemap = [
        {
            url: `${BASE_URL}/login`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/register`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
    ];

    return [...corePages, ...secondaryPages, ...legalPages, ...authPages];
}
