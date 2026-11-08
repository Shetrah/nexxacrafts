// Dev-only design-system kitchen sink (route /__ui; never registered in production builds).
// Every component of src/components/ui in its states: default, focused, disabled, error, loading,
// empty and long content. Sample data below is illustrative only.
import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  Info,
  Layers,
  Mail,
  MoreHorizontal,
  Package,
  Palette,
  Pencil,
  Plus,
  Printer,
  Scissors,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  Wallet,
} from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  Container,
  CropFrame,
  DataTable,
  Disclosure,
  Drawer,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Eyebrow,
  Field,
  FileDropzone,
  FileItem,
  FilterBar,
  IconButton,
  Input,
  Kbd,
  LoadingState,
  Modal,
  NavTabs,
  NumberField,
  OptionGroup,
  PageHeader,
  Pagination,
  ProgressSteps,
  SearchInput,
  Section,
  SectionHeader,
  SegmentedControl,
  Select,
  Skeleton,
  SkipLink,
  SpecList,
  Spinner,
  StatCard,
  StatusBadge,
  Stepper,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  Timeline,
  ToastProvider,
  Tooltip,
  VisuallyHidden,
  buttonClasses,
  cn,
  useToast,
  type BadgeTone,
  type ButtonVariant,
  type Column,
  type SortState,
} from '@/components/ui';

/* ----------------------------------------------------------------------------------------------
 * Sample data
 * ------------------------------------------------------------------------------------------- */

const money = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });

type OrderStatus = 'submitted' | 'awaiting_payment' | 'in_production' | 'ready' | 'completed' | 'cancelled';

const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone; description: string }> = {
  submitted: { label: 'Submitted', tone: 'info', description: 'Waiting for review by the sales team' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'warning', description: 'Quotation approved, payment pending' },
  in_production: { label: 'In production', tone: 'brand', description: 'Being produced on the shop floor' },
  ready: { label: 'Ready for collection', tone: 'violet', description: 'Packed and ready' },
  completed: { label: 'Completed', tone: 'success', description: 'Delivered or collected' },
  cancelled: { label: 'Cancelled', tone: 'danger', description: 'Cancelled by the customer or staff' },
};

interface SampleOrder {
  id: string;
  reference: string;
  customer: string;
  service: string;
  status: OrderStatus;
  total: number;
  date: string;
}

const ORDERS: SampleOrder[] = [
  { id: '1', reference: 'NCO-261107-AB12C', customer: 'Achieng Otieno', service: 'Banner & Large-format Printing', status: 'in_production', total: 18400, date: '2026-11-07' },
  { id: '2', reference: 'NCO-261106-QW7RT', customer: 'Brian Kiprop', service: 'Sticker Printing', status: 'awaiting_payment', total: 6250, date: '2026-11-06' },
  { id: '3', reference: 'NCO-261105-ZX9PL', customer: 'Lakeview Hospitality Group — Procurement & Facilities Department', service: 'Mug Branding', status: 'completed', total: 42000, date: '2026-11-05' },
  { id: '4', reference: 'NCO-261104-MN3KD', customer: 'Wanjiru Kamau', service: 'Laser Cutting & Engraving', status: 'submitted', total: 9800, date: '2026-11-04' },
  { id: '5', reference: 'NCO-261103-HG5FS', customer: 'Otieno & Sons Hardware', service: 'Graphic Design & Branding', status: 'ready', total: 15000, date: '2026-11-03' },
  { id: '6', reference: 'NCO-261102-TY8UI', customer: 'Faith Mutua', service: 'Banner & Large-format Printing', status: 'cancelled', total: 3200, date: '2026-11-02' },
];

const ORDER_STEPS = ['Submitted', 'In review', 'In production', 'Ready', 'Delivered'];

const MATERIALS = [
  { value: 'standard', label: 'Standard frontlit' },
  { value: 'premium', label: 'Premium frontlit' },
  { value: 'backlit', label: 'Backlit' },
  { value: 'mesh', label: 'Mesh' },
  { value: 'vinyl', label: 'Self-adhesive vinyl', disabled: true },
];

type Finish = 'none' | 'eyelets' | 'hemmed' | 'pole';

const FINISHES: Array<{ value: Finish; label: string; description: string; icon: ReactNode; disabled?: boolean }> = [
  { value: 'none', label: 'No finishing', description: 'Trimmed to size, ready to mount.', icon: <Scissors /> },
  { value: 'eyelets', label: 'Eyelets', description: 'Brass eyelets every 50 cm for tying.', icon: <Layers /> },
  { value: 'hemmed', label: 'Hemmed edges', description: 'Welded hems for outdoor durability.', icon: <Box /> },
  { value: 'pole', label: 'Pole pockets', description: 'Top and bottom pockets for poles.', icon: <Package />, disabled: true },
];

/* ----------------------------------------------------------------------------------------------
 * Page scaffolding
 * ------------------------------------------------------------------------------------------- */

const SECTIONS = [
  ['tokens', 'Tokens'],
  ['actions', 'Actions'],
  ['forms', 'Forms'],
  ['display', 'Display'],
  ['navigation', 'Navigation'],
  ['overlays', 'Overlays'],
  ['feedback', 'Feedback'],
  ['data', 'Data'],
  ['layout', 'Layout'],
] as const;

function KitSection({
  id,
  index,
  title,
  description,
  children,
}: {
  id: string;
  index: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line py-12 sm:py-16">
      <Container size="wide">
        <SectionHeader
          id={`${id}-title`}
          index={index}
          eyebrow={title}
          title={title}
          description={description}
        />
        <div className="mt-8 space-y-10 sm:mt-10">{children}</div>
      </Container>
    </section>
  );
}

