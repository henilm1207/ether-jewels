import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetch } from '../../components/admin/api';
import { PageHead, Card, ErrorMsg } from '../../components/admin/ui';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [productStats, setProductStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [products, orderStats, inquiries, prodStats] = await Promise.all([
          adminFetch('/api/products/admin/all?limit=1'),
          adminFetch('/api/orders/admin/stats'),
          adminFetch('/api/inquiries?limit=100'),
          adminFetch('/api/products/admin/stats'),
        ]);
        if (live) {
          setStats({
            products: products.total,
            revenue: orderStats.revenue,
            aov: orderStats.aov,
            pendingOrders: orderStats.byStatus?.pending || 0,
            newInquiries: inquiries.filter((i) => i.status === 'new').length,
          });
          setProductStats(prodStats);
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
        { label: 'Revenue (paid)', value: `$${Number(stats.revenue).toFixed(0)}`, to: '/admin/orders' },
        { label: 'Avg order value', value: `$${Number(stats.aov).toFixed(0)}`, to: '/admin/orders' },
        { label: 'Orders (pending)', value: stats.pendingOrders, to: '/admin/orders' },
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card>
              <p className="text-xs uppercase tracking-wider text-gray-500">{c.label}</p>
              <p className="font-heading" style={{ fontSize: '2rem' }}>{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {productStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <Card>
            <p className="font-medium text-sm mb-2">Low stock ({productStats.lowStock.length})</p>
            {productStats.lowStock.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing below the low-stock line.</p>
            ) : (
              <ul className="space-y-1">
                {productStats.lowStock.slice(0, 8).map((p) => (
                  <li key={p._id} className="flex justify-between text-sm">
                    <Link to={`/admin/products/${p._id}`} className="underline truncate mr-2">{p.name}</Link>
                    <span className="text-gray-500 flex-shrink-0">{p.stockQty} left</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Link to="/admin/products?stale=true">
            <Card>
              <p className="font-medium text-sm mb-1">Stale pricing</p>
              <p className="font-heading" style={{ fontSize: '2rem' }}>{productStats.staleCount}</p>
              <p className="text-sm text-gray-500">Auto-priced products under a since-changed gold/diamond rate.</p>
            </Card>
          </Link>
          <div className="grid grid-cols-1 gap-4">
            <Link to="/admin/products?missingSeo=true">
              <Card>
                <p className="text-sm">Missing SEO title/description: <span className="font-medium">{productStats.missingSeoCount}</span></p>
              </Card>
            </Link>
            <Link to="/admin/products?missingCert=true">
              <Card>
                <p className="text-sm">Missing certification: <span className="font-medium">{productStats.missingCertCount}</span></p>
              </Card>
            </Link>
          </div>
        </div>
      )}

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
