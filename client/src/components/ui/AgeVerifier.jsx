import { useState, useEffect } from 'react';

export default function AgeVerifier() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('mitva-age-verified');
    if (!verified) {
      setOpen(true);
    }
  }, []);

  const handleVerify = (isAdult) => {
    if (isAdult) {
      localStorage.setItem('mitva-age-verified', 'true');
      setOpen(false);
    } else {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'DM Sans',sans-serif;text-align:center;padding:2rem;">
          <div>
            <h1 style="font-size:2rem;margin-bottom:1rem;">Come back when you're older</h1>
            <p style="color:#666;">Sorry, the content of this store can't be seen by a younger audience. Come back when you're older.</p>
          </div>
        </div>
      `;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-white p-8 md:p-10 max-w-md w-full text-center z-10 animate-fade-in-up">
        <h2 className="font-heading text-2xl mb-2">Confirm your age</h2>
        <p className="text-gray-600 mb-6">Are you 18 years old or older?</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleVerify(false)}
            className="px-8 py-3 border border-[#222] text-[13px] font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
          >
            No, I'm not
          </button>
          <button
            onClick={() => handleVerify(true)}
            className="px-8 py-3 bg-[#222] text-white text-[13px] font-medium uppercase tracking-wider hover:bg-black transition-colors"
          >
            Yes, I am
          </button>
        </div>
      </div>
    </div>
  );
}
