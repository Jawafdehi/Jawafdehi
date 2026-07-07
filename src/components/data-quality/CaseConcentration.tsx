import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CaseConcentrationItem } from "@/lib/data-quality-mock";
import { MONO_STACK } from "@/lib/data-quality";

/**
 * "Where the cases cluster" — the documented cases ranked by the office / sector
 * they touch. Single-hue magnitude bars (length is the encoding; one accent
 * hue, no legend needed). Turns an abstract "184k entities" into an answerable
 * question: which offices show up most.
 *
 * POC-only — the API doesn't expose this cut yet; fed from mock insights.
 */
export function CaseConcentration({ items }: { items: CaseConcentrationItem[] }) {
  const { t } = useTranslation();
  const data = [...items].sort((a, b) => b.count - a.count);
  const max = data[0]?.count ?? 0;

  return (
    <section>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.concentration.heading", "Where the cases cluster")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.concentration.description",
          "The offices and agencies named most often across documented cases.",
        )}
      </p>

      <div className="mt-6 w-full" style={{ height: data.length * 44 + 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 56, bottom: 4, left: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={210}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
              formatter={(value: number) => [
                value.toLocaleString(),
                t("dataQuality.concentration.tooltip", "Documented cases"),
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 13,
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.label} fill="hsl(var(--accent))" />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v: number) => v.toLocaleString()}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fill: "hsl(var(--foreground))",
                  fontFamily: MONO_STACK,
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs italic text-muted-foreground">
        {t(
          "dataQuality.concentration.note",
          "Illustrative sample for this preview. Office-level breakdowns are being wired to live data.",
        )}
      </p>
    </section>
  );
}
