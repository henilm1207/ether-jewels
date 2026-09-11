import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Card, ErrorMsg } from '../../components/admin/ui';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [products, orders, inquiries] = await Promise.all([
          adminFetch('/api/products/admin/all?limit=1'),
          adminFetch('/api/orders?limit=100'),
          adminFetch('/api/inquiries?limit=100'),
        ]);
        if (live) {
          setStats({
            products: products.total,
            pendingOrders: orders.filter((o) => o.status === 'pending').length,
            orders: orders.length,
            newInquiries: inquiries.filter((i) => i.status === 'new').length,
          });
        }
      } catch (e) {
        if (live) setError(e.message);
      }
    })();
    return () => { live = false; };
  }, []);

  const cards = stats
    ? [
        { label: 'Products', value: stats.products, to: '/admin/products' },
        { label: 'Orders (pending)', value: stats.pendingOrders, to: '/admin/orders' },
        { label: 'Orders (total)', value: stats.orders, to: '/admin/orders' },
        { label: 'New inquiries', value: stats.newInquiries, to: '/admin/inquiries' },
      ]
    : [];

  return (
    <div>
      <PageHead
        title="Dashboard"
        sub="Store overview — Ether admin"
        action={<Link to="/admin/products/new" className="btn btn--primary text-sm">+ New product</Link>}
      />
      <ErrorMsg error={error} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card>
              <p className="text-xs uppercase tracking-wider text-gray-500">{c.label}</p>
              <p className="font-heading" style={{ fontSize: '2rem' }}>{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {[
          { t: 'Orders needing action', d: 'Confirm pending orders and move them through making → shipped → delivered.', to: '/admin/orders' },
          { t: 'Reviews to moderate', d: 'Approve genuine reviews — approval recalculates the product rating.', to: '/admin/reviews' },
          { t: 'Messages to answer', d: 'Contact and custom-design inquiries from the storefront form.', to: '/admin/inquiries' },
        ].map((x) => (
          <Link key={x.t} to={x.to}>
            <Card>
              <p className="font-medium text-sm mb-1">{x.t}</p>
              <p className="text-sm text-gray-500">{x.d}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
