import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import type { CourtCaseOrder, CourtCaseOrderKind } from "@/types/jds";
import { materialTail } from "@/services/datalake-api";
import { convertToBS, formatDate } from "@/utils/date";
import { formatBSString } from "@/utils/bs-calendar";

const MATERIAL_MARKER = "/material/";

const KIND_LABELS: Record<CourtCaseOrderKind, { key: string; fallback: string }> = {
  judgment: { key: "courtCaseProfile.orders.kind.judgment", fallback: "Judgment" },
  order: { key: "courtCaseProfile.orders.kind.order", fallback: "Order" },
  interim: { key: "courtCaseProfile.orders.kind.interim", fallback: "Interim order" },
  unknown: { key: "courtCaseProfile.orders.kind.unknown", fallback: "Court order" },
};

function kindLabel(kind: string) {
  return Object.prototype.hasOwnProperty.call(KIND_LABELS, kind)
    ? KIND_LABELS[kind as CourtCaseOrderKind]
    : KIND_LABELS.unknown;
}

/**
 * The order's date, Nepal-first like the activity timeline: the BS date the
 * court wrote, else one converted from the AD date, else the AD date itself.
 */
function orderDate(order: CourtCaseOrder): string | null {
  return (
    formatBSString(order.order_date_bs) ||
    (order.order_date_ad ? convertToBS(order.order_date_ad)?.formatted : null) ||
    (order.order_date_ad ? formatDate(order.order_date_ad, "PP") : null) ||
    null
  );
}

/** The same-origin order page, or null when the IRI is not a material IRI. */
function orderPath(iri: string): string | null {
  return iri.includes(MATERIAL_MARKER) ? `/material/${materialTail(iri)}` : null;
}

export interface CourtCaseOrdersProps {
  /** Absent on an API older than JAW-76; treated as no orders. */
  orders?: CourtCaseOrder[] | null;
}

/**
 * "Court orders (N)": the orders this court case references, each as kind and
 * date with a link to its existing material page. No title is shown — an
 * order's title names the parties. Renders nothing when there are no orders.
 */
export function CourtCaseOrders({ orders }: Readonly<CourtCaseOrdersProps>) {
  const { t } = useTranslation();
  const list = Array.isArray(orders) ? orders : [];
  if (list.length === 0) return null;

  return (
    <section id="orders" aria-labelledby="orders-heading" className="scroll-mt-28">
      <h2
        id="orders-heading"
        className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        {t("courtCaseProfile.orders.heading", {
          count: list.length,
          defaultValue: `Court orders (${list.length})`,
        })}
      </h2>

      <ul className="mt-7 divide-y divide-border/60" data-testid="court-case-orders">
        {list.map((order, idx) => {
          const label = kindLabel(order.kind);
          const date = orderDate(order);
          const path = order.readable ? orderPath(order.iri) : null;
          return (
            <li
              key={`${order.iri}-${idx}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-3 text-base sm:text-lg"
            >
              <span className="font-semibold text-foreground">{t(label.key, label.fallback)}</span>
              <span className="text-muted-foreground" aria-hidden="true">·</span>
              <span className="text-foreground">
                {date ?? t("courtCaseProfile.orders.undated", "Date not recorded")}
              </span>
              <span className="text-muted-foreground" aria-hidden="true">·</span>
              {path ? (
                <Link
                  to={path}
                  className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-primary/75 hover:decoration-primary"
                >
                  <span>{t("courtCaseProfile.orders.read", "Read")}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground sm:text-base">
                  {t("courtCaseProfile.orders.notReadable", "Text not available yet")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
