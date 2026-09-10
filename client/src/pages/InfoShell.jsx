export default function InfoShell({ title, eyebrow = 'MITVA JEWELS', children }) {
  return (
    <section className="py-10 md:py-14">
      <div className="container" style={{ maxWidth: '880px' }}>
        <div style={{ paddingBottom: '40px' }}>
          <p className="text-subheading" style={{ marginBottom: '12px' }}>{eyebrow}</p>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
            {title}
          </h1>
        </div>
        <div className="info-body" style={{ fontSize: '15px', lineHeight: 1.7, color: '#444' }}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function InfoH({ children }) {
  return (
    <h2 className="font-heading" style={{ fontSize: '22px', marginTop: '32px' }}>
      {children}
    </h2>
  );
}

export function InfoP({ children }) {
  return <p style={{ marginBottom: '16px' }}>{children}</p>;
}