function Demo({
  title,
  note,
  tone = 'default',
  className,
  children,
}: {
  title: string;
  note?: string;
  tone?: 'default' | 'canvas' | 'ink';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{title}</h3>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </div>
      <div
        className={cn(
          'min-w-0 rounded-xl border p-4 sm:p-6',
          tone === 'ink' && 'surface-inverse border-ink-700 bg-ink-900 text-slate-300',
          tone === 'canvas' && 'border-line bg-canvas',
          tone === 'default' && 'border-line bg-white',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>;
}

function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-6 lg:grid-cols-2', className)}>{children}</div>;
}

/* ----------------------------------------------------------------------------------------------
 * 01 Tokens
 * ------------------------------------------------------------------------------------------- */

const SWATCHES: Array<{ name: string; swatches: Array<[string, string, string]> }> = [
  {
    name: 'brand — Electric Blue',
    swatches: [
      ['50', 'bg-brand-50', '#EEF3FF'],
      ['100', 'bg-brand-100', '#DCE6FF'],
      ['200', 'bg-brand-200', '#BFD0FF'],
      ['300', 'bg-brand-300', '#93AEFF'],
      ['400', 'bg-brand-400', '#5F83FF'],
      ['500', 'bg-brand-500', '#2F5BFE'],
      ['600', 'bg-brand-600', '#0341FC'],
      ['700', 'bg-brand-700', '#0234D0'],
      ['800', 'bg-brand-800', '#062BA6'],
      ['900', 'bg-brand-900', '#0B2783'],
      ['950', 'bg-brand-950', '#0A1A50'],
    ],
  },
  {
    name: 'accent — Signal Red (markers only)',
    swatches: [
      ['50', 'bg-accent-50', '#FEF2F2'],
      ['200', 'bg-accent-200', '#FECACA'],
      ['400', 'bg-accent-400', '#F87171'],
      ['600', 'bg-accent-600', '#DC2626'],
      ['800', 'bg-accent-800', '#991B1B'],
    ],
  },
  {
    name: 'ink · paper · canvas · line',
    swatches: [
      ['ink-600', 'bg-ink-600', '#2A3552'],
      ['ink-700', 'bg-ink-700', '#1D2740'],
      ['ink-800', 'bg-ink-800', '#131B2E'],
      ['ink-900', 'bg-ink-900', '#0B1220'],
      ['ink-950', 'bg-ink-950', '#070B16'],
      ['paper', 'bg-paper', '#F7F7F4'],
      ['paper-2', 'bg-paper-2', '#EFEEE9'],
      ['canvas', 'bg-canvas', '#F4F6F9'],
      ['line', 'bg-line', '#E3E7EE'],
      ['line-strong', 'bg-line-strong', '#CBD3DF'],
    ],
  },
  {
    name: 'semantic (50 · 600 · 700)',
    swatches: [
      ['success-50', 'bg-success-50', '#ECFDF5'],
      ['success-600', 'bg-success-600', '#059669'],
      ['warning-50', 'bg-warning-50', '#FFFBEB'],
      ['warning-600', 'bg-warning-600', '#D97706'],
      ['danger-50', 'bg-danger-50', '#FEF2F2'],
      ['danger-600', 'bg-danger-600', '#DC2626'],
      ['info-50', 'bg-info-50', '#F0F9FF'],
      ['info-600', 'bg-info-600', '#0284C7'],
    ],
  },
];

function TokensSection() {
  return (
    <KitSection
      id="tokens"
      index="01"
      title="Tokens"
      description="Ink, paper and hairlines; electric blue does the work. Signal red only marks."
    >
      <Demo title="Colour">
        <div className="space-y-6">
          {SWATCHES.map((group) => (
            <div key={group.name}>
              <p className="mb-2 font-mono text-xs text-slate-500">{group.name}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-11">
                {group.swatches.map(([label, className, hex]) => (
                  <div key={label} className="min-w-0">
                    <div className={cn('h-12 rounded-lg ring-1 ring-inset ring-black/5', className)} />
                    <p className="mt-1.5 truncate font-mono text-[11px] text-slate-700">{label}</p>
                    <p className="font-mono text-[11px] text-slate-500">{hex}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Demo>

      <Demo title="Typography" note="Manrope display · Inter UI · JetBrains Mono specs">
        <div className="space-y-6">
          <div>
            <p className="mb-1 font-mono text-[11px] text-slate-500">.text-display · clamp(40→60px)/1.05</p>
            <p className="text-display">From brief to finished product.</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[11px] text-slate-500">.text-h1 · clamp(32→44px)/1.1</p>
            <p className="text-h1">Print, design and software in one place</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[11px] text-slate-500">.text-h2 · clamp(26→36px)/1.15</p>
            <p className="text-h2">A straightforward journey to delivery</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[11px] text-slate-500">.text-h3 · 20px/1.3</p>
            <p className="text-h3">Banner &amp; large-format printing</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[11px] text-slate-500">.text-lead · 18px/1.7 · slate-600</p>
            <p className="text-lead">
              Configure standard jobs online or send us a custom brief. Keep your files, quotes, approvals and order
              updates together.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 font-mono text-[11px] text-slate-500">body · 16px/1.65</p>
              <p>We print banners, stickers and branded mugs, cut and engrave on our lasers, and build websites.</p>
            </div>
            <div>
              <p className="mb-1 font-mono text-[11px] text-slate-500">small · 14px · slate-600</p>
              <p className="text-sm text-slate-600">Final charges are confirmed after file review and quotation approval.</p>
            </div>
            <div>
              <p className="mb-1 font-mono text-[11px] text-slate-500">mono · specs &amp; references</p>
              <p className="font-mono text-sm text-slate-900">NCO-261107-AB12C · 2.40 × 1.20 m</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Eyebrow index="01">Services</Eyebrow>
            <p className="eyebrow">.eyebrow class</p>
            <p className="text-sm">
              Inline <a className="link" href="#tokens">text link</a> inside copy.
            </p>
          </div>
        </div>
      </Demo>

      <Grid>
        <Demo title="Elevation" note="Borders first; shadows are ink-tinted">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {['shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl'].map((shadow) => (
              <div key={shadow} className={cn('grid h-20 place-items-center rounded-xl border border-line bg-white', shadow)}>
                <span className="font-mono text-[11px] text-slate-600">{shadow.replace('shadow-', '')}</span>
              </div>
            ))}
          </div>
        </Demo>
        <Demo title="Radius" note="6 badges · 8 controls · 12 cards · 16 modals">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['rounded-md', '6px'],
              ['rounded-lg', '8px'],
              ['rounded-xl', '12px'],
              ['rounded-2xl', '16px'],
            ].map(([radius, size]) => (
              <div key={radius} className={cn('grid h-20 place-items-center border border-line-strong bg-paper', radius)}>
                <span className="font-mono text-[11px] text-slate-600">{size}</span>
              </div>
            ))}
          </div>
        </Demo>
      </Grid>
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 02 Actions
 * ------------------------------------------------------------------------------------------- */

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'subtle', 'danger', 'link'];

function ActionsSection() {
  const [saving, setSaving] = useState(false);

  const simulateSave = () => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 1500);
  };

  return (
    <KitSection id="actions" index="02" title="Actions" description="One primary action per view. 40px default height, 8px radius, 1px press.">
      <Demo title="Button variants × sizes">
        <div className="space-y-4">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Row key={size}>
              <span className="w-8 font-mono text-[11px] text-slate-500">{size}</span>
              {VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} size={size}>
                  {variant === 'link' ? 'Link' : variant.charAt(0).toUpperCase() + variant.slice(1)}
                </Button>
              ))}
            </Row>
          ))}
        </div>
      </Demo>

      <Grid>
        <Demo title="States & icons">
          <div className="space-y-4">
            <Row>
              <Button leftIcon={<Plus />}>New order</Button>
              <Button variant="secondary" rightIcon={<ArrowRight />}>
                Continue
              </Button>
              <Button variant="ghost" leftIcon={<Download />}>
                Export
              </Button>
            </Row>
            <Row>
              <Button loading>Saving</Button>
              <Button variant="secondary" loading>
                Loading
              </Button>
              <Button loading={saving} onClick={simulateSave} leftIcon={<Check />}>
                {saving ? 'Saving…' : 'Click to load'}
              </Button>
            </Row>
            <Row>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
              <Button variant="danger" disabled leftIcon={<Trash2 />}>
                Delete
              </Button>
            </Row>
            <div className="max-w-[16rem] space-y-2">
              <Button fullWidth>Full width</Button>
              <Button variant="secondary" fullWidth rightIcon={<ArrowUpRight />}>
                A very long label that has to truncate gracefully
              </Button>
            </div>
          </div>
        </Demo>

        <Demo title="On dark surfaces" tone="ink">
          <div className="space-y-4">
            <Row>
              <Button variant="inverse" rightIcon={<ArrowUpRight />}>
                Request a quote
              </Button>
              <Button variant="inverse-outline">Talk to the team</Button>
              <Button variant="inverse" disabled>
                Disabled
              </Button>
            </Row>
            <Row>
              <IconButton variant="inverse" label="Notifications" icon={<Bell />} badge />
              <IconButton variant="inverse" label="Cart" icon={<ShoppingBag />} badge={3} />
              <IconButton variant="inverse" label="Settings" icon={<Settings />} />
            </Row>
          </div>
        </Demo>
      </Grid>

      <Grid>
        <Demo title="ButtonLink & buttonClasses()">
          <Row>
            <ButtonLink to="/services" rightIcon={<ArrowRight />}>
              Router link
            </ButtonLink>
            <ButtonLink href="https://nexxacrafts.example" target="_blank" variant="secondary" rightIcon={<ExternalLink />}>
              External link
            </ButtonLink>
            <a href="#actions" className={buttonClasses({ variant: 'subtle', size: 'sm' })}>
              Anchor styled via buttonClasses
            </a>
          </Row>
        </Demo>

        <Demo title="IconButton · Kbd">
          <div className="space-y-4">
            <Row>
              <IconButton label="Edit" icon={<Pencil />} size="sm" />
              <IconButton label="Copy reference" icon={<Copy />} />
              <IconButton label="Search" icon={<Search />} size="lg" />
              <IconButton label="Settings" icon={<Settings />} variant="secondary" />
              <IconButton label="Cart, 3 items" icon={<ShoppingBag />} variant="secondary" badge={3} />
              <IconButton label="Inbox" icon={<Inbox />} variant="secondary" badge={128} badgeLabel="128 unread messages" />
              <IconButton label="Notifications" icon={<Bell />} badge />
              <IconButton label="Disabled" icon={<Trash2 />} disabled />
            </Row>
            <Row className="text-sm text-slate-600">
              Press <Kbd>/</Kbd> to search, <Kbd>Esc</Kbd> to close, <Kbd>⌘ K</Kbd> for commands.
            </Row>
          </div>
        </Demo>
      </Grid>
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 03 Forms
 * ------------------------------------------------------------------------------------------- */

function FormsSection() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('nexxacrafts Studio');
  const [invalidEmail, setInvalidEmail] = useState('achieng@');
  const [brief, setBrief] = useState('');
  const [material, setMaterial] = useState<string>('');
  const [chipMaterial, setChipMaterial] = useState<string>('premium');
  const [smallChip, setSmallChip] = useState<string>('matte');
  const [finish, setFinish] = useState<Finish | ''>('eyelets');
  const [width, setWidth] = useState<number | ''>(2.4);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [emptyNumber, setEmptyNumber] = useState<number | ''>('');
  const [laminate, setLaminate] = useState(true);
  const [terms, setTerms] = useState(false);
  const [notify, setNotify] = useState(true);
  const [rateActive, setRateActive] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [query, setQuery] = useState('banner');
  const [emptyQuery, setEmptyQuery] = useState('');

  return (
    <KitSection id="forms" index="03" title="Forms" description="Labels above inputs, hints below, inline errors with an icon. 16px text on phones prevents zoom.">
      <Grid>
        <Demo title="Input">
          <div className="space-y-5">
            <Field label="Work email" hint="Order updates are sent here." required>
              <Input type="email" placeholder="you@company.co.ke" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="Focused (autoFocus)" optional>
              <Input autoFocus placeholder="Focus ring: brand border + 4px tint" />
            </Field>
            <Field label="With icon">
              <Input leftIcon={<Mail />} placeholder="name@example.com" />
            </Field>
            <Field label="With unit addon" hint="Width in square metres.">
              <Input inputMode="decimal" defaultValue="2.88" rightAddon="m²" />
            </Field>
            <Field label="Email address" error="Enter a complete email address, like name@example.com." required>
              <Input type="email" value={invalidEmail} onChange={(event) => setInvalidEmail(event.target.value)} />
            </Field>
            <Field label="Company (disabled)">
              <Input value={company} onChange={(event) => setCompany(event.target.value)} disabled />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input size="sm" placeholder="Small 32px" aria-label="Small input" />
              <Input placeholder="Medium 40px" aria-label="Medium input" />
              <Input size="lg" placeholder="Large 48px" aria-label="Large input" />
            </div>
          </div>
        </Demo>

        <Demo title="Textarea · Select">
          <div className="space-y-5">
            <Field label="Project overview" hint="Describe the problem, users, key features and expected outcome." required>
              <Textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="We need a booking website for…" />
            </Field>
            <Field label="Creative brief" error="Tell us a little more (at least 20 characters).">
              <Textarea defaultValue="Logo" rows={3} />
            </Field>
            <Field label="Material" required hint="Placeholder option cannot be re-selected when required.">
              <Select
                placeholder="Choose a material"
                options={MATERIALS.map(({ value, label, disabled }) => ({ value, label, disabled }))}
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
              />
            </Field>
            <Field label="Turnaround" error="Choose a turnaround.">
              <Select placeholder="Select…" defaultValue="">
                <option value="standard">Standard</option>
                <option value="express">Express</option>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select size="sm" aria-label="Small select" options={[{ value: 'a', label: 'Small' }]} />
              <Select aria-label="Medium select" options={[{ value: 'a', label: 'Medium' }]} />
              <Select aria-label="Disabled select" disabled options={[{ value: 'a', label: 'Disabled' }]} />
            </div>
          </div>
        </Demo>
      </Grid>

      <Grid>
        <Demo title="OptionGroup · chips" note="Arrow keys move and select">
          <div className="space-y-6">
            <Field label="Banner material" required hint="Self-adhesive vinyl is out of stock.">
              <OptionGroup name="material" value={chipMaterial} onChange={setChipMaterial} options={MATERIALS} />
            </Field>
            <Field label="Lamination" error="Choose a lamination option.">
              <OptionGroup
                name="lamination-invalid"
                value=""
                onChange={() => undefined}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'matte', label: 'Matte' },
                  { value: 'gloss', label: 'Gloss' },
                ]}
              />
            </Field>
            <Field label="Small · 3 columns">
              <OptionGroup
                name="finish-small"
                size="sm"
                columns={3}
                value={smallChip}
                onChange={setSmallChip}
                options={[
                  { value: 'matte', label: 'Matte', description: 'Low glare' },
                  { value: 'gloss', label: 'Gloss', description: 'Vivid' },
                  { value: 'satin', label: 'Satin', description: 'Balanced' },
                ]}
              />
            </Field>
          </div>
        </Demo>

        <Demo title="OptionGroup · cards">
          <Field label="Finishing" hint="Pole pockets are unavailable for mesh.">
            <OptionGroup name="finishing" layout="cards" columns={2} value={finish} onChange={setFinish} options={FINISHES} />
          </Field>
        </Demo>
      </Grid>

      <Grid>
        <Demo title="NumberField">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Width" hint="0.1 m steps, minimum 0.1 m.">
                <NumberField value={width} onChange={setWidth} min={0.1} max={50} step={0.1} unit="m" />
              </Field>
              <Field label="Quantity" required>
                <NumberField value={quantity} onChange={setQuantity} min={1} max={500} unit="pcs" />
              </Field>
              <Field label="Empty allowed" error="Enter a height.">
                <NumberField value={emptyNumber} onChange={setEmptyNumber} min={0} placeholder="0.00" unit="m" />
              </Field>
              <Field label="Disabled">
                <NumberField value={3} onChange={() => undefined} disabled />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField size="sm" value={1} onChange={() => undefined} aria-label="Small" />
              <NumberField value={10} onChange={() => undefined} aria-label="Medium" />
              <NumberField size="lg" value={100} onChange={() => undefined} aria-label="Large" />
            </div>
          </div>
        </Demo>

        <Demo title="Checkbox · Switch">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <Checkbox label="Lamination" description="Matte film, adds one working day." checked={laminate} onChange={(event) => setLaminate(event.target.checked)} />
              <Checkbox label="I accept the terms of service" checked={terms} onChange={(event) => setTerms(event.target.checked)} invalid={!terms} />
              <Checkbox label="Select all rows" indeterminate readOnly checked={false} />
              <Checkbox label="Disabled option" disabled />
              <Checkbox label="Disabled checked" disabled checked readOnly />
            </div>
            <div className="space-y-4">
              <Switch label="Email notifications" description="Status changes and proofs." checked={notify} onChange={setNotify} />
              <Switch label="Rate active" checked={rateActive} onChange={setRateActive} />
              <Switch label="Small switch" size="sm" checked onChange={() => undefined} />
              <Switch label="Disabled" checked={false} onChange={() => undefined} disabled />
            </div>
          </div>
        </Demo>
      </Grid>

      <Grid>
        <Demo title="FileDropzone">
          <div className="space-y-5">
            <Field label="Artwork files" hint="PDF, AI, EPS, PNG or JPG. Up to 50 MB each.">
              <FileDropzone multiple accept=".pdf,.ai,.eps,.png,.jpg" onFiles={(list) => setFiles((current) => [...current, ...list.map((file) => file.name)])} />
            </Field>
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((name, index) => (
                  <FileItem key={`${name}-${index}`} name={name} status="local" onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))} />
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FileDropzone onFiles={() => undefined} busy hint="Uploading 2 files" />
              <Field label="Proof (required)" error="Upload your print-ready artwork.">
                <FileDropzone onFiles={() => undefined} compact hint="PDF only" />
              </Field>
            </div>
            <FileDropzone onFiles={() => undefined} disabled compact title="Uploads are closed for this order" />
          </div>
        </Demo>

        <Demo title="FileItem · SearchInput">
          <div className="space-y-2">
            <FileItem name="banner-final-print-ready.pdf" meta="2.4 MB" status="uploaded" href="#forms" onRemove={() => undefined} />
            <FileItem name="logo-vector.ai" meta="860 KB" status="uploading" progress={45} />
            <FileItem name="photo-shoot-0042.jpg" meta="11.2 MB" status="error" error="File is larger than 10 MB" onRemove={() => undefined} />
            <FileItem name="cutting-path.dxf" meta="120 KB" status="pending" onOpen={() => undefined} />
            <FileItem name="brief.docx" status="local" onRemove={() => undefined} />
            <FileItem
              name="lakeview-hospitality-group-procurement-department-rollup-banner-2026-v3-final-FINAL.tiff"
              meta="48.0 MB"
              status="uploaded"
              onRemove={() => undefined}
            />
          </div>
          <div className="mt-6 space-y-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Search orders" shortcut="/" />
            <SearchInput value={emptyQuery} onChange={setEmptyQuery} placeholder="Search customers" size="sm" shortcut="k" />
          </div>
        </Demo>
      </Grid>
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 04 Display
 * ------------------------------------------------------------------------------------------- */

