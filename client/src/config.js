// Central storefront config — single source of truth.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

export const FREE_SHIPPING_THRESHOLD = 1000;

export const CONTACT = {
  phone: '+971 58 606 2080',
  phoneHref: 'tel:+971586062080',
  email: 'etherstarjewels@gmail.com',
  whatsapp: '+91 9725756046',
  address: 'Dubai, UAE',
};
