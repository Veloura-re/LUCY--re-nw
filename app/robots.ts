import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lucy-re-nw.vercel.app';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/about',
                    '/features',
                    '/pricing',
                    '/schools',
                    '/contact',
                    '/blog',
                    '/docs',
                    '/security',
                    '/community',
                    '/changelog',
                    '/roadmap',
                    '/status',
                    '/support',
                    '/intelligence',
                    '/deck',
                    '/network',
                    '/wall',
                    '/insurance',
                    '/terms',
                    '/privacy',
                    '/sla',
                    '/dpa',
                    '/msa',
                    '/login',
                    '/register',
                ],
                disallow: [
                    '/admin/',
                    '/dashboard/',
                    '/api/',
                    '/exam/',
                    '/invite/',
                    '/verify/',
                    '/school-suspended',
                    '/logout',
                    '/auth/',
                    '/_next/',
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/dashboard/',
                    '/api/',
                    '/exam/',
                    '/invite/',
                    '/verify/',
                    '/school-suspended',
                    '/logout',
                ],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}
