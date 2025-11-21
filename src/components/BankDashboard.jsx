import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

function formatCurrency(value, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0);
  } catch {
    return `$${Number(value || 0).toFixed(2)}`;
  }
}

function Section({ title, children, right }) {
  return (
    <section className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-slate-300 text-sm">{label}</span>
      {children}
    </label>
  );
}

export default function BankDashboard() {
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const selectedAcc = useMemo(() => accounts.find(a => a._id === selectedAccount), [accounts, selectedAccount]);

  async function fetchCustomers() {
    const res = await fetch(`${API_BASE}/api/customers`);
    const data = await res.json();
    setCustomers(data);
  }
  async function fetchAccounts(custId = "") {
    const q = custId ? `?customer_id=${custId}` : "";
    const res = await fetch(`${API_BASE}/api/accounts${q}`);
    const data = await res.json();
    setAccounts(data);
  }

  useEffect(() => {
    fetchCustomers();
    fetchAccounts();
  }, []);

  async function onCreateCustomer(e) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      full_name: form.get("full_name"),
      email: form.get("email"),
      phone: form.get("phone"),
      address: form.get("address"),
    };
    const res = await fetch(`${API_BASE}/api/customers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setMessage("Customer created");
      e.currentTarget.reset();
      fetchCustomers();
    } else {
      const err = await res.json();
      setMessage(err.detail || "Error creating customer");
    }
    setLoading(false);
  }

  async function onCreateAccount(e) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      customer_id: form.get("customer_id"),
      account_type: form.get("account_type"),
      currency: form.get("currency"),
      balance: Number(form.get("balance")) || 0,
      nickname: form.get("nickname") || null,
    };
    const res = await fetch(`${API_BASE}/api/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setMessage("Account created");
      e.currentTarget.reset();
      fetchAccounts(selectedCustomer);
    } else {
      const err = await res.json();
      setMessage(err.detail || "Error creating account");
    }
    setLoading(false);
  }

  async function doTx(kind) {
    if (!selectedAccount) return;
    setLoading(true);
    const body = { amount: Number(amount), note };
    const url = `${API_BASE}/api/transactions/${kind}?account_id=${selectedAccount}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      setMessage(`${kind} successful`);
      setAmount("");
      setNote("");
      fetchAccounts(selectedCustomer);
    } else {
      setMessage(data.detail || `Failed to ${kind}`);
    }
    setLoading(false);
  }

  async function doTransfer(e) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      from_account_id: form.get("from_account_id"),
      to_account_id: form.get("to_account_id"),
      amount: Number(form.get("transfer_amount")),
      note: form.get("transfer_note") || undefined,
    };
    const res = await fetch(`${API_BASE}/api/transactions/transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.ok) {
      setMessage("Transfer successful");
      e.currentTarget.reset();
      fetchAccounts(selectedCustomer);
    } else {
      setMessage(data.detail || "Transfer failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6 md:p-10 grid gap-6">
        <header className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bank Management</h1>
            <p className="text-slate-300">Create customers, open accounts, and manage transactions.</p>
          </div>
          <div className="text-sm text-emerald-300/90 min-h-[1.25rem]">{message}</div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Create Customer">
            <form className="grid gap-3" onSubmit={onCreateCustomer}>
              <Field label="Full name"><input name="full_name" className="input" required /></Field>
              <Field label="Email"><input name="email" type="email" className="input" required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><input name="phone" className="input" /></Field>
                <Field label="Address"><input name="address" className="input" /></Field>
              </div>
              <button disabled={loading} className="btn-primary">{loading ? "Creating..." : "Create Customer"}</button>
            </form>
          </Section>

          <Section title="Open Account">
            <form className="grid gap-3" onSubmit={onCreateAccount}>
              <Field label="Customer">
                <select name="customer_id" value={selectedCustomer} onChange={(e)=>{setSelectedCustomer(e.target.value); fetchAccounts(e.target.value);}} className="input" required>
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.full_name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select name="account_type" className="input" required>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <select name="currency" className="input">
                    {['USD','EUR','GBP','INR','JPY','AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Initial Balance"><input name="balance" type="number" step="0.01" className="input" defaultValue="0" /></Field>
                <Field label="Nickname"><input name="nickname" className="input" /></Field>
              </div>
              <button disabled={loading} className="btn-primary">{loading ? "Opening..." : "Open Account"}</button>
            </form>
          </Section>
        </div>

        <Section title="Accounts" right={
          <select value={selectedAccount} onChange={(e)=>setSelectedAccount(e.target.value)} className="input">
            <option value="">Select account</option>
            {accounts.map(a => (
              <option key={a._id} value={a._id}>{a.nickname || a.account_type} • {formatCurrency(a.balance, a.currency)}</option>
            ))}
          </select>
        }>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
                <div className="text-sm text-slate-400">Balance</div>
                <div className="text-2xl font-semibold">{selectedAcc ? formatCurrency(selectedAcc.balance, selectedAcc.currency) : "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount"><input className="input" type="number" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} /></Field>
                <Field label="Note"><input className="input" value={note} onChange={(e)=>setNote(e.target.value)} /></Field>
              </div>
              <div className="flex gap-3">
                <button disabled={!selectedAccount || loading} onClick={()=>doTx('deposit')} className="btn-secondary">Deposit</button>
                <button disabled={!selectedAccount || loading} onClick={()=>doTx('withdraw')} className="btn-danger">Withdraw</button>
              </div>
            </div>

            <form className="grid gap-3" onSubmit={doTransfer}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <select name="from_account_id" defaultValue="" className="input" required>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a._id} value={a._id}>{a.nickname || a.account_type}</option>)}
                  </select>
                </Field>
                <Field label="To">
                  <select name="to_account_id" defaultValue="" className="input" required>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a._id} value={a._id}>{a.nickname || a.account_type}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount"><input name="transfer_amount" type="number" step="0.01" className="input" required /></Field>
                <Field label="Note"><input name="transfer_note" className="input" /></Field>
              </div>
              <button disabled={loading} className="btn-primary">{loading ? "Transferring..." : "Transfer"}</button>
            </form>
          </div>
        </Section>

        <Section title="All Accounts">
          <div className="overflow-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Nickname</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a._id} className="border-t border-slate-800">
                    <td className="px-4 py-2">{customers.find(c => c._id === a.customer_id)?.full_name || '—'}</td>
                    <td className="px-4 py-2">{a.nickname || '—'}</td>
                    <td className="px-4 py-2 capitalize">{a.account_type}</td>
                    <td className="px-4 py-2">{formatCurrency(a.balance, a.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <style>{`
        .input { @apply bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50; }
        .btn-primary { @apply bg-blue-600 hover:bg-blue-500 transition rounded-lg px-4 py-2 font-medium disabled:opacity-50; }
        .btn-secondary { @apply bg-emerald-600 hover:bg-emerald-500 transition rounded-lg px-4 py-2 font-medium disabled:opacity-50; }
        .btn-danger { @apply bg-rose-600 hover:bg-rose-500 transition rounded-lg px-4 py-2 font-medium disabled:opacity-50; }
      `}</style>
    </div>
  );
}
