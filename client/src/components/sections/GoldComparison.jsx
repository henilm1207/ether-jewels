import { useState, useRef, useCallback } from 'react';

export default function GoldComparison() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    handleMove(e.clientX);
  };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e) => { if (isDragging.current) handleMove(e.clientX); };
  const handleTouchMove = (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };
  const handleClick = (e) => handleMove(e.clientX);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setSliderPos((p) => Math.max(0, p - 4));
    if (e.key === 'ArrowRight') setSliderPos((p) => Math.min(100, p + 4));
  };

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
            onClick={handleClick}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            role="slider"
            aria-label="Compare yellow gold and white gold"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPos)}
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            {/* White Gold (full background) */}
            <img
              src="/images/gold-white.jpg"
              alt="White Gold"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />

            {/* Yellow Gold (clipped) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src="/images/gold-yellow.jpg"
                alt="Yellow Gold"
                loading="lazy"
                className="absolute inset-0 h-full object-cover"
                style={{ width: containerRef.current?.offsetWidth || '100vw' }}
                draggable={false}
              />
            </div>

            {/* Slider Handle — 44px circle like live */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white z-10"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize">
                <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                  <path d="M6 1L1 6L6 11M14 1L19 6L14 11" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Labels at bottom corners — frosted, tracked */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4 z-10 pointer-events-none">
              <span
                className="bg-white/90 backdrop-blur px-3 py-2 font-medium uppercase"
                style={{ fontSize: '12px', letterSpacing: '2px' }}
              >
                Yellow Gold
              </span>
              <span
                className="bg-white/90 backdrop-blur px-3 py-2 font-medium uppercase"
                style={{ fontSize: '12px', letterSpacing: '2px' }}
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
              style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', letterSpacing: '2.5px', lineHeight: 1.2 }}
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
