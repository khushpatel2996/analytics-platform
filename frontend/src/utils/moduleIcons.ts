import {
  BarChart3,
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  PieChart,
  MapPin,
  CreditCard,
  DollarSign,
  GraduationCap,
  CalendarCheck,
  Building,
  Star,
  Lightbulb,
  Award,
  Network,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import React from 'react';

/**
 * Resolves dynamic module icon string from backend to a Lucide icon component.
 */
export function resolveModuleIcon(iconName?: string): React.ComponentType<{ className?: string }> {
  if (!iconName) return BarChart3;
  const lower = iconName.toLowerCase().replace(/_/g, '-');
  switch (lower) {
    case 'layout-dashboard':
    case 'overview':
    case 'dashboard':
      return LayoutDashboard;
    case 'trending-up':
    case 'trends':
    case 'sales-trends':
    case 'performance-trends':
      return TrendingUp;
    case 'package':
    case 'products':
    case 'inventory':
      return Package;
    case 'users':
    case 'customers':
    case 'students':
    case 'employees':
    case 'people':
      return Users;
    case 'pie-chart':
    case 'categories':
    case 'departments':
    case 'segments':
      return PieChart;
    case 'map-pin':
    case 'geography':
    case 'locations':
    case 'cities':
    case 'states':
      return MapPin;
    case 'credit-card':
    case 'payments':
    case 'finance':
      return CreditCard;
    case 'dollar-sign':
    case 'salary':
    case 'compensation':
    case 'revenue':
      return DollarSign;
    case 'graduation-cap':
    case 'academic-performance':
    case 'academics':
      return GraduationCap;
    case 'calendar-check':
    case 'attendance':
      return CalendarCheck;
    case 'building':
    case 'departments-office':
      return Building;
    case 'star':
    case 'reviews':
    case 'ratings':
      return Star;
    case 'lightbulb':
    case 'insights':
      return Lightbulb;
    case 'award':
    case 'rankings':
      return Award;
    case 'network':
    case 'correlations':
      return Network;
    case 'alert-triangle':
    case 'alert-circle':
    case 'outliers':
    case 'unusual-values':
      return AlertTriangle;
    case 'shield-check':
    case 'data-quality':
    case 'quality':
      return ShieldCheck;
    default:
      return BarChart3;
  }
}
