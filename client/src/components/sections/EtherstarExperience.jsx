import { useState } from 'react';

const tabs = [
  {
    id: '01',
    title: 'Crafted In-House',
    description: 'Every piece is developed and finished under one roof, ensuring precision at every stage.',
    image: '/images/experience-1.webp',
  },
  {
    id: '02',
    title: 'Designed To Last',
    description: 'Balanced proportions, secure settings, and refined detailing for everyday confidence.',
    image: '/images/experience-2.webp',
  },
  {
    id: '03',
    title: 'Modern Brilliance',
    description: 'From fine gold jewellery to luminous diamonds, created for timeless presence.',
    image: '/images/experience-3.webp',
  },
];

// Live: h2 with h1 class (40px desktop / 32 mobile)
function SectionHeader({ className = '' }) {
  return (
    <div className={className}>
      <p className="section__subheading">
        THE ETHER EXPERIENCE
      </p>
      <h2
        className="font-heading exp-title"
        style={{ marginBottom: 0 }}
      >
        Made To Be<br />
        Adorned, Loved, Be<br />
        Remembered
      </h2>
    </div>
  );
}

export default function EtherstarExperience() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="exp-pad bg-white">
      <div className="container-fluid">
        {/* Mobile header — text-left above image */}
        <div className="md:hidden text-left" style={{ paddingBottom: '32px' }}>
          <SectionHeader />
        </div>

        {/* Live: collection-tabs image-right, column gap 2.2rem → 5rem → 10rem */}
        <div className="flex flex-col lg:flex-row lg:flex-row-reverse items-stretch exp-grid">
          {/* Images — square stacked, active fades in */}
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-square overflow-hidden">
              {tabs.map((tab, index) => (
                <img
                  key={tab.image}
                  src={tab.image}
                  alt={tab.title}
                  loading="lazy"
                  aria-hidden={activeTab === index ? undefined : true}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                  style={{ opacity: activeTab === index ? 1 : 0 }}
                />
              ))}
            </div>
          </div>

          {/* Content column */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center">
            {/* Desktop header inside content column */}
            <div className="hidden md:block text-left" style={{ paddingBottom: '30px' }}>
              <p className="section__subheading">
                THE ETHER EXPERIENCE
              </p>
              <h2 className="font-heading exp-title" style={{ marginBottom: 0 }}>
                Made To Be<br />
                Adorned, Loved, Be<br />
                Remembered
              </h2>
            </div>

            {/* Tabs — live collapsible rhythm, hover trigger */}
            <div>
              {tabs.map((tab, index) => {
                const isActive = activeTab === index;
                return (
                  <div
                    key={tab.id}
                    className="relative border-b border-[#ededed]"
                    style={{ padding: index === 0 ? '0 0 20px' : '20px 0' }}
                    onMouseEnter={() => setActiveTab(index)}
                  >
                    <button
                      onClick={() => setActiveTab(index)}
                      aria-expanded={isActive}
                      className="relative w-full flex items-center text-left"
                      style={{ minHeight: '60px', padding: '10px 50px 10px 0' }}
                    >
                      <span
                        className="text-gray-400 flex-shrink-0"
                        style={{ fontSize: '14px', fontWeight: 500, minWidth: '28px', margin: '0 12px 0 0' }}
                      >
                        {tab.id}.
                      </span>
                      <span
                        className="font-heading exp-tab-title transition-colors duration-300"
                        style={{ color: isActive ? '#111' : '#9a9a9a' }}
                      >
                        {tab.title}
                      </span>
                      {/* Circular arrow — live collection-tab__link */}
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 -translate-y-1/2 rounded-full items-center justify-center hidden sm:inline-flex"
                        style={{
                          right: 0,
                          width: '40px',
                          height: '40px',
                          border: '1px solid rgba(34,34,34,0.2)',
                          opacity: isActive ? 1 : 0.45,
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3.75 9H14.25" />
                          <path d="M9 3.75L14.25 9L9 14.25" />
                        </svg>
                      </span>
                    </button>
                    {isActive && (
                      <div className="animate-fade-in" style={{ padding: '0 50px 10px 40px' }}>
                        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#666' }}>
                          {tab.description}
                        </p>
                      </div>
                    )}
                    {/* Base + active row line — live 1px at row bottom */}
                    <span aria-hidden="true" className="absolute bottom-0 left-0 h-[1px] w-full bg-[#222]" style={{ opacity: 0.2 }} />
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 h-[1px] bg-[#222] transition-all duration-500"
                      style={{ width: isActive ? '100%' : '0%' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .exp-pad { padding: 40px 0; }
        .exp-grid { gap: 22px; }
        .exp-title { font-size: 32px; line-height: 1.2; }
        .exp-tab-title { font-size: 17.6px; }
        @media (min-width: 768px) { .exp-pad { padding: 70px 0; } .exp-grid { gap: 50px; } }
        @media (min-width: 1024px) { .exp-title { font-size: 40px; } .exp-tab-title { font-size: 22px; } }
        @media (min-width: 1280px) { .exp-grid { gap: 100px; } }
      `}</style>
    </section>
  );
}
