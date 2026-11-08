export type PricingMode = 'instant' | 'quote';
export type FieldType = 'select' | 'number' | 'text' | 'textarea' | 'file' | 'checkbox';
export interface ServiceField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  step?: number;
  help?: string;
}
export interface ServiceDefinition {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  pricingMode: PricingMode;
  startingPrice?: number;
  unit?: string;
  turnaround: string;
  icon: string;
  image: string;
  fields: ServiceField[];
}

export const services: ServiceDefinition[] = [
  {
    slug: 'website-software', name: 'Website & Software Development', category: 'Digital',
    tagline: 'Digital products engineered around your business.',
    description: 'Business websites, online stores, web applications, internal systems, integrations and ongoing support.',
    pricingMode: 'quote', turnaround: 'Scoped to your project', icon: 'Code2',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85',
    fields: [
      { name: 'project_type', label: 'What do you need built?', type: 'select', required: true, options: ['Business website', 'E-commerce website', 'Web application', 'Management system / ERP', 'Mobile application', 'API or integration', 'Maintenance / support'] },
      { name: 'scope', label: 'Project overview', type: 'textarea', required: true, help: 'Describe the problem, users, key features and expected outcome.' },
      { name: 'pages_modules', label: 'Estimated pages or modules', type: 'number', min: 1, step: 1 },
      { name: 'integrations', label: 'Required integrations', type: 'text', help: 'For example: M-Pesa, email, SMS, accounting or CRM.' },
      { name: 'timeline', label: 'Preferred timeline', type: 'select', options: ['Flexible', '2–4 weeks', '1–2 months', '3+ months', 'Urgent – discuss feasibility'] },
      { name: 'budget', label: 'Indicative budget (KES)', type: 'select', options: ['Not sure yet', 'Below 50,000', '50,000–150,000', '150,000–500,000', '500,000+'] },
    ],
  },
  {
    slug: 'graphic-design', name: 'Graphic Design & Branding', category: 'Creative',
    tagline: 'Distinctive visual identities and creative assets.',
    description: 'Logo design, brand identity, business stationery, posters, brochures, packaging and campaign graphics.',
    pricingMode: 'quote', turnaround: 'Depends on deliverables', icon: 'Palette',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=85',
    fields: [
      { name: 'design_type', label: 'Design service', type: 'select', required: true, options: ['Logo design', 'Complete brand identity', 'Business cards / stationery', 'Flyer / poster', 'Brochure / company profile', 'Packaging design', 'Social media designs', 'Other creative work'] },
      { name: 'quantity', label: 'Number of designs / items', type: 'number', min: 1, step: 1, required: true },
      { name: 'brief', label: 'Creative brief', type: 'textarea', required: true, help: 'Share your audience, message, style and preferred colours.' },
      { name: 'formats', label: 'Required final formats', type: 'text', help: 'For example: PDF, PNG, JPG, SVG, AI or editable source files.' },
    ],
  },
  {
    slug: 'banner-printing', name: 'Banner & Large-format Printing', category: 'Print',
    tagline: 'High-impact print for events, retail and outdoor campaigns.',
    description: 'Custom banners, backdrops, roll-ups, signage and large-format promotional displays.',
    pricingMode: 'instant', unit: 'm²', turnaround: 'Confirmed at quotation', icon: 'PanelsTopLeft',
    image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=85',
    fields: [
      { name: 'material', label: 'Material', type: 'select', required: true, options: ['Standard frontlit banner', 'Premium frontlit banner', 'Backlit material', 'Mesh banner', 'Roll-up display material', 'Other / advise me'] },
      { name: 'width', label: 'Width (metres)', type: 'number', min: 0.1, step: 0.01, required: true },
      { name: 'height', label: 'Height (metres)', type: 'number', min: 0.1, step: 0.01, required: true },
      { name: 'quantity', label: 'Quantity', type: 'number', min: 1, step: 1, required: true },
      { name: 'sides', label: 'Print sides', type: 'select', options: ['Single-sided', 'Double-sided'] },
      { name: 'finishing', label: 'Finishing', type: 'select', options: ['No finishing', 'Hemming', 'Eyelets', 'Hemming + eyelets', 'Pole pockets', 'Advise me'] },
      { name: 'artwork', label: 'Artwork status', type: 'select', options: ['Print-ready artwork available', 'Need design assistance'] },
    ],
  },
  {
    slug: 'sticker-printing', name: 'Sticker & Label Printing', category: 'Print',
    tagline: 'Custom-cut stickers and product labels in practical finishes.',
    description: 'Vinyl decals, product labels, transparent stickers, die-cut stickers, sheets and roll labels.',
    pricingMode: 'instant', unit: '100 cm²', turnaround: 'Confirmed at quotation', icon: 'Sticker',
    image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1200&q=85',
    fields: [
      { name: 'sticker_type', label: 'Sticker type', type: 'select', required: true, options: ['Die-cut individual stickers', 'Kiss-cut sheets', 'Rectangle labels', 'Transparent stickers', 'Roll labels', 'Vinyl decals'] },
      { name: 'material', label: 'Material', type: 'select', options: ['White vinyl', 'Transparent vinyl', 'Paper label', 'Premium vinyl', 'Not sure'] },
      { name: 'width', label: 'Width (cm)', type: 'number', min: 1, step: 0.1, required: true },
      { name: 'height', label: 'Height (cm)', type: 'number', min: 1, step: 0.1, required: true },
      { name: 'quantity', label: 'Quantity (pieces)', type: 'number', min: 1, step: 1, required: true },
      { name: 'finish', label: 'Finish', type: 'select', options: ['Gloss', 'Matte', 'Gloss laminate', 'Matte laminate', 'No preference'] },
      { name: 'cutting', label: 'Cutting', type: 'select', options: ['Standard cut', 'Custom contour cut', 'Not sure'] },
    ],
  },
  {
    slug: 'mug-branding', name: 'Mug & Merchandise Branding', category: 'Branding',
    tagline: 'Make everyday items carry your brand.',
    description: 'Branded mugs, corporate gifts, promotional merchandise and personalized items.',
    pricingMode: 'instant', unit: 'piece', turnaround: 'Confirmed at quotation', icon: 'Coffee',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1200&q=85',
    fields: [
      { name: 'product', label: 'Product', type: 'select', required: true, options: ['White ceramic mug', 'Colour-interior mug', 'Magic / heat-changing mug', 'Travel mug', 'Other merchandise'] },
      { name: 'quantity', label: 'Quantity', type: 'number', min: 1, step: 1, required: true },
      { name: 'print_area', label: 'Branding area', type: 'select', options: ['One side', 'Two sides', 'Full wrap (where supported)', 'Advise me'] },
      { name: 'packaging', label: 'Packaging', type: 'select', options: ['Standard packaging', 'Gift box', 'Individual protective packaging'] },
      { name: 'artwork', label: 'Artwork status', type: 'select', options: ['Print-ready artwork available', 'Need design assistance'] },
    ],
  },
  {
    slug: 'laser-cutting', name: 'Laser Cutting & Engraving', category: 'Fabrication',
    tagline: 'Precision-cut and engraved custom components.',
    description: 'Acrylic signage, wood products, lettering, engraved gifts, decorative pieces and custom fabrication.',
    pricingMode: 'quote', turnaround: 'Subject to file and material review', icon: 'ScanLine',
    image: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1200&q=85',
    fields: [
      { name: 'process', label: 'Required process', type: 'select', required: true, options: ['Laser cutting', 'Laser engraving', 'Cutting + engraving'] },
      { name: 'material', label: 'Material', type: 'select', required: true, options: ['Acrylic', 'Plywood', 'MDF', 'Wood', 'Other – confirm suitability'] },
      { name: 'thickness', label: 'Material thickness (mm)', type: 'number', min: 0.5, step: 0.5, required: true },
      { name: 'dimensions', label: 'Overall dimensions', type: 'text', required: true, help: 'Enter length × width and units.' },
      { name: 'quantity', label: 'Quantity', type: 'number', min: 1, step: 1, required: true },
      { name: 'notes', label: 'Technical notes', type: 'textarea', help: 'Mention tolerances, finish, assembly or intended use.' },
    ],
  },
];

export const money = (value: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