const BADGE_TONES: BadgeTone[] = ['neutral', 'brand', 'info', 'success', 'warning', 'danger', 'violet'];

function DisplaySection() {
  return (
    <KitSection id="display" index="04" title="Display" description="Cards, badges, specs and progress — typeset like a production docket.">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader title="Default card" description="White, hairline border, xs shadow." icon={<Printer />} />
          <p className="text-sm">Cards hold one idea. Use the header for the title and actions.</p>
        </Card>
        <Card tone="muted">
          <CardHeader title="Muted" description="For secondary panels." />
          <p className="text-sm">Slate-50 surface without shadow.</p>
        </Card>
        <Card tone="brand">
          <CardHeader title="Brand tint" description="Highlight, sparingly." icon={<Sparkles />} />
          <p className="text-sm">Recommended configuration for most banners.</p>
        </Card>
        <Card tone="ink">
          <CardHeader title="Ink" description="Dark surface; headings turn white." icon={<Code2 />} />
          <p className="text-sm">Use on marketing pages for contrast blocks.</p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card padding="none">
          <CardHeader
            title="Sectioned card (padding none)"
            description="Header, body and footer draw their own dividers."
            actions={<IconButton size="sm" label="More options" icon={<MoreHorizontal />} />}
          />
          <CardBody>
            <SpecList
              dense
              items={[
                { label: 'Reference', value: 'NCO-261107-AB12C', mono: true },
                { label: 'Placed', value: '7 Nov 2026' },
              ]}
            />
          </CardBody>
          <CardFooter>
            <Button size="sm">View order</Button>
            <Button size="sm" variant="ghost">
              Download invoice
            </Button>
          </CardFooter>
        </Card>
        <Card as="a" href="#display" interactive>
          <CardHeader title="Interactive card (as a link)" description="Hover lifts 1px; focus ring follows the radius." icon={<ArrowUpRight />} />
          <p className="text-sm">The whole card is one link target.</p>
        </Card>
        <Card padding="lg">
          <CardHeader
            title="A long card title that needs to wrap onto two lines without pushing the actions away"
            actions={<Badge tone="success">Paid</Badge>}
          />
          <p className="text-sm">Padding lg: 24px on phones, 32px from sm.</p>
        </Card>
      </div>

      <Grid>
        <Demo title="Badge · StatusBadge">
          <div className="space-y-4">
            <Row>
              {BADGE_TONES.map((tone) => (
                <Badge key={tone} tone={tone}>
                  {tone}
                </Badge>
              ))}
            </Row>
            <Row>
              {BADGE_TONES.map((tone) => (
                <Badge key={tone} tone={tone} size="sm" dot>
                  {tone}
                </Badge>
              ))}
            </Row>
            <Row>
              {(Object.keys(STATUS) as OrderStatus[]).map((status) => (
                <StatusBadge key={status} {...STATUS[status]} />
              ))}
            </Row>
            <Row>
              <Badge tone="brand" icon={<Sparkles />}>
                Instant estimate
              </Badge>
              <Badge tone="neutral" icon={<FileText />}>
                3 files
              </Badge>
              <div className="w-40">
                <Badge tone="warning" dot>
                  A very long status label that truncates
                </Badge>
              </div>
            </Row>
          </div>
        </Demo>

        <Demo title="Avatar">
          <Row>
            <Avatar name="Achieng Otieno" size="xs" />
            <Avatar name="Brian Kiprop" size="sm" />
            <Avatar name="Wanjiru Kamau" />
            <Avatar name="Otieno & Sons Hardware" size="lg" />
            <Avatar name="Faith" />
            <Avatar name="Lakeview Hospitality" />
            <Avatar name="Moses Ouma" />
            <Avatar name={null} />
            <Avatar name="nexxacrafts" src="/Nexa%20Logo.png" size="lg" />
          </Row>
        </Demo>
      </Grid>

      <Grid>
        <Demo title="SpecList · leaders + mono">
          <SpecList
            leaders
            items={[
              { label: 'Reference', value: 'NCO-261107-AB12C', mono: true },
              { label: 'Service', value: 'Banner & Large-format Printing' },
              { label: 'Size', value: '2.40 × 1.20 m', mono: true },
              { label: 'Material', value: 'Premium frontlit' },
              { label: 'Quantity', value: '4 pcs', mono: true },
              { label: 'Finishing', value: 'Eyelets every 50 cm, hemmed edges on all four sides' },
              { label: 'Estimate', value: money.format(18400) },
            ]}
          />
        </Demo>
        <Demo title="SpecList · two columns · dense">
          <div className="space-y-6">
            <SpecList
              columns={2}
              items={[
                { label: 'Customer', value: 'Achieng Otieno' },
                { label: 'Phone', value: '+254 795 333 004', mono: true },
                { label: 'Delivery', value: 'Courier' },
                { label: 'Payment', value: 'M-Pesa' },
                { label: 'Placed', value: '7 Nov 2026, 14:20' },
              ]}
            />
            <SpecList
              dense
              items={[
                { label: 'Subtotal', value: money.format(17000) },
                { label: 'Setup fee', value: money.format(1400) },
                { label: 'Total (estimate)', value: <strong>{money.format(18400)}</strong> },
              ]}
            />
          </div>
        </Demo>
      </Grid>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open orders" value="12" hint="3 due this week" icon={<ShoppingBag />} to="/__ui" />
        <StatCard label="Quotes awaiting review" value="4" hint="Oldest: 2 days" icon={<FileText />} tone="attention" />
        <StatCard
          label="Revenue (November)"
          value={money.format(248300)}
          icon={<Wallet />}
          trend={{ label: '+12% vs October', direction: 'up', sentiment: 'positive' }}
        />
        <StatCard label="Overdue invoices" value="—" loading icon={<Truck />} />
      </div>

      <Grid>
        <Demo title="Timeline">
          <div className="grid gap-8 sm:grid-cols-2">
            <Timeline
              items={[
                { id: 'placed', title: 'Order placed', time: '7 Nov, 09:12', state: 'complete' },
                { id: 'paid', title: 'Payment received', description: 'M-Pesa · QK7XH2L9', time: '7 Nov, 09:40', state: 'complete' },
                { id: 'proof', title: 'Artwork approved', time: '7 Nov, 13:05', state: 'complete' },
                { id: 'production', title: 'In production', description: 'Large-format printer 2', time: 'Now', state: 'current' },
                { id: 'ready', title: 'Ready for collection', state: 'upcoming' },
                { id: 'delivered', title: 'Delivered', state: 'upcoming' },
              ]}
            />
            <Timeline
              items={[
                { id: 'a', title: 'Quote requested', time: '2 Nov', state: 'complete' },
                { id: 'b', title: 'Quote sent', time: '3 Nov', state: 'complete' },
                { id: 'c', title: 'Cancelled by customer', description: 'Budget moved to next quarter.', time: '5 Nov', state: 'cancelled' },
              ]}
            />
          </div>
        </Demo>

        <Demo title="ProgressSteps">
          <div className="space-y-8">
            <ProgressSteps steps={ORDER_STEPS} current={2} ariaLabel="Order progress" />
            <ProgressSteps steps={ORDER_STEPS} current={1} state="cancelled" />
            <ProgressSteps steps={ORDER_STEPS} current={0} state="complete" />
            <div className="max-w-[14rem]">
              <ProgressSteps steps={ORDER_STEPS} current={3} size="sm" />
            </div>
          </div>
        </Demo>
      </Grid>

      <Grid>
        <Demo title="Disclosure · plain">
          <Disclosure title="What file formats can I upload?" defaultOpen>
            PDF, AI, EPS, SVG, PNG and JPG. For print, export at the final size with 3 mm bleed.
          </Disclosure>
          <Disclosure title="How is the price confirmed?">
            Standard jobs show an estimate. The team confirms the final price after reviewing your files.
          </Disclosure>
          <Disclosure title="Can I collect my order?" headingAs="h4">
            Yes — choose collection at checkout and we will message you when it is ready.
          </Disclosure>
        </Demo>
        <Demo title="Disclosure · card · Skeleton · Spinner" tone="canvas">
          <div className="space-y-4">
            <Disclosure tone="card" title="Advanced options" description="Bleed, colour profile and proofing.">
              Default: 3 mm bleed, CMYK (FOGRA39), digital proof by email.
            </Disclosure>
            <Card>
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </Card>
            <Row>
              <Spinner size="xs" />
              <Spinner size="sm" />
              <Spinner />
              <Spinner size="lg" className="text-brand-600" />
              <Spinner size="lg" label="Loading orders" className="text-slate-400" />
            </Row>
          </div>
        </Demo>
      </Grid>
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 05 Navigation
 * ------------------------------------------------------------------------------------------- */

const STEPPER_STEPS = [
  { id: 'service', label: 'Service', description: 'What you need' },
  { id: 'details', label: 'Specifications', description: 'Size, material, finish' },
  { id: 'files', label: 'Artwork', description: 'Upload files' },
  { id: 'review', label: 'Review', description: 'Check and submit' },
];

function NavigationSection() {
  const [tab, setTab] = useState('details');
  const [pill, setPill] = useState('all');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [page, setPage] = useState(6);
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(2);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  return (
    <KitSection id="navigation" index="05" title="Navigation" description="Tabs, steppers and list controls. Everything scrolls or collapses at 360px.">
      <Demo title="Tabs · underline">
        <Tabs
          ariaLabel="Order sections"
          idPrefix="kit-order"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'details', label: 'Details', icon: <FileText /> },
            { id: 'files', label: 'Files', count: 3, icon: <Upload /> },
            { id: 'payments', label: 'Payments', count: 1, icon: <Wallet /> },
            { id: 'production', label: 'Production', icon: <Printer /> },
            { id: 'dispatch', label: 'Dispatch & delivery', icon: <Truck /> },
          ]}
        />
        <TabPanel id="details" activeId={tab} idPrefix="kit-order" className="pt-4 text-sm">
          Details panel — arrow keys switch tabs; Tab moves into the panel.
        </TabPanel>
        <TabPanel id="files" activeId={tab} idPrefix="kit-order" className="pt-4 text-sm">
          Files panel.
        </TabPanel>
        <TabPanel id="payments" activeId={tab} idPrefix="kit-order" className="pt-4 text-sm">
          Payments panel.
        </TabPanel>
        <TabPanel id="production" activeId={tab} idPrefix="kit-order" className="pt-4 text-sm">
          Production panel.
        </TabPanel>
        <TabPanel id="dispatch" activeId={tab} idPrefix="kit-order" className="pt-4 text-sm">
          Dispatch panel.
        </TabPanel>
      </Demo>

      <Grid>
        <Demo title="Tabs · pills · SegmentedControl">
          <div className="space-y-5">
            <Tabs
              ariaLabel="Order filter"
              idPrefix="kit-pills"
              variant="pills"
              value={pill}
              onChange={setPill}
              items={[
                { id: 'all', label: 'All', count: 134 },
                { id: 'open', label: 'Open', count: 12 },
                { id: 'attention', label: 'Needs attention', count: 4 },
                { id: 'done', label: 'Completed' },
              ]}
            />
            <Row>
              <SegmentedControl
                ariaLabel="Period"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: '7d', label: '7 days' },
                  { value: '30d', label: '30 days' },
                  { value: '90d', label: '90 days' },
                ]}
              />
              <SegmentedControl
                ariaLabel="View"
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: 'list', label: 'List', icon: <Layers /> },
                  { value: 'board', label: 'Board', icon: <Box /> },
                ]}
              />
            </Row>
            <SegmentedControl
              ariaLabel="Payment method"
              fullWidth
              value="mpesa"
              onChange={() => undefined}
              options={[
                { value: 'mpesa', label: 'M-Pesa' },
                { value: 'bank', label: 'Bank' },
                { value: 'card', label: 'Card', disabled: true },
              ]}
            />
          </div>
        </Demo>

        <Demo title="NavTabs · Breadcrumbs">
          <div className="space-y-6">
            <NavTabs
              ariaLabel="Account"
              items={[
                { to: '/__ui', label: 'Overview', end: true },
                { to: '/services', label: 'Services' },
                { to: '/cart', label: 'Cart', count: 2 },
              ]}
            />
            <Breadcrumbs items={[{ label: 'Orders', to: '/__ui' }, { label: 'NCO-261107-AB12C' }]} />
            <Breadcrumbs
              items={[
                { label: 'Staff portal', to: '/__ui' },
                { label: 'Customers', to: '/__ui' },
                { label: 'Lakeview Hospitality Group — Procurement & Facilities', to: '/__ui' },
                { label: 'Quotation NCQ-261105-ZX9PL for a very long project name' },
              ]}
            />
          </div>
        </Demo>
      </Grid>

      <Grid>
        <Demo title="Pagination">
          <div className="space-y-6">
            <Pagination page={page} pageCount={7} onPageChange={setPage} totalItems={134} pageSize={20} />
            <Pagination page={page} pageCount={20} onPageChange={setPage} />
            <Pagination page={1} pageCount={1} onPageChange={() => undefined} totalItems={8} pageSize={20} />
          </div>
        </Demo>

        <Demo title="Stepper" note="Completed steps are clickable">
          <Stepper
            steps={STEPPER_STEPS}
            current={step}
            maxReachable={reached}
            onStepClick={setStep}
          />
          <div className="mt-6 flex justify-between gap-3 border-t border-line pt-4">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
              Back
            </Button>
            <Button
              rightIcon={<ArrowRight />}
              disabled={step === STEPPER_STEPS.length - 1}
              onClick={() => {
                const next = Math.min(STEPPER_STEPS.length - 1, step + 1);
                setStep(next);
                setReached((value) => Math.max(value, next));
              }}
            >
              Continue
            </Button>
          </div>
        </Demo>
      </Grid>

      <Demo title="PageHeader" tone="canvas">
        <PageHeader
          breadcrumbs={[{ label: 'Orders', to: '/__ui' }, { label: 'NCO-261107-AB12C' }]}
          eyebrow="Order"
          title="NCO-261107-AB12C"
          description="Banner & large-format printing for Achieng Otieno. Placed 7 Nov 2026."
          meta={
            <>
              <StatusBadge {...STATUS.in_production} />
              <span className="font-mono text-xs">4 items</span>
              <span>Due 12 Nov</span>
            </>
          }
          actions={
            <>
              <Button variant="secondary" leftIcon={<Download />}>
                Invoice
              </Button>
              <Button>Update status</Button>
            </>
          }
        />
        <PageHeader
          size="compact"
          title="Pricing rules"
          description="Rates used for instant estimates."
          actions={<Button size="sm" leftIcon={<Plus />}>Add rate</Button>}
          className="border-t border-line pt-5"
        />
      </Demo>

      <Demo title="FilterBar">
        <FilterBar
          actions={
            <>
              <Button variant="ghost" onClick={() => { setQuery(''); setStatus(''); }}>
                Reset
              </Button>
              <Button variant="secondary" leftIcon={<Download />}>
                Export
              </Button>
            </>
          }
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search by reference or customer" />
          <Select
            aria-label="Status"
            placeholder="All statuses"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={(Object.keys(STATUS) as OrderStatus[]).map((key) => ({ value: key, label: STATUS[key].label }))}
          />
          <Select aria-label="Service" placeholder="All services" defaultValue="" options={[{ value: 'banner', label: 'Banners' }, { value: 'stickers', label: 'Stickers' }]} />
        </FilterBar>
      </Demo>
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 06 Overlays
 * ------------------------------------------------------------------------------------------- */

