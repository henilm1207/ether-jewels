import { useState } from 'react';

const tabs = [
  {
    id: '01',
    title: 'Crafted In-House',
    description: 'Every piece is developed and finished under one roof, ensuring precision at every stage.',
    image: '/images/experience-1.png',
  },
  {
    id: '02',
    title: 'Designed To Last',
    description: 'Balanced proportions, secure settings, and refined detailing for everyday confidence.',
    image: '/images/experience-2.png',
  },
  {
    id: '03',
    title: 'Modern Brilliance',
    description: 'From fine gold jewellery to luminous diamonds, created for timeless presence.',
    image: '/images/experience-3.png',
  },
];

export default function MitvaExperience() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="section-padding-lg bg-white">
      <div className="container">
        {/* Section Header — live: 38/42px, 1.1 line-height */}
        <div className="text-center mb-10 md:mb-14">
          <p className="text-subheading mb-3">
            THE MITVA EXPERIENCE
          </p>
          <h2
            className="font-heading"
            style={{ fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '2.5px', lineHeight: 1.1 }}
          >
            Made To Be<br />
            Adorned, Loved, Be<br />
            Remembered
          </h2>
        </div>

        {/* Content: Image Left, Accordion Right */}
        <div className="flex flex-col md:flex-row items-stretch gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Image — live: 4/5 ratio, no beige bg */}
          <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden">
            <img
              key={tabs[activeTab].image}
              src={tabs[activeTab].image}
              alt={tabs[activeTab].title}
              loading="lazy"
              className="w-full h-full object-cover animate-fade-in"
            />
          </div>

          {/* Accordion — tall rows, active near-black */}
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className={`border-t border-[#E8E8E8] last:border-b transition-colors ${
                  activeTab === index ? 'border-black' : ''
                }`}
              >
                <button
                  onClick={() => setActiveTab(index)}
                  className="w-full flex items-baseline gap-4 py-6 md:py-8 text-left"
                >
                  <span
                    className="text-gray-400"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    {tab.id}.
                  </span>
                  <span
                    className={`transition-colors duration-300 ${
                      activeTab === index ? 'text-[#111]' : 'text-gray-400'
                    }`}
                    style={{
                      fontSize: 'clamp(1rem, 2vw, 1.375rem)',
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 400,
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                    }}
                  >
                    {tab.title}
                  </span>
                </button>
                {activeTab === index && (
                  <div className="pl-8 pb-6 pr-6 animate-fade-in">
                    <p className="leading-relaxed max-w-[420px]" style={{ fontSize: '15px', lineHeight: 1.7, color: '#666' }}>
                      {tab.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
