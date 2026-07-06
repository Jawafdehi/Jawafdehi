/**
 * Formats a number using Indian numbering system (lakhs and crores)
 * Example: 86987106 -> "8,69,87,106"
 * 
 * @param value - The number to format
 * @returns Formatted string with Indian number grouping
 */
export function formatIndianNumber(value: number): string {
  if (value === 0) return "0";
  
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // Convert to string and split into integer and decimal parts
  const parts = absValue.toString().split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Indian numbering: last 3 digits, then groups of 2
  let formatted = "";
  
  if (integerPart.length <= 3) {
    formatted = integerPart;
  } else {
    // Get last 3 digits
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    
    // Group remaining digits by 2 from right to left
    const groups: string[] = [];
    for (let i = remaining.length; i > 0; i -= 2) {
      const start = Math.max(0, i - 2);
      groups.unshift(remaining.slice(start, i));
    }
    
    formatted = groups.join(",") + "," + lastThree;
  }
  
  // Add decimal part if exists
  if (decimalPart) {
    formatted += "." + decimalPart;
  }
  
  return isNegative ? "-" + formatted : formatted;
}

/**
 * Formats currency amount in NPR with Indian numbering system
 * Example: 86987106 -> "NRs. 8,69,87,106"
 * 
 * @param value - The amount to format
 * @param includeDecimals - Whether to include decimal places (default: false)
 * @returns Formatted currency string
 */
export function formatNPR(value: number, includeDecimals: boolean = false): string {
  const formatted = formatIndianNumber(includeDecimals ? value : Math.round(value));
  return `NRs. ${formatted}`;
}

/**
 * Formats large NPR amounts using Nepali numeric units (Lakh, Crore, Arab, Kharab).
 * Example: 24_940_110         -> "Rs 2.49 Crore"
 * Example: 3_620_000_000      -> "Rs 3.62 Arab"
 * Example: 250_000_000_000    -> "Rs 2.50 Kharab"
 */
export function formatBigo(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || amount === 0) return "Rs 0";

  const absAmount = Math.abs(amount);
  const prefix = amount < 0 ? "-" : "";

  if (absAmount >= 100_000_000_000) {
    return `${prefix}Rs ${(absAmount / 100_000_000_000).toFixed(2)} Kharab`;
  }
  if (absAmount >= 1_000_000_000) {
    return `${prefix}Rs ${(absAmount / 1_000_000_000).toFixed(2)} Arab`;
  }
  if (absAmount >= 10_000_000) {
    return `${prefix}Rs ${(absAmount / 10_000_000).toFixed(2)} Crore`;
  }
  if (absAmount >= 100_000) {
    return `${prefix}Rs ${(absAmount / 100_000).toFixed(2)} Lakh`;
  }

  return `${prefix}Rs ${formatIndianNumber(absAmount)}`;
}

/**
 * Formats the raw string of a numeric amount input with Indian (lakh/crore)
 * digit grouping for display, without going through Number — so arbitrarily
 * large amounts keep full precision and partial input ("1250000.", "12.5")
 * survives as typed. Anything that isn't a plain non-negative decimal number is
 * returned unchanged (the field's own validation flags it).
 * Example: "86987106" -> "8,69,87,106"
 */
export function formatAmountInput(raw: string): string {
  if (!raw) return "";
  const m = /^(\d+)(\.\d*)?$/.exec(raw);
  if (!m) return raw;
  const [, intPart, fracPart] = m;

  let grouped: string;
  if (intPart.length <= 3) {
    grouped = intPart;
  } else {
    const lastThree = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    const groups: string[] = [lastThree];
    while (remaining.length > 2) {
      groups.unshift(remaining.slice(-2));
      remaining = remaining.slice(0, -2);
    }
    groups.unshift(remaining);
    grouped = groups.join(",");
  }
  return fracPart ? grouped + fracPart : grouped;
}

/**
 * Inverse of formatAmountInput for change events: strips the grouping commas
 * (and stray spaces) so the state/API value stays a plain number string.
 */
export function stripAmountFormatting(display: string): string {
  return display.replace(/[,\s]/g, "");
}