function OverlaysSection() {
  const [modal, setModal] = useState<'sm' | 'md' | 'lg' | 'xl' | null>(null);
  const [longModal, setLongModal] = useState(false);
  const [drawer, setDrawer] = useState<'right' | 'left' | null>(null);
  const [confirm, setConfirm] = useState<'primary' | 'danger' | null>(null);
  const toast = useToast();

  const menuItems = [
    { label: 'Edit order', icon: <Pencil />, onSelect: () => toast.info('Edit selected') },
    { label: 'Duplicate', icon: <Copy />, description: 'Creates a draft with the same configuration', onSelect: () => toast.info('Duplicated') },
    { label: 'Open services page', icon: <ArrowUpRight />, to: '/services' },
    { label: 'Download invoice', icon: <Download />, disabled: true },
    'separator' as const,
    { label: 'Cancel order', icon: <Trash2 />, danger: true, onSelect: () => setConfirm('danger') },
  ];

  return (
    <KitSection id="overlays" index="06" title="Overlays" description="Portalled, focus-trapped, Escape closes, focus returns to the opener.">
      <Grid>
        <Demo title="Modal · Drawer · ConfirmDialog">
          <div className="space-y-4">
            <Row>
              <Button onClick={() => setModal('md')}>Open modal</Button>
              <Button variant="secondary" onClick={() => setModal('sm')}>
                Small
              </Button>
              <Button variant="secondary" onClick={() => setModal('lg')}>
                Large
              </Button>
              <Button variant="secondary" onClick={() => setModal('xl')}>
                XL
              </Button>
              <Button variant="secondary" onClick={() => setLongModal(true)}>
                Long content
              </Button>
            </Row>
            <Row>
              <Button variant="secondary" onClick={() => setDrawer('right')}>
                Open drawer
              </Button>
              <Button variant="secondary" onClick={() => setDrawer('left')}>
                Left drawer
              </Button>
            </Row>
            <Row>
              <Button variant="secondary" onClick={() => setConfirm('primary')}>
                Open confirm
              </Button>
              <Button variant="danger" onClick={() => setConfirm('danger')}>
                Open confirm (danger)
              </Button>
            </Row>
          </div>
        </Demo>

        <Demo title="DropdownMenu · Tooltip">
          <div className="space-y-5">
            <Row>
              <DropdownMenu trigger={<Button variant="secondary" rightIcon={<ChevronDown />}>Open menu</Button>} items={menuItems} />
              <DropdownMenu align="end" label="Order actions" trigger={<IconButton label="More actions" icon={<MoreHorizontal />} variant="secondary" />} items={menuItems} />
            </Row>
            <Row>
              <Tooltip content="Prices include VAT where applicable">
                <IconButton label="Pricing information" icon={<Info />} />
              </Tooltip>
              <Tooltip content="Opens below" side="bottom">
                <Button variant="ghost">Tooltip bottom</Button>
              </Tooltip>
              <Tooltip content="Reference copied to the clipboard on click" side="right">
                <span tabIndex={0} className="rounded font-mono text-sm text-slate-700 underline decoration-dotted underline-offset-4">
                  NCO-261107-AB12C
                </span>
              </Tooltip>
            </Row>
          </div>
        </Demo>
      </Grid>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        size={modal ?? 'md'}
        title="Edit pricing rate"
        description="Changes apply to new estimates immediately."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModal(null);
                toast.success('Rate saved', 'Banner printing · KES 950 per m²');
              }}
            >
              Save rate
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Unit rate" hint="Per square metre." required>
            <Input inputMode="decimal" defaultValue="950" rightAddon="KES" data-autofocus />
          </Field>
          <Field label="Setup fee">
            <Input inputMode="decimal" defaultValue="500" rightAddon="KES" />
          </Field>
          <Switch label="Rate active" description="Inactive rates fall back to quotations." checked onChange={() => undefined} />
          <DropdownMenu trigger={<Button variant="secondary" size="sm" rightIcon={<ChevronDown />}>Menu inside modal</Button>} items={menuItems} />
        </div>
      </Modal>

      <Modal
        open={longModal}
        onClose={() => setLongModal(false)}
        size="lg"
        title="Terms of service"
        description="The body scrolls; header and footer stay put."
        footer={<Button onClick={() => setLongModal(false)}>I understand</Button>}
      >
        {Array.from({ length: 14 }, (_, index) => (
          <p key={index} className="mb-3">
            {index + 1}. Final charges are subject to file review and quotation approval. Turnaround starts once artwork is
            approved and payment is confirmed. Colours may vary slightly between screen and print.
          </p>
        ))}
      </Modal>

      <Drawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        side={drawer ?? 'right'}
        size="lg"
        title="NCO-261107-AB12C"
        description="Banner & large-format printing"
        headerActions={<DropdownMenu align="end" trigger={<IconButton size="sm" label="Order actions" icon={<MoreHorizontal />} />} items={menuItems} />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawer(null)}>
              Close
            </Button>
            <Button>Update status</Button>
          </>
        }
      >
        <div className="space-y-6">
          <StatusBadge {...STATUS.in_production} />
          <ProgressSteps steps={ORDER_STEPS} current={2} />
          <SpecList
            leaders
            items={[
              { label: 'Customer', value: 'Achieng Otieno' },
              { label: 'Size', value: '2.40 × 1.20 m', mono: true },
              { label: 'Quantity', value: '4 pcs', mono: true },
              { label: 'Estimate', value: money.format(18400) },
            ]}
          />
          {Array.from({ length: 8 }, (_, index) => (
            <p key={index}>Activity note {index + 1}: drawer body scrolls independently of the header and footer.</p>
          ))}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        tone={confirm === 'danger' ? 'danger' : 'primary'}
        title={confirm === 'danger' ? 'Cancel this order?' : 'Send quotation to the customer?'}
        description={
          confirm === 'danger'
            ? 'The customer is notified by email. This cannot be undone.'
            : 'The customer receives the quotation by email and can accept it online.'
        }
        confirmLabel={confirm === 'danger' ? 'Cancel order' : 'Send quotation'}
        cancelLabel={confirm === 'danger' ? 'Keep order' : 'Cancel'}
        onConfirm={() =>
          new Promise<void>((resolve) => {
            window.setTimeout(() => {
              resolve();
              setConfirm(null);
              toast.success(confirm === 'danger' ? 'Order cancelled' : 'Quotation sent');
            }, 1200);
          })
        }
      />
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 07 Feedback
 * ------------------------------------------------------------------------------------------- */

