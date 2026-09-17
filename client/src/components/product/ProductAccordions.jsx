import { useState } from 'react';
import { Link } from 'react-router-dom';

// PDP info-column accordions (mitvajewels-style): DESCRIPTION (spec table),
// MAKE YOUR OWN (bespoke funnel), TALK TO OUR EXPERTS (contact).
// Multiple panels can stay open; headers are touch-sized and keyboard
// operable; expand/collapse animates via grid-rows (no JS measuring,
// responsive at any column width).
function Item({ id, title, open, onToggle, children }) {
  return (
    <div style={{ borderBottom: '1px solid #ededed' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between text-left cursor-pointer"
        style={{ minHeight: '52px', padding: '14px 0', gap: '12px' }}
      >
        <span className="text-[13px] font-medium uppercase" style={{ letterSpacing: '1.5px' }}>
          {title}
        </span>
        <span aria-hidden="true" style={{ fontSize: '20px', lineHeight: 1, fontWeight: 300 }}>
          {open ? '−' : '+'}
        </span>
      </button>
      <div
        id={id}
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ paddingBottom: '22px' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProductAccordions({ product }) {
  const [open, setOpen] = useState({ description: false, make: false, experts: false });
  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div style={{ marginTop: '8px', borderTop: '1px solid #ededed' }}>
      <Item
        id="pdp-acc-description"
        title="Description"
        open={open.description}
        onToggle={() => toggle('description')}
      >
        {product.description && (
          <p className="text-gray-600 leading-relaxed text-[15px]" style={{ marginBottom: '16px' }}>
            {product.description}
          </p>
        )}
        <table className="w-full text-[15px]">
          <tbody>
            {product.styleCode && (
              <tr className="border-b border-[#ededed]">
                <td className="py-3 pr-4 text-gray-500 w-1/2">Style</td>
                <td className="py-3 font-medium">{product.styleCode}</td>
              </tr>
            )}
            {(product.diamondColors || []).length > 0 && (
              <tr className="border-b border-[#ededed]">
                <td className="py-3 pr-4 text-gray-500">Diamond Color</td>
                <td className="py-3 font-medium">{product.diamondColors.join(', ')}</td>
              </tr>
            )}
            {(product.clarity || []).length > 0 && (
              <tr className="border-b border-[#ededed]">
                <td className="py-3 pr-4 text-gray-500">Clarity</td>
                <td className="py-3 font-medium">{product.clarity.join(', ')}</td>
              </tr>
            )}
            {(product.details?.fancyDiamonds || []).length > 0 && (
              <tr className="border-b border-[#ededed]">
                <td className="py-3 pr-4 text-gray-500">Fancy Diamond{product.details.fancyDiamonds.length > 1 ? 's' : ''}</td>
                <td className="py-3 font-medium">
                  {product.details.fancyDiamonds.map((fd) => `${fd.caratWeight}ct ${fd.shape}, ${fd.color}`).join('; ')}
                </td>
              </tr>
            )}
            <tr className="border-b border-[#ededed]">
              <td className="py-3 pr-4 text-gray-500">Certified Side Stone</td>
              <td className="py-3 font-medium">{product.details?.sideStoneCertified ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 text-gray-500">Delivery Period</td>
              <td className="py-3 font-medium">
                {product.details?.deliveryDays != null && product.details.deliveryDays > 0
                  ? `Within ${product.details.deliveryDays} Days`
                  : 'Within 30 Days'}
              </td>
            </tr>
          </tbody>
        </table>
      </Item>

      <Item
        id="pdp-acc-make"
        title="Make Your Own"
        open={open.make}
        onToggle={() => toggle('make')}
      >
        <p className="text-gray-600 leading-relaxed text-[15px]" style={{ marginBottom: '16px' }}>
          Want this piece your way? Share your shape, metal and size ideas and
          we&apos;ll handcraft it to order and ship it certified.
        </p>
        <Link to="/pages/contact" className="btn btn--secondary">
          Request custom design
        </Link>
      </Item>

      <Item
        id="pdp-acc-experts"
        title="Talk To Our Experts"
        open={open.experts}
        onToggle={() => toggle('experts')}
      >
        <p className="text-gray-600 leading-relaxed text-[15px]" style={{ marginBottom: '12px' }}>
          Buying jewellery is a big decision. Our diamond experts are here to
          help — get free 1-on-1 advice on:
        </p>
        <ul className="text-gray-600 text-[15px] space-y-1" style={{ marginBottom: '16px' }}>
          <li>– Choosing the perfect diamond</li>
          <li>– Selecting your setting and metal</li>
          <li>– Custom design ideas</li>
        </ul>
        <div className="flex flex-col sm:flex-row gap-3" style={{ marginBottom: '12px' }}>
          <a
            href="https://wa.me/919725756046"
            target="_blank"
            rel="noreferrer"
            className="btn btn--primary text-center"
          >
            WhatsApp: +91 9725756046
          </a>
          <a href="mailto:etherstarjewels@gmail.com" className="btn btn--secondary text-center">
            Email us
          </a>
        </div>
        <p className="text-[13px] text-gray-500">We reply within 24 hours. WhatsApp is fastest.</p>
      </Item>
    </div>
  );
}
