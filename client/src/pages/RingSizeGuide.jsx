import { Link } from 'react-router-dom';
import InfoShell, { InfoH, InfoP } from './InfoShell';
import { CONTACT } from '../config';

// US 3.00 – 13.00 in quarter-size steps. Diameter is linear in the US size
// (standard US ring-sizing chart derivation); circumference is π × diameter
// and the EU size is that circumference rounded.
const BASE_US_SIZE = 3;
const BASE_DIAMETER_MM = 14.07; // inside diameter at US size 3.00
const DIAMETER_MM_PER_US_SIZE = 0.812; // diameter increase per whole US size
const QUARTER_SIZE_STEP = 0.25;
const SIZE_ROW_COUNT = 41; // (13.00 - 3.00) / 0.25 + 1

const SIZE_ROWS = Array.from({ length: SIZE_ROW_COUNT }, (_, i) => {
  const us = BASE_US_SIZE + i * QUARTER_SIZE_STEP;
  const diameter = BASE_DIAMETER_MM + (us - BASE_US_SIZE) * DIAMETER_MM_PER_US_SIZE;
  const circumference = Math.PI * diameter;
  return {
    us: us.toFixed(2),
    diameter: diameter.toFixed(2),
    circumference: circumference.toFixed(2),
    eu: Math.round(circumference),
  };
});

const INK = '#222';
const ACCENT = '#ec635e';
const svgText = { fontFamily: 'var(--font-body)', fontSize: '11.5px', fill: INK };

// Original line illustrations for the two methods (viewBox 320×210).
function StripArt() {
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label="A paper strip wrapped around the base of a finger, with the point where the ends meet marked, and the strip laid flat to measure its length" style={{ display: 'block', width: '100%', height: 'auto' }}>
      {/* finger */}
      <path d="M70 215 V55 a35 35 0 0 1 70 0 V215" fill="#ead9cc" stroke={INK} strokeWidth="1.5" />
      <rect x="86" y="36" width="38" height="30" rx="14" fill="#f7ece4" stroke="#c9b4a5" strokeWidth="1.2" />
      <path d="M85 118 q20 6 40 0" fill="none" stroke="#c9b4a5" strokeWidth="1.2" strokeLinecap="round" />
      {/* strip wrapped around the base: back edge dashed, front edge solid */}
      <path d="M70 142 Q105 126 140 142" fill="none" stroke="#8a8a8a" strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M70 142 Q105 160 140 142 L140 156 Q105 174 70 156 Z" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="121" cy="156" r="4" fill={ACCENT} />
      <path d="M126 154 L172 128" fill="none" stroke={INK} strokeWidth="1" />
      <text x="178" y="126" style={svgText}>Mark where</text>
      <text x="178" y="141" style={svgText}>the ends meet</text>
      {/* strip laid flat */}
      <rect x="178" y="160" width="124" height="12" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <path d="M178 160 v12 M302 160 v12" stroke={ACCENT} strokeWidth="2" />
      <path d="M178 184 H302 M178 184 l6 -3.5 v7 z M302 184 l-6 -3.5 v7 z" fill={INK} stroke={INK} strokeWidth="1" />
      <text x="240" y="203" textAnchor="middle" style={svgText}>Measure length in mm</text>
    </svg>
  );
}

function RingArt() {
  // Ruler: 4px per mm from x=30, taller ticks every 5 and 10 mm, numbered per cm.
  const ticks = Array.from({ length: 61 }, (_, mm) => ({ mm, x: 30 + mm * 4, h: mm % 10 === 0 ? 14 : mm % 5 === 0 ? 10 : 6 }));
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label="A ring lying flat on a ruler, with the inside diameter measured edge to edge in millimetres" style={{ display: 'block', width: '100%', height: 'auto' }}>
      {/* ruler */}
      <rect x="20" y="150" width="280" height="40" rx="2" fill="#fff" stroke={INK} strokeWidth="1.5" />
      {ticks.map((t) => (
        <line key={t.mm} x1={t.x} x2={t.x} y1="150" y2={150 + t.h} stroke={INK} strokeWidth="1" />
      ))}
      {ticks.filter((t) => t.mm % 10 === 0).map((t) => (
        <text key={t.mm} x={t.x} y="183" textAnchor="middle" style={{ ...svgText, fontSize: '9px' }}>{t.mm / 10}</text>
      ))}
      {/* ring: band + solitaire */}
      <path fillRule="evenodd" d="M100 100 a50 50 0 1 0 100 0 a50 50 0 1 0 -100 0 Z M114 100 a36 36 0 1 0 72 0 a36 36 0 1 0 -72 0 Z" fill="#efe3d3" stroke={INK} strokeWidth="1.5" />
      <polygon points="150,34 159,45 150,57 141,45" fill="#fff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      {/* inside diameter, read against the ruler */}
      <path d="M114 100 V150 M186 100 V150" stroke={ACCENT} strokeWidth="1" strokeDasharray="3 3" />
      <path d="M114 100 H186 M114 100 l7 -4 v8 z M186 100 l-7 -4 v8 z" fill={ACCENT} stroke={ACCENT} strokeWidth="1.5" />
      <path d="M186 96 L204 84" fill="none" stroke={INK} strokeWidth="1" />
      <text x="208" y="82" style={svgText}>Inner diameter,</text>
      <text x="208" y="97" style={svgText}>edge to edge</text>
    </svg>
  );
}

