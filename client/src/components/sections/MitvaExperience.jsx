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
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-12">
          <p className="text-subheading text-gray-500 mb-2">
            THE MITVA EXPERIENCE
          </p>
          <h1
            className="font-heading"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '1px', lineHeight: 1.2 }}
          >
            Made To Be<br />
            Adorned, Loved, Be<br />
            Remembered
          </h1>
        </div>

        {/* Content: Image Left, Accordion Right */}
        <div className="flex flex-col md:flex-row items-center gap-0">
          {/* Image */}
          <div className="w-full md:w-1/2 aspect-square bg-[#f7f2ef] overflow-hidden">
            <img
              src={tabs[activeTab].image}
              alt={tabs[activeTab].title}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
          </div>

          {/* Accordion */}
          <div className="w-full md:w-1/2">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className="border-b border-[#ededed]"
              >
                <button
                  onClick={() => setActiveTab(index)}
                  className="w-full flex items-baseline gap-3 py-5 text-left"
                >
                  <span
                    className="text-gray-400"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    {tab.id}.
                  </span>
                  <span
                    className={`transition-colors duration-300 ${
                      activeTab === index ? 'text-[#222]' : 'text-gray-400'
                    }`}
                    style={{
                      fontSize: 'clamp(1rem, 2vw, 1.375rem)',
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 400,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    {tab.title}
                  </span>
                </button>
                {activeTab === index && (
                  <div className="pl-8 pb-5 pr-6 animate-fade-in">
                    <p className="text-gray-600 leading-relaxed text-[15px]">
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
