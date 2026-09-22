import { useState, useRef, useCallback } from 'react';

// Live image-comparison-slider: 360px mobile / 560px desktop, 46px knob,
// labels top corners, 80px/40px grid gap, 70px section padding.
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
  // touch-action:none (set on the slider element below) tells the browser
  // the gesture is handled here, so no preventDefault() is needed — calling
  // it inside React's passive touch listener trips a DevTools Issues warning.
  const handleTouchMove = (e) => {
    handleMove(e.touches[0].clientX);
  };
  const handleClick = (e) => handleMove(e.clientX);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setSliderPos((p) => Math.max(0, p - 4));
    if (e.key === 'ArrowRight') setSliderPos((p) => Math.min(100, p + 4));
  };

  return (
    <section className="bg-white" style={{ paddingTop: '70px', paddingBottom: '70px' }}>
      <div className="container-fluid">
        <div className="flex flex-col md:flex-row items-center compare-grid">
          {/* Slider */}
          <div
            ref={containerRef}
            className="w-full md:w-1/2 relative overflow-hidden cursor-ew-resize select-none compare-slider"
            style={{ touchAction: 'none' }}
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
            <img
              src="/images/gold-white.webp"
              alt="White Gold"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            {/* Top layer clipped with clip-path so both images share identical
                layout and stay pixel-registered at any slider position. */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src="/images/gold-yellow.webp"
                alt="Yellow Gold"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Handle — 2px line + 46px white knob */}
            <div
              className="absolute top-0 bottom-0 bg-white z-10"
              style={{ width: '2px', left: `${sliderPos}%` }}
            >
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize"
                style={{ width: '46px', height: '46px' }}
              >
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                  <path d="M8 1.5L2.5 6L8 10.5M16 1.5L21.5 6L16 10.5" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Labels — live: top corners */}
            <div className="absolute left-0 right-0 flex justify-between z-10 pointer-events-none" style={{ top: '14px', paddingLeft: '25px', paddingRight: '25px' }}>
              <span className="bg-white uppercase" style={{ padding: '2px 10px', lineHeight: '24px', fontSize: '15px' }}>
                Yellow Gold
              </span>
              <span className="bg-white uppercase" style={{ padding: '2px 10px', lineHeight: '24px', fontSize: '15px' }}>
                White Gold
              </span>
            </div>
          </div>

          {/* Text Content */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <p className="section__subheading">
              Compare
            </p>
            <h3 className="font-heading h3" style={{ marginBottom: '24px' }}>
              Yellow Gold or White Gold
            </h3>
            <p className="text-gray-600 leading-relaxed max-w-md mx-auto md:mx-0" style={{ fontSize: '15px', marginTop: '24px' }}>
              Slide to explore the subtle contrast between warm yellow gold and luminous white gold.
              Two tones. One timeless design.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .compare-grid { gap: 40px; }
        .compare-slider { height: 360px; }
        @media (min-width: 768px) {
          .compare-grid { gap: 80px; }
          .compare-slider { height: 560px; }
        }
      `}</style>
    </section>
  );
}
