export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
}

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

export type Theme = 'dark' | 'light' | 'system';
