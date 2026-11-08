/**
 * Client testimonials. Only testimonials from identifiable clients whose projects can be verified
 * (their live websites) are published. The previous template also contained three generic
 * testimonials ("Sarah Johnson", "Michael Chen", "David Okonkwo") that could not be verified; they are
 * intentionally not shown. Add new entries only with the client's permission.
 */
export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  /** Logo in /public/clients. */
  logo?: string;
  website?: { label: string; href: string };
  services: string[];
}

export const testimonials: Testimonial[] = [
  {
    id: 'rebearth-solutions',
    quote:
      'Partnering with nexxacrafts to design our website and brand our marketing materials was a seamless and rewarding experience. Their team perfectly captured our brand identity and delivered a clean, modern look that truly represents Rebearth Solutions.',
    name: 'Walter',
    role: 'Director',
    company: 'Rebearth Solutions',
    logo: '/clients/Rebearth.jpeg',
    website: { label: 'rebearthsolutions.co.ke', href: 'https://rebearthsolutions.co.ke' },
    services: ['Website development', 'Marketing materials'],
  },
  {
    id: 'stetech-solar',
    quote:
      'nexxacrafts did an exceptional job redesigning our website and elevating our brand. Their team was responsive, creative, and truly understood the clean energy space. The new look has boosted our credibility and client engagement.',
    name: 'Stephen Otieno',
    role: 'Founder & Technical Lead',
    company: 'STETECH Solar Technology',
    logo: '/clients/stetech solar.png',
    website: { label: 'stetechsolartechnology.co.ke', href: 'https://stetechsolartechnology.co.ke' },
    services: ['Website redesign', 'Brand refresh'],
  },
];