function FeedbackSection() {
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);
  const stackError = new Error('TypeError: Cannot read properties of undefined (reading "id")\n    at loadOrders (orders.ts:42:13)\n    at async refresh (Admin.tsx:88:5)');

  return (
    <KitSection id="feedback" index="07" title="Feedback" description="Toasts for completed actions, ErrorState for load failures, inline validation for forms.">
      <Grid>
        <Demo title="Alert">
          <div className="space-y-3">
            <Alert title="Rates are not configured">Instant estimates appear once a staff member sets a unit rate.</Alert>
            <Alert tone="success" title="Quotation accepted" />
            <Alert tone="warning" action={<Button size="sm" variant="secondary">Review files</Button>}>
              Two files are below 150 dpi at the chosen size.
            </Alert>
            {!dismissed && (
              <Alert
                tone="danger"
                title="We couldn't place your order"
                onDismiss={() => setDismissed(true)}
                action={<Button size="sm" variant="secondary">Retry</Button>}
              >
                The connection dropped while submitting. Your cart is saved — try again in a moment.
              </Alert>
            )}
            <Alert tone="neutral">Neutral note for low-priority context.</Alert>
          </div>
        </Demo>

        <Demo title="Toasts" note="Bottom-right; full width on phones; pause on hover">
          <Row>
            <Button variant="secondary" onClick={() => toast.success('Order submitted', 'Reference NCO-261107-AB12C')}>
              Success toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error('Could not save the rate', 'permission denied for table pricing_rates')}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => toast.info('Proof ready for review')}>
              Info toast
            </Button>
            <Button variant="secondary" onClick={() => toast.warning('Low stock', 'Premium frontlit: 6 m² left')}>
              Warning toast
            </Button>
            <Button variant="ghost" onClick={() => toast.toast({ title: 'Stays until dismissed', duration: 0 })}>
              Persistent
            </Button>
          </Row>
        </Demo>
      </Grid>

      <div className="grid gap-6 lg:grid-cols-3">
        <Demo title="EmptyState · sm">
          <EmptyState size="sm" icon={<Inbox />} title="No files yet" description="Uploaded artwork appears here." />
        </Demo>
        <Demo title="EmptyState · dashed">
          <EmptyState
            tone="dashed"
            icon={<ShoppingBag />}
            title="Your cart is empty"
            description="Browse services and configure the work you need."
            action={<ButtonLink to="/services">Explore services</ButtonLink>}
          />
        </Demo>
        <Demo title="EmptyState · lg">
          <EmptyState
            size="lg"
            icon={<Palette />}
            title="No design projects"
            description="Projects you start with the design team will appear here with their proofs."
            action={<Button leftIcon={<Plus />}>Start a project</Button>}
            secondaryAction={<Button variant="ghost">Learn more</Button>}
          />
        </Demo>
      </div>

      <Grid>
        <Demo title="ErrorState">
          <div className="space-y-4">
            <ErrorState compact error={new TypeError('Failed to fetch')} onRetry={() => toast.info('Retrying…')} />
            <ErrorState compact title="Could not load quotes" error={{ message: 'permission denied for table quote_requests', code: '42501' }} />
            <ErrorState error={stackError} onRetry={() => toast.info('Retrying…')} />
          </div>
        </Demo>
        <Demo title="LoadingState">
          <LoadingState label="Loading orders…" />
          <LoadingState variant="skeleton" rows={4} label="Loading activity" />
        </Demo>
      </Grid>
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 08 Data
 * ------------------------------------------------------------------------------------------- */

