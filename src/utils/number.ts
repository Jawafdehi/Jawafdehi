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
