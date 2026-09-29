/**
 * Standardized color system across all charts in the dashboard.
 * Enforces visual consistency:
 * - Revenue / Primary: Electric Blue (#2563eb)
 * - Orders: Clean Teal (#0d9488)
 * - Customers: Violet / Purple (#6366f1)
 * - Quantity / AOV: Warm Amber (#f59e0b)
 * - Positive / Rating: Emerald (#10b981)
 * - Warning / Cancellation: Rose (#f43f5e)
 */
export const CHART_COLORS = {
  primary: '#2563eb',
  revenue: '#2563eb',
  revenueLight: '#93c5fd',
  orders: '#0d9488',
  ordersLight: '#99f6e4',
  customers: '#6366f1',
  customersLight: '#c7d2fe',
  purple: '#8b5cf6',
  aov: '#f59e0b',
  rating: '#10b981',
  danger: '#f43f5e',
  slate: '#64748b',
};

// Cohesive categorical color palette for multi-slice donuts & bar charts
export const CATEGORY_PALETTE = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#64748b', // Slate
  '#14b8a6', // Light Teal
  '#3b82f6', // Light Blue
];
