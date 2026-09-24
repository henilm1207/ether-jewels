import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AddressForm from '../../components/account/AddressForm';
import useAddresses from '../../hooks/useAddresses';
import { countryCodeFromName } from '../../data/countries';
import { emptyAddress, formatAddressLines, validateAddress } from '../../lib/address';
import { Notice, SectionTitle } from './shared';

const MAX_SAVED = 10;

// /account/addresses — saved addresses. Always editable (orders keep
// their own copy of the address they shipped to).
export default function Addresses() {
  const { user } = useAuth();
  const { addresses, loading, create, update, remove, makeDefault } = useAddresses();
  const [editing, setEditing] = useState(null); // null | 'new' | address _id
  const [draft, setDraft] = useState(null);
  const [makeDef, setMakeDef] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const startNew = () => {
    const last = addresses[addresses.length - 1];
    setDraft({
      ...emptyAddress(last?.countryCode || 'IN'),
      fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      phone: user?.phone || '',
    });
    setMakeDef(addresses.length === 0);
    setEditing('new');
    setErrors({});
    setMsg('');
    setError('');
  };

  const startEdit = (a) => {
    setDraft({ ...emptyAddress(), ...a, countryCode: a.countryCode || countryCodeFromName(a.country) || 'IN' });
    setMakeDef(!!a.isDefault);
    setEditing(a._id);
    setErrors({});
    setMsg('');
    setError('');
  };

  const cancel = () => {
    setEditing(null);
    setDraft(null);
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = validateAddress(draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError('');
    try {
      const body = { ...draft, isDefault: makeDef };
      if (editing === 'new') await create(body);
      else await update(editing, body);
      setMsg(editing === 'new' ? 'Address added ✓' : 'Address updated ✓');
      cancel();
    } catch (err) {
      setError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn, okMsg) => {
    setError('');
    setMsg('');
    try {
      await fn();
      setMsg(okMsg);
    } catch (err) {
      setError(err.message);
    }
  };

  if (editing) {
    return (
      <>
        <SectionTitle title={editing === 'new' ? 'Add a new address' : 'Edit address'} />
        <Notice kind="error">{error}</Notice>
        <form onSubmit={save} noValidate>
          <AddressForm value={draft} onChange={setDraft} errors={errors} disabled={busy} />
          <label className="flex items-center text-sm" style={{ gap: '8px', marginTop: '16px' }}>
            <input type="checkbox" checked={makeDef} onChange={(e) => setMakeDef(e.target.checked)} disabled={busy} />
            Make this my default address
          </label>
          <div className="flex flex-wrap" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" disabled={busy} className="btn btn--primary disabled:opacity-50">{busy ? 'Saving…' : 'Save address'}</button>
            <button type="button" onClick={cancel} disabled={busy} className="btn btn--secondary">Cancel</button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <SectionTitle
        title="Saved addresses"
        subtitle="Pick one at checkout — no retyping."
        action={
          addresses.length < MAX_SAVED && (
            <button type="button" onClick={startNew} className="btn btn--primary inline-flex items-center" style={{ gap: '6px' }}>
              <Plus size={16} /> Add address
            </button>
          )
        }
      />
      <Notice>{msg}</Notice>
      <Notice kind="error">{error}</Notice>
      {loading ? (
        <div className="animate-pulse bg-[#f1ece8]" style={{ height: '140px' }} aria-hidden="true" />
      ) : addresses.length === 0 ? (
        <div className="text-center border border-dashed border-[#d9d9d9]" style={{ padding: '40px 16px' }}>
          <p className="text-gray-500 text-[15px]" style={{ marginBottom: '16px' }}>You haven't saved an address yet.</p>
          <button type="button" onClick={startNew} className="btn btn--primary">Add your first address</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2" style={{ gap: '12px' }}>
          {addresses.map((a) => (
            <div key={a._id} className={`border flex flex-col ${a.isDefault ? 'border-[#222]' : 'border-[#ededed]'}`} style={{ padding: '16px' }}>
              <div className="flex items-center" style={{ gap: '8px', marginBottom: '8px' }}>
                <span className="text-[11px] uppercase tracking-wider bg-[#f7f2ef]" style={{ padding: '2px 8px' }}>{a.label || 'home'}</span>
                {a.isDefault && <span className="text-[11px] uppercase tracking-wider bg-[#222] text-white" style={{ padding: '2px 8px' }}>Default</span>}
              </div>
              <p className="text-sm font-medium">{a.fullName}</p>
              {formatAddressLines(a).map((l) => (
                <p key={l} className="text-sm text-gray-600">{l}</p>
              ))}
              {a.phone && <p className="text-sm text-gray-600">{a.phone}</p>}
              <div className="flex flex-wrap text-sm mt-auto" style={{ gap: '16px', paddingTop: '12px' }}>
                <button type="button" onClick={() => startEdit(a)} className="underline">Edit</button>
                {!a.isDefault && (
                  <button type="button" onClick={() => act(() => makeDefault(a._id), 'Default address updated ✓')} className="underline">Set as default</button>
                )}
                <button
                  type="button"
                  onClick={() => window.confirm('Delete this address?') && act(() => remove(a._id), 'Address deleted')}
                  className="underline text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
