import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

// Editable quantity stepper shared by the cart drawer and cart page.
// Typing commits on blur/Enter (no per-keystroke side effects); onCommit(n)
// applies the change and returns false when refused (whole-cart cap) so the
// caller can redirect to Contact. `price-input` only hides native spinners.
export default function QtyStepper({ value, onCommit, small = false }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw) => {
    const trimmed = String(raw).trim();
    if (trimmed === '') {
      setText(String(value));
      return;
    }
    const n = Math.floor(Number(trimmed));
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    if (n === value) return;
    onCommit(n);
    setText(String(value));
  };

  const boxHeight = small ? '38px' : '38px';

  return (
    <div className="flex items-center border border-[#ededed]" style={{ height: boxHeight, width: '110px' }}>
      <button
        type="button"
        onClick={() => onCommit(value - 1)}
        className="px-2.5 hover:bg-gray-50 h-full"
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        value={text}
        min={1}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(text);
          }
        }}
        aria-label="Quantity"
        className="price-input flex-1 min-w-0 w-full h-full bg-transparent text-sm font-medium text-center focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onCommit(value + 1)}
        className="px-2.5 hover:bg-gray-50 h-full"
        aria-label="Increase quantity"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
