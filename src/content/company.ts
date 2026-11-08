/**
 * Public company information — the single source for contact details shown across the site.
 * Values come from the existing site (header, footer, contact page and company settings defaults).
 */
export const company = {
  name: 'nexxacrafts',
  tagline: 'Create. Design. Print. Build.',
  summary:
    'One creative and production partner for your digital presence, business branding, print and custom fabrication.',
  phone: '+254 795 333 004',
  phoneHref: 'tel:+254795333004',
  email: 'info@nexacraft.co.ke',
  emailHref: 'mailto:info@nexacraft.co.ke',
  whatsappHref: 'https://wa.me/message/SCQ7POKM6TQ5N1',
  location: 'Siaya, Kenya',
  mapHref: 'https://maps.app.goo.gl/PUpFnT7Yy1DGeiir9',
  serviceArea: 'Serving businesses, schools, events and organisations across Kenya',
  hours: [
    { days: 'Monday – Friday', time: '8:00 AM – 6:00 PM' },
    { days: 'Saturday', time: '9:00 AM – 3:00 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],
  socials: [
    { label: 'Facebook', href: 'https://www.facebook.com/shetrahgrafix' },
    { label: 'X (Twitter)', href: 'https://x.com/shennel_oduor' },
    { label: 'WhatsApp', href: 'https://wa.me/message/SCQ7POKM6TQ5N1' },
  ],
} as const;

export type Company = typeof company;
