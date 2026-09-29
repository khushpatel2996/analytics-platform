/**
 * Formats a numeric value into Indian Rupee (INR) currency representation.
 * Supports compact formatting (Lakhs 'L' and Crores 'Cr').
 */
export function formatINR(val: number | null | undefined, compact = false): string {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  
  if (compact) {
    const absVal = Math.abs(val);
    if (absVal >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    if (absVal >= 1000) {
      return `₹${(val / 1000).toFixed(1)} k`;
    }
  }

  return `₹${val.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
  })}`;
}

/**
 * Formats numbers according to the Indian grouping system (lakhs & crores).
 */
export function formatNumber(val: number | null | undefined, compact = false): string {
  if (val === null || val === undefined || isNaN(val)) return '0';

  if (compact) {
    const absVal = Math.abs(val);
    if (absVal >= 10000000) {
      return `${(val / 10000000).toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      return `${(val / 100000).toFixed(2)} L`;
    }
    if (absVal >= 1000) {
      return `${(val / 1000).toFixed(1)} k`;
    }
  }

  return val.toLocaleString('en-IN');
}

/**
 * Formats a value as percentage string.
 */
export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  return `${val.toFixed(decimals)}%`;
}

/**
 * Cleans snake_case and makes strings Title Case.
 */
export function formatLabel(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats byte counts into human-readable units (B, KB, MB, GB).
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