function DataSection() {
  const [sort, setSort] = useState<SortState | null>({ key: 'date', direction: 'desc' });
  const [selected, setSelected] = useState<SampleOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [dense, setDense] = useState(false);
  const [page, setPage] = useState(1);
  const toast = useToast();

  const rows = useMemo(() => {
    if (empty) return [];
    const list = [...ORDERS];
    if (sort) {
      list.sort((a, b) => {
        const left = a[sort.key as keyof SampleOrder];
        const right = b[sort.key as keyof SampleOrder];
        const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
        return sort.direction === 'asc' ? order : -order;
      });
    }
    return list;
  }, [sort, empty]);

  const columns: Array<Column<SampleOrder>> = [
    {
      key: 'reference',
      header: 'Reference',
      sortable: true,
      mobile: 'primary',
      cell: (order) => <span className="whitespace-nowrap font-mono text-[13px] font-medium text-slate-900">{order.reference}</span>,
    },
    { key: 'customer', header: 'Customer', mobile: 'secondary', cell: (order) => <span className="line-clamp-1">{order.customer}</span> },
    { key: 'service', header: 'Service', hideBelow: 'lg', cell: (order) => order.service },
    { key: 'status', header: 'Status', mobile: 'badge', cell: (order) => <StatusBadge {...STATUS[order.status]} /> },
    { key: 'date', header: 'Placed', sortable: true, cell: (order) => <span className="whitespace-nowrap tabular-nums">{order.date}</span> },
    { key: 'total', header: 'Total', sortable: true, align: 'right', cell: (order) => money.format(order.total) },
    {
      key: 'actions',
      header: <VisuallyHidden>Actions</VisuallyHidden>,
      align: 'right',
      width: '3.5rem',
      mobile: 'action',
      cell: (order) => (
        <DropdownMenu
          align="end"
          label={`Actions for ${order.reference}`}
          trigger={<IconButton size="sm" label={`Actions for ${order.reference}`} icon={<MoreHorizontal />} />}
          items={[
            { label: 'Open', icon: <ArrowUpRight />, onSelect: () => setSelected(order) },
            { label: 'Copy reference', icon: <Copy />, onSelect: () => toast.success('Copied', order.reference) },
            'separator',
            { label: 'Cancel order', icon: <Trash2 />, danger: true, onSelect: () => toast.warning('Not in the preview') },
          ]}
        />
      ),
    },
  ];

  return (
    <KitSection id="data" index="08" title="Data" description="Semantic table from md up; stacked cards on phones. Sorting is controlled by the page.">
      <Demo title="DataTable" tone="canvas" note="Click a row or press Enter on it">
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-3">
          <Switch label="Loading" size="sm" checked={loading} onChange={setLoading} />
          <Switch label="Empty" size="sm" checked={empty} onChange={setEmpty} />
          <Switch label="Dense" size="sm" checked={dense} onChange={setDense} />
        </div>
        <DataTable
          caption="Sample orders"
          columns={columns}
          rows={rows}
          rowKey={(order) => order.id}
          loading={loading}
          dense={dense}
          sort={sort}
          onSortChange={setSort}
          onRowClick={setSelected}
          rowLabel={(order) => `Open order ${order.reference}`}
          selectedKey={selected?.id ?? null}
          empty={
            <EmptyState
              size="sm"
              icon={<Search />}
              title="No orders match these filters"
              description="Try a different status or clear the search."
              action={<Button size="sm" variant="secondary" onClick={() => setEmpty(false)}>Clear filters</Button>}
            />
          }
        />
        <Pagination page={page} pageCount={7} onPageChange={setPage} totalItems={134} pageSize={20} className="mt-4" />
      </Demo>

      <Demo title="DataTable · mobile scroll · sticky header">
        <DataTable
          caption="Stock levels"
          mobile="scroll"
          stickyHeader
          dense
          columns={[
            { key: 'sku', header: 'SKU', cell: (row: { sku: string; name: string; qty: number }) => <span className="font-mono text-xs">{row.sku}</span> },
            { key: 'name', header: 'Item', cell: (row) => row.name },
            { key: 'qty', header: 'On hand', align: 'right', cell: (row) => `${row.qty} m²` },
          ]}
          rows={[
            { sku: 'PF-510', name: 'Premium frontlit 510 gsm', qty: 6 },
            { sku: 'SF-440', name: 'Standard frontlit 440 gsm', qty: 42 },
            { sku: 'BL-500', name: 'Backlit film', qty: 18 },
            { sku: 'MS-270', name: 'Mesh 270 gsm', qty: 25 },
          ]}
          rowKey={(row) => row.sku}
        />
      </Demo>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title={selected?.reference ?? ''} description={selected?.service}>
        {selected && (
          <div className="space-y-6">
            <StatusBadge {...STATUS[selected.status]} />
            <SpecList
              leaders
              items={[
                { label: 'Customer', value: selected.customer },
                { label: 'Placed', value: selected.date, mono: true },
                { label: 'Total', value: money.format(selected.total) },
              ]}
            />
          </div>
        )}
      </Drawer>
    </KitSection>
  );
}

