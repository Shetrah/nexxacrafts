/**
 * Portfolio entries. Images are resolved from `media.portfolio[imageKey]` in src/content/media.ts.
 * Entries marked `illustrative: true` use licensed stock photography to represent the type of work
 * (carried over from the previous site) and must be replaced with nexxacrafts's own project
 * photography before launch — the UI labels them "Illustrative image".
 */
export type PortfolioCategory = 'digital' | 'branding' | 'print' | 'packaging';

export interface PortfolioItem {
  id: string;
  title: string;
  category: PortfolioCategory;
  client?: string;
  summary: string;
  description: string;
  /** Catalogue slugs of the services involved (src/lib/catalog.ts). */
  services: string[];
  imageKey: string;
  /** Optional secondary image key (e.g. a mobile screenshot). */
  secondaryImageKey?: string;
  link?: { label: string; href: string };
  illustrative?: boolean;
  featured?: boolean;
}

export const portfolioCategories: Array<{ id: PortfolioCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All work' },
  { id: 'digital', label: 'Websites & software' },
  { id: 'branding', label: 'Branding' },
  { id: 'print', label: 'Print' },
  { id: 'packaging', label: 'Packaging' },
];

export const portfolio: PortfolioItem[] = [
  {
    id: 'rebearth-solutions-website',
    title: 'Rebearth Solutions website & marketing materials',
    category: 'digital',
    client: 'Rebearth Solutions',
    summary: 'A clean, modern website and branded marketing materials.',
    description:
      'Website design and development together with branded marketing materials, built to capture the Rebearth Solutions identity and present it consistently online and in print.',
    services: ['website-software', 'graphic-design'],
    imageKey: 'rebearth-solutions-website',
    secondaryImageKey: 'rebearth-solutions-website-mobile',
    link: { label: 'rebearthsolutions.co.ke', href: 'https://rebearthsolutions.co.ke' },
    featured: true,
  },
  {
    id: 'stetech-solar-website',
    title: 'STETECH Solar Technology website redesign',
    category: 'digital',
    client: 'STETECH Solar Technology',
    summary: 'A website redesign and brand refresh for a clean-energy company.',
    description:
      'A redesign of the STETECH Solar Technology website and an elevated brand presentation for the clean-energy sector, focused on credibility and client engagement.',
    services: ['website-software', 'graphic-design'],
    imageKey: 'stetech-solar-website',
    secondaryImageKey: 'stetech-solar-website-mobile',
    link: { label: 'stetechsolartechnology.co.ke', href: 'https://stetechsolartechnology.co.ke' },
    featured: true,
  },
  {
    id: 'corporate-branding-package',
    title: 'Corporate branding package',
    category: 'branding',
    summary: 'Logo, business cards, letterheads and brand guidelines.',
    description:
      'Complete corporate identity design including logo, business cards, letterheads and comprehensive brand guidelines for consistent brand application.',
    services: ['graphic-design'],
    imageKey: 'corporate-branding-package',
    illustrative: true,
    featured: true,
  },
  {
    id: 'promotional-banners',
    title: 'Promotional banners',
    category: 'print',
    summary: 'Weather-resistant large-format banners for an outdoor campaign.',
    description:
      'Large-format banner printing for an outdoor marketing campaign with weather-resistant materials and eye-catching designs that drive engagement.',
    services: ['banner-printing', 'graphic-design'],
    imageKey: 'promotional-banners',
    illustrative: true,
    featured: true,
  },
  {
    id: 'event-t-shirts',
    title: 'Event T-shirts',
    category: 'print',
    summary: 'Custom-designed, printed T-shirts for a corporate event.',
    description:
      'Custom designed and printed T-shirts for a major corporate event with over 500 participants, featuring premium quality materials and vibrant colours.',
    services: ['graphic-design'],
    imageKey: 'event-t-shirts',
    illustrative: true,
  },
  {
    id: 'product-packaging',
    title: 'Product packaging',
    category: 'packaging',
    summary: 'Boxes and labels for a premium skincare line.',
    description:
      'Custom packaging design for a premium skincare product line, including elegant boxes, labels and sustainable packaging solutions.',
    services: ['graphic-design', 'sticker-printing'],
    imageKey: 'product-packaging',
    illustrative: true,
  },
  {
    id: 'memorial-program',
    title: 'Memorial programme',
    category: 'print',
    summary: 'A respectful, elegantly finished eulogy programme.',
    description:
      'Thoughtfully designed eulogy programme with custom typography, elegant finishing and a respectful layout to honour cherished memories.',
    services: ['graphic-design'],
    imageKey: 'memorial-program',
    illustrative: true,
  },
  {
    id: 'corporate-stationery',
    title: 'Corporate stationery',
    category: 'branding',
    summary: 'Business cards, letterheads, envelopes and folders.',
    description:
      'Complete stationery design suite including business cards, letterheads, envelopes and folders with consistent brand application.',
    services: ['graphic-design'],
    imageKey: 'corporate-stationery',
    illustrative: true,
  },
];
