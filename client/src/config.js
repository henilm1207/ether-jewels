// Central storefront config — single source of truth.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

export const FREE_SHIPPING_THRESHOLD = 1000;

export const CONTACT = {
  phone: '+91 9725756046',
  phoneHref: 'tel:+919725756046',
  email: 'etherstarjewels@gmail.com',
  whatsapp: '+91 9725756046',
  address: 'Surat, Gujarat',
};