/* ----------------------------------------------------------------------------------------------
 * 09 Layout
 * ------------------------------------------------------------------------------------------- */

function MediaPlaceholder({ label, inverse = false }: { label: string; inverse?: boolean }) {
  return (
    <div
      className={cn(
        'bg-grid grid aspect-[16/10] place-items-center rounded-2xl ring-1 ring-inset',
        inverse ? 'surface-inverse bg-ink-800 ring-white/10' : 'bg-paper ring-black/5',
      )}
    >
      <span className={cn('font-mono text-xs uppercase tracking-[0.12em]', inverse ? 'text-slate-400' : 'text-slate-500')}>{label}</span>
    </div>
  );
}

function LayoutSection() {
  return (
    <section id="layout" aria-labelledby="layout-title" className="border-t border-line">
      <Section tone="white" className="bg-grid" spacing="lg" aria-labelledby="layout-title">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Eyebrow index="09">Layout</Eyebrow>
              <h2 id="layout-title" className="text-display mt-5">
                From the first idea to the <span className="text-brand-600">finished product.</span>
              </h2>
              <p className="text-lead mt-6">
                Section (white) with the precision grid, Eyebrow, display type, CropFrame and the two button levels — the
                hero pattern.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink to="/services" size="lg" rightIcon={<ArrowRight />}>
                  Explore services
                </ButtonLink>
                <ButtonLink to="/quote" size="lg" variant="secondary">
                  Request a custom quote
                </ButtonLink>
              </div>
            </div>
            <CropFrame>
              <MediaPlaceholder label="16:10 · featured media" />
            </CropFrame>
          </div>
        </Container>
      </Section>

      <Section tone="paper" aria-labelledby="paper-title">
        <Container>
          <SectionHeader
            id="paper-title"
            index="02"
            eyebrow="Process"
            title="Section · paper"
            description="Warm off-white band for alternating marketing sections."
            action={<ButtonLink to="/services" variant="secondary" rightIcon={<ArrowRight />}>All services</ButtonLink>}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['Choose a service', 'Share your files', 'Approve the proof', 'Collect or deliver'].map((title, index) => (
              <Card key={title}>
                <p className="font-mono text-xs text-brand-700">{String(index + 1).padStart(2, '0')}</p>
                <h3 className="text-h3 mt-3">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">Clear, honest copy about what happens at this step.</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="ink" aria-labelledby="ink-title">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionHeader
                id="ink-title"
                tone="dark"
                index="03"
                eyebrow="Production"
                title="Section · ink"
                description="Headings, links and focus rings switch to light-on-dark automatically."
              />
              <p className="mt-6 text-sm">
                Body copy is slate-300. Inline <a className="link" href="#layout">links stay legible</a>.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="inverse" rightIcon={<ArrowUpRight />}>
                  Request a quote
                </Button>
                <Button variant="inverse-outline">Talk to nexxacrafts</Button>
              </div>
            </div>
            <CropFrame tone="inverse">
              <MediaPlaceholder label="crop marks · inverse" inverse />
            </CropFrame>
          </div>
        </Container>
      </Section>

      <Section tone="brand" spacing="sm" aria-labelledby="brand-title">
        <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="brand-title" className="text-h2">
              Section · brand
            </h2>
            <p className="mt-2 max-w-xl">Electric blue band for one closing call to action per page.</p>
          </div>
          <Button variant="inverse" size="lg" rightIcon={<ArrowRight />}>
            Start an order
          </Button>
        </Container>
      </Section>

      <Section spacing="sm" aria-labelledby="containers-title">
        <Container size="wide">
          <h2 id="containers-title" className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
            Container sizes · SkipLink · VisuallyHidden
          </h2>
          <div className="mt-4 space-y-2">
            {(['narrow', 'default', 'wide'] as const).map((size) => (
              <Container key={size} size={size} className="rounded-md bg-brand-50 py-2 font-mono text-xs text-brand-800">
                {size}
              </Container>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-600">
            The skip link is the first focusable element on this page — reload and press Tab. This sentence ends with
            screen-reader-only text.
            <VisuallyHidden> (Visually hidden text is announced by screen readers.)</VisuallyHidden>
          </p>
        </Container>
      </Section>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------------------------- */

function KitPage() {
  return (
    <div className="min-h-screen bg-white">
      <SkipLink href="#kit-main" />
      <header className="surface-inverse border-b border-ink-700 bg-ink-900 text-slate-300">
        <Container size="wide" className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-white">
            nexxacrafts <span className="text-slate-500">/</span> UI kit
          </p>
          <nav aria-label="Kit sections" className="-mx-1 overflow-x-auto scrollbar-none">
            <ul className="flex gap-1">
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </header>

      <main id="kit-main">
        <Container size="wide" className="py-12 sm:py-16">
          <Eyebrow index="00">Design system</Eyebrow>
          <h1 className="text-h1 mt-4">Precision Craft — component kit</h1>
          <p className="text-lead mt-4">
            Every component from <code className="font-mono text-[0.9em] text-slate-900">@/components/ui</code> in its
            states. Dev-only page; sample data is illustrative.
          </p>
        </Container>
        <TokensSection />
        <ActionsSection />
        <FormsSection />
        <DisplaySection />
        <NavigationSection />
        <OverlaysSection />
        <FeedbackSection />
        <DataSection />
        <LayoutSection />
      </main>
    </div>
  );
}

export default function UiKitPreview() {
  return (
    <ToastProvider>
      <KitPage />
    </ToastProvider>
  );
}
