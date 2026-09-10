import { useState, useEffect } from 'react';

export default function AgeVerifier() {
  const [open, setOpen] = useState(false);
  const [rejected, setRejected] = useState(false);

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
      setRejected(true);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(68,68,68,0.64)' }} />
      <div className="relative bg-white p-8 md:p-10 max-w-md w-full text-center z-10 animate-fade-in-up">
        {!rejected ? (
          <>
            <h2 className="font-heading text-2xl" style={{ marginBottom: '8px' }}>Confirm your age</h2>
            <p className="text-gray-600 text-[15px]" style={{ marginBottom: '24px' }}>Are you 18 years old or older?</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleVerify(false)}
                className="px-8 py-3 border border-[#222] text-[13px] font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                No, I&apos;m not
              </button>
              <button
                onClick={() => handleVerify(true)}
                className="px-8 py-3 bg-[#222] text-white text-[13px] font-medium uppercase tracking-wider hover:bg-black transition-colors"
              >
                Yes, I am
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-2xl" style={{ marginBottom: '8px' }}>Come back when you&apos;re older</h2>
            <p className="text-gray-600 text-[15px]" style={{ marginBottom: '24px' }}>
              Sorry, the content of this store can&apos;t be seen by a younger audience. Come back when you&apos;re older.
            </p>
            <button
              onClick={() => setRejected(false)}
              className="text-sm underline hover:text-black"
            >
              Oops, I entered incorrectly
            </button>
          </>
        )}
      </div>
    </div>
  );
}
