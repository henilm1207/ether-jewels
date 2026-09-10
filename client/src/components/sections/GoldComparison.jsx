import { useState, useRef } from 'react';

export default function GoldComparison() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e) => { if (isDragging.current) handleMove(e.clientX); };
  const handleTouchMove = (e) => { handleMove(e.touches[0].clientX); };

  return (
    <section className="section-padding-lg bg-white">
      <div className="container">
        <div className="flex flex-col md:flex-row gap-10 lg:gap-16 items-center">
          {/* Slider */}
          <div
            ref={containerRef}
            className="w-full md:w-1/2 relative aspect-square overflow-hidden cursor-ew-resize select-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* White Gold (full background) */}
            <img
              src="/images/gold-white.jpg"
              alt="White Gold"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Yellow Gold (clipped) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src="/images/gold-yellow.jpg"
                alt="Yellow Gold"
                className="absolute inset-0 h-full object-cover"
                style={{ width: containerRef.current?.offsetWidth || '100vw' }}
              />
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white z-10"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-white rounded-sm shadow-lg flex items-center justify-center cursor-ew-resize">
                <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
                  <path d="M4 10L1 7M4 10L1 13M8 10L11 7M8 10L11 13" stroke="#222" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Labels at bottom */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4 z-10">
              <span
                className="bg-white px-3 py-1 text-xs font-medium"
                style={{ letterSpacing: '1px' }}
              >
                Yellow Gold
              </span>
              <span
                className="bg-white px-3 py-1 text-xs font-medium"
                style={{ letterSpacing: '1px' }}
              >
                White Gold
              </span>
            </div>
          </div>

          {/* Text Content */}
          <div className="w-full md:w-1/2 text-center md:text-left md:pl-2">
            <p className="text-subheading mb-3 animate-fade-in-up delay-0">
              Compare
            </p>
            <h2
              className="font-heading mb-4 animate-fade-in-up delay-50"
              style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', letterSpacing: '1px', lineHeight: 1.2 }}
            >
              Yellow Gold or White Gold
            </h2>
            <p className="text-gray-600 leading-relaxed animate-fade-in-up delay-100 max-w-md mx-auto md:mx-0" style={{ fontSize: '15px' }}>
              Slide to explore the subtle contrast between warm yellow gold and luminous white gold.
              Two tones. One timeless design.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