const METHODS = [
  {
    title: 'String or paper strip',
    Art: StripArt,
    steps: [
      'Wrap a thin strip of paper or string around the base of the finger you will wear the ring on.',
      'Mark the point where the ends meet.',
      'Lay it flat and measure the length in millimetres with a ruler.',
      'Match that length to the Circumference column in the chart below.',
    ],
  },
  {
    title: 'An existing ring',
    Art: RingArt,
    steps: [
      'Choose a ring that fits the intended finger well.',
      'Place it flat on a ruler.',
      'Measure the inside diameter, edge to edge, in millimetres.',
      'Match that number to the Diameter column in the chart below.',
    ],
  },
];

const cellStyle = { padding: '12px 16px', textAlign: 'left' };

export default function RingSizeGuide() {
  return (
    <InfoShell title="Ring Size Guide" eyebrow="Guide">
      <InfoP>
        The right fit matters for a ring you will wear every day. Measure at home with either method below,
        then match your result to the size chart.
      </InfoP>

      <InfoH>How to Measure</InfoH>
      <div className="grid md:grid-cols-2" style={{ gap: '20px', marginTop: '16px' }}>
        {METHODS.map((m, i) => (
          <div key={m.title} style={{ border: '1px solid #ededed' }}>
            <div style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid #ededed' }}>
              <m.Art />
            </div>
            <div style={{ padding: '24px' }}>
              <p className="text-subheading" style={{ marginBottom: '8px', color: '#222' }}>Method {i + 1}</p>
              <h3 className="font-heading" style={{ fontSize: '18px', marginBottom: '16px' }}>{m.title}</h3>
              <ol style={{ paddingLeft: '20px', margin: 0, listStyle: 'decimal' }}>
                {m.steps.map((s) => (
                  <li key={s} style={{ marginBottom: '8px' }}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>

      <InfoH>Ring Size Chart</InfoH>
      <div className="overflow-x-auto" style={{ marginTop: '16px', border: '1px solid #ededed' }}>
        <table className="w-full text-[15px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-2)', color: '#222' }}>
              <th scope="col" className="font-medium" style={cellStyle}>US Size</th>
              <th scope="col" className="font-medium" style={cellStyle}>Diameter (mm)</th>
              <th scope="col" className="font-medium" style={cellStyle}>Circumference (mm)</th>
              <th scope="col" className="font-medium" style={cellStyle}>EU Size</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_ROWS.map((r) => (
              <tr key={r.us} className="border-b border-[#ededed]">
                <td style={cellStyle}>{r.us}</td>
                <td style={cellStyle}>{r.diameter}</td>
                <td style={cellStyle}>{r.circumference}</td>
                <td style={cellStyle}>{r.eu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InfoH>Sizing Tips</InfoH>
      <ul style={{ paddingLeft: '20px', listStyle: 'disc', marginTop: '16px' }}>
        <li style={{ marginBottom: '8px' }}>Between two sizes? Choose the larger one.</li>
        <li style={{ marginBottom: '8px' }}>Bands wider than 6 mm fit tighter than thin ones. Consider going up half a size.</li>
        <li style={{ marginBottom: '8px' }}>Measure at the end of the day, when your fingers are at their largest, and avoid measuring when cold.</li>
        <li>Your knuckle may be wider than the base of your finger. The ring has to slide over it comfortably.</li>
      </ul>

      <InfoH>Still Unsure?</InfoH>
      <InfoP>
        Message us on{' '}
        <a href="https://wa.me/919725756046" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          WhatsApp {CONTACT.whatsapp}
        </a>{' '}
        or email{' '}
        <a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4">{CONTACT.email}</a>
        {' '}and our team will help you find the right size.
      </InfoP>
      <div style={{ marginTop: '24px' }}>
        <Link to="/collections/rings" className="btn btn--secondary">Browse rings</Link>
      </div>
    </InfoShell>
  );
}
