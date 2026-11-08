// Dev-only chart gallery (route /__charts, never registered in production builds).
// Every figure on this page is SAMPLE DATA for visual QA only. Nothing here is exported or real.
import type { ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import {
  AreaChart,
  BarChart,
  BarList,
  CATEGORICAL,
  CATEGORICAL_NAMES,
  DonutChart,
  LineChart,
  NEUTRAL,
  STATUS,
  Sparkline,
  StackedBar,
  contrastRatio,
  ordinalRamp,
} from '@/components/charts';
import type { ChartDatum } from '@/components/charts';
import { money, services } from '@/lib/catalog';

/* ---------------------------------------------------------------------------------------------
 * Sample data — dev preview only.
 * ------------------------------------------------------------------------------------------- */

const SAMPLE_WEEKS: ChartDatum[] = [
  { week: '18 Aug', orders: 14, print: 6, branding: 3, digital: 2, fabrication: 3 },
  { week: '25 Aug', orders: 18, print: 8, branding: 4, digital: 2, fabrication: 4 },
  { week: '1 Sep', orders: 11, print: 5, branding: 2, digital: 1, fabrication: 3 },
  { week: '8 Sep', orders: 22, print: 10, branding: 5, digital: 3, fabrication: 4 },
  { week: '15 Sep', orders: 19, print: 9, branding: 4, digital: 2, fabrication: 4 },
  { week: '22 Sep', orders: 25, print: 11, branding: 6, digital: 3, fabrication: 5 },
  { week: '29 Sep', orders: 21, print: 9, branding: 5, digital: 2, fabrication: 5 },
  { week: '6 Oct', orders: 28, print: 13, branding: 6, digital: 4, fabrication: 5 },
  { week: '13 Oct', orders: 24, print: 11, branding: 5, digital: 3, fabrication: 5 },
  { week: '20 Oct', orders: 31, print: 14, branding: 7, digital: 4, fabrication: 6 },
  { week: '27 Oct', orders: 27, print: 12, branding: 6, digital: 3, fabrication: 6 },
  { week: '3 Nov', orders: 34, print: 15, branding: 8, digital: 5, fabrication: 6 },
];

const SAMPLE_MONTHS: ChartDatum[] = [
  { month: 'Dec', revenue: 182400, expenses: 121300, quotes: 38, accepted: 21 },
  { month: 'Jan', revenue: 146900, expenses: 109800, quotes: 31, accepted: 15 },
  { month: 'Feb', revenue: 171250, expenses: 112600, quotes: 35, accepted: 19 },
  { month: 'Mar', revenue: 205800, expenses: 128400, quotes: 42, accepted: 24 },
  { month: 'Apr', revenue: 198300, expenses: 131900, quotes: 40, accepted: 22 },
  { month: 'May', revenue: 226700, expenses: 140200, quotes: 47, accepted: 28 },
  { month: 'Jun', revenue: 214900, expenses: 138700, quotes: 44, accepted: 25 },
  { month: 'Jul', revenue: 241600, expenses: 147300, quotes: 51, accepted: 30 },
  { month: 'Aug', revenue: 236200, expenses: 151800, quotes: 49, accepted: 27 },
  { month: 'Sep', revenue: 262900, expenses: 158600, quotes: 55, accepted: 33 },
  { month: 'Oct', revenue: 279400, expenses: 163100, quotes: 58, accepted: 35 },
  { month: 'Nov', revenue: 248600, expenses: 149900, quotes: 52, accepted: 31 },
];

const SAMPLE_PAYMENT_METHODS = [
  { label: 'M-Pesa', value: 412 },
  { label: 'Bank transfer', value: 126 },
  { label: 'Card', value: 58 },
];

const SAMPLE_SERVICE_ORDERS = [42, 31, 18, 14, 9, 6];

const SAMPLE_DELIVERY_TOWNS = [
  { label: 'Nairobi', value: 318 },
  { label: 'Kiambu', value: 74 },
  { label: 'Mombasa', value: 52 },
  { label: 'Nakuru', value: 41 },
  { label: 'Kisumu', value: 33 },
  { label: 'Machakos', value: 21 },
  { label: 'Eldoret', value: 17 },
  { label: 'Nyeri', value: 12 },
];

const SAMPLE_PIPELINE = [
  { label: 'Awaiting review', value: 8 },
  { label: 'Awaiting payment', value: 12 },
  { label: 'In production', value: 15 },
  { label: 'Ready / dispatched', value: 6 },
  { label: 'Completed', value: 41 },
];

const SAMPLE_YEAR: ChartDatum[] = Array.from({ length: 52 }, (_, index) => ({
  week: `W${index + 1}`,
  orders: Math.round(16 + index * 0.35 + 7 * Math.sin(index / 3.2) + ((index * 13) % 5)),
}));

const SAMPLE_SPARK_ORDERS = [14, 18, 11, 22, 19, 25, 21, 28, 24, 31, 27, 34];
const SAMPLE_SPARK_REVENUE = [182, 147, 171, 206, 198, 227, 215, 242, 236, 263, 279, 249];

/* ---------------------------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------------------------- */

const compactMoney = (value: number) =>
  `KES ${new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;

export default function ChartsPreview() {
  const pipelineColors = ordinalRamp(SAMPLE_PIPELINE.length);
  const serviceItems = services.map((service, index) => ({
    label: service.name,
    value: SAMPLE_SERVICE_ORDERS[index] ?? 0,
    to: `/__charts#service-${service.slug}`,
    hint: `${Math.round(((SAMPLE_SERVICE_ORDERS[index] ?? 0) / 120) * 100)}%`,
  }));

  return (
    <div className="min-h-screen bg-canvas">
      <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8 md:py-10">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-brand-700">
              Dev preview · /__charts
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Charts</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              The NexxaCraft SVG chart library (<code className="font-mono text-xs">@/components/charts</code>
              ). Each chart is shown with sample data and with no data. Hover or tab into a chart to see its
              readout; use the Table button for the accessible data view.
            </p>
          </div>
          <SampleNotice />
        </header>

        <PaletteSection />

        <Section title="BarChart" description="Vertical bars over categories — grouped or stacked.">
          <ChartCard title="Orders per week" sample>
            <BarChart
              ariaLabel="Orders per week"
              data={SAMPLE_WEEKS}
              xKey="week"
              xLabel="Week of"
              series={[{ key: 'orders', label: 'Orders' }]}
            />
          </ChartCard>
          <ChartCard title="Orders per week" note="Empty — no rows">
            <BarChart
              ariaLabel="Orders per week"
              data={[]}
              xKey="week"
              series={[{ key: 'orders', label: 'Orders' }]}
              emptyLabel="No orders in this period"
              emptyDescription="Orders placed through checkout will appear here each week."
            />
          </ChartCard>
          <ChartCard title="Orders by service category" sample>
            <BarChart
              ariaLabel="Orders by service category per week"
              data={SAMPLE_WEEKS}
              xKey="week"
              xLabel="Week of"
              stacked
              series={[
                { key: 'print', label: 'Print' },
                { key: 'branding', label: 'Branding' },
                { key: 'digital', label: 'Digital' },
                { key: 'fabrication', label: 'Fabrication' },
              ]}
            />
          </ChartCard>
          <ChartCard title="Quotes received vs accepted" sample>
            <BarChart
              ariaLabel="Quotes received and accepted per month"
              data={SAMPLE_MONTHS}
              xKey="month"
              series={[
                { key: 'quotes', label: 'Received' },
                { key: 'accepted', label: 'Accepted' },
              ]}
            />
          </ChartCard>
        </Section>

        <Section title="AreaChart & LineChart" description="Trends over time with a snapping crosshair.">
          <ChartCard title="Revenue by month" sample>
            <AreaChart
              ariaLabel="Revenue by month"
              data={SAMPLE_MONTHS}
              xKey="month"
              series={[{ key: 'revenue', label: 'Revenue' }]}
              valueFormatter={money}
            />
          </ChartCard>
          <ChartCard title="Revenue by month" note="Empty — all zeros">
            <AreaChart
              ariaLabel="Revenue by month"
              data={SAMPLE_MONTHS.map((row) => ({ month: row.month, revenue: 0 }))}
              xKey="month"
              series={[{ key: 'revenue', label: 'Revenue' }]}
              valueFormatter={money}
              emptyLabel="No paid orders yet"
              emptyDescription="Revenue appears once payments are confirmed."
            />
          </ChartCard>
          <ChartCard title="Revenue and expenses" sample>
            <LineChart
              ariaLabel="Revenue and expenses by month"
              data={SAMPLE_MONTHS}
              xKey="month"
              curve="monotone"
              series={[
                { key: 'revenue', label: 'Revenue' },
                { key: 'expenses', label: 'Expenses' },
              ]}
              valueFormatter={money}
            />
          </ChartCard>
          <ChartCard title="Revenue and expenses" note="Empty — no rows">
            <LineChart
              ariaLabel="Revenue and expenses by month"
              data={[]}
              xKey="month"
              series={[
                { key: 'revenue', label: 'Revenue' },
                { key: 'expenses', label: 'Expenses' },
              ]}
              emptyLabel="No finance records yet"
            />
          </ChartCard>
        </Section>

        <Section
          title="DonutChart"
          description="Part-to-whole at a glance; the smallest parts fold into Other."
        >
          <ChartCard title="Orders by payment method" sample>
            <DonutChart
              ariaLabel="Orders by payment method"
              data={SAMPLE_PAYMENT_METHODS}
              centerLabel="Orders"
            />
          </ChartCard>
          <ChartCard title="Orders by payment method" note="Empty — no rows">
            <DonutChart ariaLabel="Orders by payment method" data={[]} emptyLabel="No orders yet" />
          </ChartCard>
          <ChartCard title="Orders by service" sample>
            <DonutChart
              ariaLabel="Orders by service"
              data={services.map((service, index) => ({
                label: service.name,
                value: SAMPLE_SERVICE_ORDERS[index] ?? 0,
              }))}
              centerLabel="Orders"
            />
          </ChartCard>
          <ChartCard title="Deliveries by town" note="8 parts → 5 + Other" sample>
            <DonutChart
              ariaLabel="Deliveries by town"
              data={SAMPLE_DELIVERY_TOWNS}
              centerLabel="Deliveries"
            />
          </ChartCard>
        </Section>

        <Section title="BarList" description="Ranked horizontal bars with printed values; rows can link.">
          <ChartCard title="Orders by service" sample>
            <BarList ariaLabel="Orders by service" items={serviceItems} />
          </ChartCard>
          <ChartCard title="Orders by service" note="Empty — all zeros">
            <BarList
              ariaLabel="Orders by service"
              items={services.map((service) => ({ label: service.name, value: 0 }))}
              emptyLabel="No orders by service yet"
            />
          </ChartCard>
          <ChartCard title="Top delivery towns" note="max = 5" sample>
            <BarList ariaLabel="Top delivery towns" items={SAMPLE_DELIVERY_TOWNS} max={5} />
          </ChartCard>
        </Section>

        <Section
          title="StackedBar"
          description="One whole split into parts — tall with shares, or thin beside figures."
        >
          <ChartCard title="Order pipeline" note="Ordinal ramp" sample>
            <StackedBar
              ariaLabel="Open order pipeline by stage"
              segments={SAMPLE_PIPELINE.map((stage, index) => ({ ...stage, color: pipelineColors[index] }))}
            />
          </ChartCard>
          <ChartCard title="Order pipeline" note="Empty — all zeros">
            <StackedBar
              ariaLabel="Open order pipeline by stage"
              segments={SAMPLE_PIPELINE.map((stage) => ({ ...stage, value: 0 }))}
              emptyLabel="No open orders"
            />
          </ChartCard>
          <ChartCard title="Payment methods (thin, beside figures)" sample>
            <ThinBarExample />
          </ChartCard>
        </Section>

        <Section title="Edge cases" description="Signed values, dense series, single points and tiny parts.">
          <ChartCard title="Net cash flow by month" note="Negative values" sample>
            <BarChart
              ariaLabel="Net cash flow by month"
              data={SAMPLE_MONTHS.map((row, index) => ({
                month: row.month,
                net:
                  index % 4 === 1 ? -18400 - index * 900 : Number(row.revenue) - Number(row.expenses) - 30000,
              }))}
              xKey="month"
              series={[{ key: 'net', label: 'Net cash flow' }]}
              valueFormatter={money}
            />
          </ChartCard>
          <ChartCard title="Orders per week, 52 weeks" note="Dense categories" sample>
            <BarChart
              ariaLabel="Orders per week, last 52 weeks"
              data={SAMPLE_YEAR}
              xKey="week"
              series={[{ key: 'orders', label: 'Orders' }]}
            />
          </ChartCard>
          <ChartCard title="Revenue, first month" note="Single point" sample>
            <AreaChart
              ariaLabel="Revenue, first month"
              data={[{ month: 'Nov', revenue: 48200 }]}
              xKey="month"
              series={[{ key: 'revenue', label: 'Revenue' }]}
              valueFormatter={money}
            />
          </ChartCard>
          <ChartCard title="Converging lines" note="End labels collide → legend + tooltip" sample>
            <LineChart
              ariaLabel="Quotes and orders by month"
              data={SAMPLE_MONTHS.map((row, index) => ({
                month: row.month,
                quotes: row.quotes,
                orders: Number(row.quotes) - (index === SAMPLE_MONTHS.length - 1 ? 1 : 6),
              }))}
              xKey="month"
              series={[
                { key: 'quotes', label: 'Quotes' },
                { key: 'orders', label: 'Orders' },
              ]}
            />
          </ChartCard>
          <ChartCard title="Single part" note="100% slice, sub-1% segment" sample>
            <div className="space-y-6">
              <DonutChart
                ariaLabel="Orders by currency"
                data={[{ label: 'KES', value: 596 }]}
                size={120}
                tableMode="hidden"
              />
              <StackedBar
                ariaLabel="Payment status"
                segments={[
                  { label: 'Paid', value: 594 },
                  { label: 'Refunded', value: 2 },
                ]}
              />
            </div>
          </ChartCard>
          <ChartCard
            title="Eight slots + Other"
            note="Past eight series the tail folds into neutral Other"
            sample
          >
            <BarChart
              ariaLabel="Eight series and Other"
              stacked
              data={SAMPLE_WEEKS.slice(-6).map((row) => ({
                week: row.week,
                ...Object.fromEntries(
                  Array.from({ length: 9 }, (_, index) => [`s${index}`, 2 + ((index * 7) % 5)]),
                ),
              }))}
              xKey="week"
              series={Array.from({ length: 9 }, (_, index) =>
                index < 8
                  ? { key: `s${index}`, label: `Series ${index + 1}` }
                  : { key: `s${index}`, label: 'Other', color: NEUTRAL.other },
              )}
            />
          </ChartCard>
        </Section>

        <Section
          title="Sparkline"
          description="Word-sized trend for stat tiles: grey history, current period in blue."
        >
          <ChartCard title="Stat tiles" sample>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile label="Orders this week" value="34" delta="+26% vs last week">
                <Sparkline ariaLabel="Orders per week, last 12 weeks" values={SAMPLE_SPARK_ORDERS} />
              </StatTile>
              <StatTile label="Revenue this month" value={compactMoney(248600)} delta="−11% vs last month">
                <Sparkline
                  ariaLabel="Revenue per month, last 12 months, thousands of KES"
                  values={SAMPLE_SPARK_REVENUE}
                />
              </StatTile>
            </div>
          </ChartCard>
          <ChartCard title="Stat tiles" note="Empty — no values">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile label="Orders this week" value="0">
                <Sparkline ariaLabel="Orders per week, last 12 weeks" values={[]} />
              </StatTile>
              <StatTile label="Revenue this month" value="KES 0">
                <Sparkline ariaLabel="Revenue per month" values={[0, 0, 0, 0]} />
              </StatTile>
            </div>
          </ChartCard>
        </Section>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Page building blocks (dev page only)
 * ------------------------------------------------------------------------------------------- */

function SampleNotice() {
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-800">
      <FlaskConical aria-hidden="true" size={16} strokeWidth={1.75} />
      Sample data — dev preview only
    </p>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10" aria-labelledby={`section-${title}`}>
      <div className="mb-4">
        <h2 id={`section-${title}`} className="font-display text-lg font-bold text-slate-900">
          {title}
        </h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function ChartCard({
  title,
  note,
  sample = false,
  children,
}: {
  title: string;
  note?: string;
  sample?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-line bg-white p-5 shadow-xs">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
        </div>
        {sample && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning-50 px-2 py-0.5 text-2xs font-medium text-warning-800 ring-1 ring-inset ring-warning-200">
            <FlaskConical aria-hidden="true" size={12} strokeWidth={1.75} />
            Sample data — dev preview only
          </span>
        )}
      </header>
      {children}
    </article>
  );
}

function StatTile({
  label,
  value,
  delta,
  children,
}: {
  label: string;
  value: string;
  delta?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {delta && <p className="mt-0.5 text-xs text-slate-500">{delta}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ThinBarExample() {
  const total = SAMPLE_PAYMENT_METHODS.reduce((sum, item) => sum + item.value, 0);
  return (
    <div>
      <StackedBar size="thin" ariaLabel="Orders by payment method" segments={SAMPLE_PAYMENT_METHODS} />
      <ul className="mt-4 divide-y divide-line">
        {SAMPLE_PAYMENT_METHODS.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2.5 py-2 text-sm">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: CATEGORICAL[index] }}
            />
            <span className="flex-1 text-slate-700">{item.label}</span>
            <span className="font-medium tabular-nums text-slate-900">{item.value}</span>
            <span className="w-11 text-right text-xs tabular-nums text-slate-500">
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaletteSection() {
  const swatch = (hex: string) => `${contrastRatio(hex, '#FFFFFF').toFixed(2)}:1`;
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-xs" aria-labelledby="palette-title">
      <h2 id="palette-title" className="font-display text-lg font-bold text-slate-900">
        Palette
      </h2>
      <p className="text-sm text-slate-600">
        Categorical slots in fixed order (validated: adjacent CVD ΔE ≥ 20.6, normal ΔE ≥ 29.3 on white). Never
        cycled; a 9th series folds into Other.
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {CATEGORICAL.map((hex, index) => (
          <li key={hex} className="min-w-0">
            <span className="block h-10 rounded-md" style={{ backgroundColor: hex }} />
            <span className="mt-1.5 block text-xs font-medium text-slate-900">
              {index + 1}. {CATEGORICAL_NAMES[index]}
            </span>
            <span className="block font-mono text-2xs text-slate-500">
              {hex} · {swatch(hex)}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ordinal ramps (brand blue)
          </h3>
          <div className="mt-2 space-y-1.5">
            {[2, 3, 4, 5, 6].map((steps) => (
              <div key={steps} className="flex items-center gap-2">
                <span className="w-4 text-2xs tabular-nums text-slate-500">{steps}</span>
                <div className="flex flex-1 gap-0.5">
                  {ordinalRamp(steps).map((hex) => (
                    <span key={hex} className="h-4 flex-1 rounded-[3px]" style={{ backgroundColor: hex }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status (reserved)</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {Object.entries(STATUS).map(([name, hex]) => (
              <li key={name} className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ backgroundColor: hex }} />
                <span className="capitalize">{name}</span>
                <span className="font-mono text-2xs text-slate-500">{hex}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-2xs text-slate-500">
            Only when a series means a state; always with icon + label.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Neutral</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-[3px]" style={{ backgroundColor: NEUTRAL.other }} />
              Other <span className="font-mono text-2xs text-slate-500">{NEUTRAL.other}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: NEUTRAL.deEmphasis }} />
              De-emphasis <span className="font-mono text-2xs text-slate-500">{NEUTRAL.deEmphasis}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
