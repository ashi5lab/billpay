"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { rupees } from "@/lib/money";
type Item = {
  id: string;
  name: string;
  default_price: number;
  cost_price: number;
  category?: string;
};
type Advance = {
  id: string;
  receipt_number: string;
  customer_name: string;
  customer_phone?: string;
  advance_amount: number;
};
type Receipt = any;
const api = async (url: string, options?: RequestInit) => {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const b = await r.json().catch(() => null);
  if (!r.ok) throw new Error(b?.error || "Something went wrong");
  return b;
};
const amount = (value: unknown) => {
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const rounded = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const nav = [
  ["dashboard", "Overview"],
  ["billing", "Billing"],
  ["advance", "Advance receipt"],
  ["inventory", "Inventory"],
  ["expenses", "Expenses"],
  ["reports", "Reports"],
  ["config", "Configuration"],
  ["users", "Users"],
  ["logs", "Log records"],
];
export default function App() {
  const [view, setView] = useState("dashboard"),
    [items, setItems] = useState<Item[]>([]),
    [categories, setCategories] = useState<any[]>([]),
    [staff, setStaff] = useState<any[]>([]),
    [config, setConfig] = useState<any>({
      store_name: "Zalish Boutique",
      address: "",
      contact_number: "",
    }),
    [receipt, setReceipt] = useState<Receipt>(null),
    [expenseRecord, setExpenseRecord] = useState<any>(null),
    [toast, setToast] = useState(""),
    [authenticated, setAuthenticated] = useState<boolean | null>(null),
    [menuOpen, setMenuOpen] = useState(false);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 3500);
  };
  const load = async () => {
    try {
      const [i, c, s, st] = await Promise.all([
        api("/api/catalog/items"),
        api("/api/catalog/categories"),
        api("/api/config"),
        api("/api/staff"),
      ]);
      setItems(i);
      setCategories(c);
      setConfig(s);
      setStaff(st);
    } catch {
      notify("Unable to load store data.");
    }
  };
  useEffect(() => {
    api("/api/auth/session")
      .then((x) => {
        setAuthenticated(x.authenticated);
        if (x.authenticated) load();
      })
      .catch(() => setAuthenticated(false));
  }, []);
  if (authenticated === null)
    return (
      <div className="grid min-h-screen place-items-center text-brand-700">
        Loading Zalish…
      </div>
    );
  if (!authenticated)
    return (
      <Login
        onSuccess={() => {
          setAuthenticated(true);
          load();
        }}
      />
    );
  const select = (id: string) => {
    setView(id);
    setMenuOpen(false);
  },
    props = { items, categories, staff, config, notify, reload: load, setReceipt, setExpenseRecord };
  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-bold text-brand-700">
              {config.store_name || "Zalish Boutique"}
            </h1>
            <p className="text-xs text-slate-500">Billing & store management</p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700"
              onClick={() => select("config")}
            >
              Settings
            </button>
            <button
              aria-label="Open menu"
              className="rounded-full bg-brand-600 px-3 py-1 text-white md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              Menu
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl md:grid-cols-[190px_1fr]">
        <aside className="hidden border-r bg-white p-3 md:block">
          {nav.map(([id, label]) => (
            <button
              key={id}
              onClick={() => select(id)}
              className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium ${view === id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-brand-50"}`}
            >
              {label}
            </button>
          ))}
          <div className="mt-8 border-t pt-4">
            <button
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" });
                setAuthenticated(false);
              }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <section className="p-4">
          {view === "dashboard" && <Dashboard {...props} />}{" "}
          {view === "billing" && <Billing {...props} />}{" "}
          {view === "advance" && <AdvanceForm {...props} />}{" "}
          {view === "inventory" && <Inventory {...props} />}{" "}
          {view === "expenses" && <Expenses {...props} />}{" "}
          {view === "reports" && <Reports />}{" "}
          {view === "config" && (
            <Config config={config} setConfig={setConfig} notify={notify} />
          )}
          {view === "users" && <Users notify={notify} />}
          {view === "logs" && <Logs />}
        </section>
      </div>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="h-full w-72 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <b className="text-brand-700">Menu</b>
              <button onClick={() => setMenuOpen(false)}>Close</button>
            </div>
            {nav.map(([id, label]) => (
              <button
                key={id}
                onClick={() => select(id)}
                className={`mb-1 w-full rounded-xl px-3 py-3 text-left ${view === id ? "bg-brand-600 text-white" : "text-slate-700"}`}
              >
                {label}
              </button>
            ))}
            <button
              className="mt-4 w-full rounded-xl border px-3 py-3 text-left text-rose-600"
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" });
                setAuthenticated(false);
                setMenuOpen(false);
              }}
            >
              Sign out
            </button>
          </aside>
        </div>
      )}
      <nav className="fixed bottom-0 z-30 flex w-full justify-around border-t bg-white px-1 py-2 md:hidden">
        {nav.slice(0, 5).map(([id, label]) => (
          <button
            key={id}
            onClick={() => select(id)}
            className={`text-xs ${view === id ? "font-bold text-brand-700" : "text-slate-500"}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          className="text-xs text-slate-500"
        >
          More
        </button>
      </nav>
      {receipt && (
        <ReceiptView
          data={receipt}
          config={config}
          close={() => setReceipt(null)}
        />
      )}
      {expenseRecord && (
        <ExpenseView
          data={expenseRecord}
          close={() => setExpenseRecord(null)}
        />
      )}{" "}
      {toast && (
        <Modal title="Notification" onClose={() => setToast("")}>
          <p className="text-slate-600 mb-6">{toast}</p>
          <div className="flex justify-end">
            <button className="button" onClick={() => setToast("")}>OK</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("admin"),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [install, setInstall] = useState<any>(null);
  useEffect(() => {
    const listener = (e: any) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-2xl text-white">
            Z
          </div>
          <h1 className="text-2xl font-bold text-brand-700">Zalish Boutique</h1>
          <p className="text-sm text-slate-500">
            Sign in to billing & store management
          </p>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <Field label="Username" value={username} onChange={setUsername} />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="button w-full">Sign in</button>
        </form>
        <button
          className="button-secondary mt-4 w-full"
          onClick={async () => {
            if (install) {
              await install.prompt();
              setInstall(null);
            } else
              alert(
                "To install: open your browser menu and choose Install app / Add to Home Screen.",
              );
          }}
        >
          ⇩ Install Zalish app
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          Initial login: admin · root
        </p>
      </div>
    </main>
  );
}
function Dashboard({ notify }: any) {
  const [report, setReport] = useState<any>();
  useEffect(() => {
    api("/api/reports")
      .then(setReport)
      .catch(() =>
        notify("Reports will appear once the database is connected."),
      );
  }, [notify]);
  const s = report?.summary;
  return (
    <>
      <h2 className="mb-4 text-2xl font-bold">Today at a glance</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Cash inflow", s?.income, "text-emerald-600"],
          ["Cash outflow", s?.expenses, "text-rose-600"],
          ["Profit / Loss", s?.profit, "text-brand-700"],
        ].map(([a, b, c]) => (
          <div className="card" key={String(a)}>
            <p className="text-sm text-slate-500">{a}</p>
            <p className={`mt-2 text-xl font-bold ${c}`}>
              {b === undefined ? "—" : rupees(b as number)}
            </p>
          </div>
        ))}
      </div>
      <div className="card mt-4">
        <h3 className="font-semibold">Quick start</h3>
        <p className="mt-2 text-sm text-slate-600">
          Add your store details, create inventory items, then raise your first
          invoice. Every currency value is in Indian rupees.
        </p>
      </div>
    </>
  );
}
function Billing({ items, config, notify, setReceipt, staff }: any) {
  const [tab, setTab] = useState("create");
  const [lines, setLines] = useState([{ item_name: "", quantity: 1, unit_price: 0, item_id: "" }]);
  const [customer, setCustomer] = useState({ name: "", phone: "", place: "" });
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignedTo, setAssignedTo] = useState("");
  const [discount, setDiscount] = useState<any>("");
  const [tax, setTax] = useState<any>("");
  const [query, setQuery] = useState("");
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [selected, setSelected] = useState<Advance | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => query.trim() ? api(`/api/advances?q=${encodeURIComponent(query)}`).then((res: any) => setAdvances(res.items || res)).catch(() => { }) : setAdvances([]), 350);
    return () => clearTimeout(t);
  }, [query]);

  const subtotal = rounded(lines.reduce((sum, line) => sum + amount(line.quantity) * amount(line.unit_price), 0));
  const taxAmt = rounded((subtotal * amount(tax)) / 100);
  const discountAmount = Math.min(amount(discount), rounded(subtotal + taxAmt));
  const total = rounded(subtotal + taxAmt - discountAmount);
  const advanceAmount = Math.min(amount(selected?.advance_amount), total);
  const balance = rounded(total - advanceAmount);

  const update = (i: number, k: string, v: any) => setLines(x => x.map((l, n) => (n === i ? { ...l, [k]: v } : l)));
  const choose = (i: number, id: string) => {
    const found = items.find((x: Item) => x.id === id);
    if (found) setLines(x => x.map((l, n) => n === i ? { ...l, item_id: id, item_name: found.name, unit_price: amount(found.default_price) } : l));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer.name || lines.some(l => !l.item_name || amount(l.quantity) <= 0)) {
      notify("Enter customer name and valid item details.");
      return;
    }
    setSaving(true);
    try {
      const result = await api("/api/invoices", { method: "POST", body: JSON.stringify({ customer_name: customer.name, customer_phone: customer.phone, customer_place: customer.place, date: invoiceDate, assigned_to: assignedTo, items: lines, discount: discountAmount, tax_rate: amount(tax), advance_id: selected?.id }) });
      setReceipt({ ...result, type: "invoice" });
      notify("Invoice created successfully.");
      setLines([{ item_name: "", quantity: 1, unit_price: 0, item_id: "" }]);
      setCustomer({ name: "", phone: "", place: "" });
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setAssignedTo("");
      setDiscount("");
      setTax("");
      setQuery("");
      setSelected(null);
      setReloadTrigger(x => x + 1);
      setTab("manage");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    if (true) {
      await api("/api/invoices", { method: "DELETE", body: JSON.stringify({ id: row.id }) });
      setReloadTrigger(x => x + 1);
      notify("Invoice deleted.");
    }
  };

  const viewReceipt = (row: any) => {
    setReceipt({ ...row, type: "invoice" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Billing</h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "create" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setTab("create")}>Create Invoice</button>
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "manage" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setTab("manage")}>Manage</button>
        </div>
      </div>
      {tab === "create" ? (
        <form onSubmit={submit} className="space-y-4">
          <datalist id="staff-list">{staff.map((s: string) => <option key={s} value={s} />)}</datalist>
          <div className="card grid gap-3 sm:grid-cols-5">
            <Field label="Customer name *" value={customer.name} onChange={(v: any) => setCustomer({ ...customer, name: v })} />
            <Field label="Phone (optional)" type="tel" value={customer.phone} onChange={(v: any) => setCustomer({ ...customer, phone: v })} />
            <Field label="Place (optional)" value={customer.place} onChange={(v: any) => setCustomer({ ...customer, place: v })} />
            <Field label="Date" type="date" value={invoiceDate} onChange={(v: any) => setInvoiceDate(v)} />
            <Field label="Assigned To" value={assignedTo} onChange={setAssignedTo} list="staff-list" />
          </div>
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Items</h3>
              <button type="button" className="button-secondary text-sm" onClick={() => setLines([...lines, { item_name: "", quantity: 1, unit_price: 0, item_id: "" }])}>＋ Add item</button>
            </div>
            {lines.map((l, i) => (
              <div className="grid gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[2fr_1fr_1fr_auto]" key={i}>
                <select value={l.item_id} onChange={(e) => choose(i, e.target.value)}>
                  <option value="">Custom item</option>
                  {items.map((x: Item) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <input placeholder="Item name" value={l.item_name} onChange={(e) => update(i, "item_name", e.target.value)} />
                <input aria-label="Price" placeholder="Price" type="number" min="0" step="0.01" value={l.unit_price} onChange={(e) => update(i, "unit_price", e.target.value)} />
                <div className="flex gap-2">
                  <input aria-label="Quantity" className="w-20" type="number" min="0.01" step="0.01" value={l.quantity} onChange={(e) => update(i, "quantity", e.target.value)} />
                  {lines.length > 1 && <button type="button" onClick={() => setLines(lines.filter((_: any, n: number) => n !== i))} className="text-rose-600">✕</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <label className="label">Apply advance receipt (optional)</label>
            <input value={query} placeholder="Search receipt number or customer" onChange={(e) => { setQuery(e.target.value); setSelected(null); }} />
            {advances.length > 0 && (
              <div className="mt-1 rounded-xl border bg-white">
                {advances.map((a) => (
                  <button type="button" key={a.id} onClick={() => { setSelected(a); setQuery(a.receipt_number); setAdvances([]); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50">
                    {a.receipt_number} — {a.customer_name} ({rupees(a.advance_amount)})
                  </button>
                ))}
              </div>
            )}
            {selected && <p className="mt-2 text-sm text-brand-700">Using advance: {selected.receipt_number} · {rupees(advanceAmount)}</p>}
          </div>
          <div className="card grid gap-3 sm:grid-cols-3">
            <Field label="Discount (₹)" type="number" value={discount} onChange={(v: any) => setDiscount(amount(v))} />
            <Field label="GST / tax (%)" type="number" value={tax} onChange={(v: any) => setTax(amount(v))} />
            <div className="rounded-xl bg-brand-50 p-3 text-right">
              <p className="text-sm">Items {rupees(subtotal)} + Tax {rupees(taxAmt)}</p>
              <p className="text-sm">Discount −{rupees(discountAmount)}{selected && <> · Advance −{rupees(advanceAmount)}</>}</p>
              <p className="text-xl font-bold text-brand-700">Total {rupees(total)}</p>
              {selected && <p className="text-sm">Balance due: {rupees(balance)}</p>}
            </div>
          </div>
          <button disabled={saving} className="button w-full">{saving ? "Creating…" : "Create invoice"}</button>
        </form>
      ) : (
        <DataTable endpoint="/api/invoices" reloadTrigger={reloadTrigger} columns={[{ key: "invoice_number", label: "Inv #" }, { key: "created_at", label: "Date", render: (r: any) => r.created_at?.slice(0, 10) }, { key: "customer_name", label: "Customer" }, { key: "assigned_to", label: "Assigned To" }, { key: "grand_total", label: "Total", render: (r: any) => rupees(r.grand_total) }]} onRowClick={viewReceipt} onDelete={remove} />
      )}
    </div>
  );
}
function AdvanceForm({ notify, setReceipt, staff }: any) {
  const [tab, setTab] = useState("create");
  const [f, setF] = useState<any>({ id: "", customer_name: "", customer_phone: "", customer_place: "", advance_amount: "", notes: "", date: new Date().toISOString().slice(0, 10), assigned_to: "" });
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      let r;
      if (f.id) {
        r = await api("/api/advances", { method: "PATCH", body: JSON.stringify(f) });
        notify("Advance receipt updated.");
      } else {
        r = await api("/api/advances", { method: "POST", body: JSON.stringify(f) });
        notify("Advance receipt created.");
      }
      setReceipt({ ...r, type: "advance" });
      setF({ id: "", customer_name: "", customer_phone: "", customer_place: "", advance_amount: "", notes: "", date: new Date().toISOString().slice(0, 10), assigned_to: "" });
      setReloadTrigger(x => x + 1);
      setTab("manage");
    } catch (e: any) { notify(e.message); }
  };
  const edit = (row: any) => { setF({ id: row.id, customer_name: row.customer_name, customer_phone: row.customer_phone || "", customer_place: row.customer_place || "", advance_amount: row.advance_amount, notes: row.notes || "", date: row.issued_at?.slice(0, 10) || row.date || new Date().toISOString().slice(0, 10), assigned_to: row.assigned_to || "" }); setTab("create"); };
  const remove = async (row: any) => { await api("/api/advances", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("Advance deleted."); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Advance Receipts</h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "create" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => { setTab("create"); setF({ id: "", customer_name: "", customer_phone: "", customer_place: "", advance_amount: "", notes: "", date: new Date().toISOString().slice(0, 10), assigned_to: "" }); }}>Create Advance</button>
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "manage" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setTab("manage")}>Manage</button>
        </div>
      </div>
      {tab === "create" ? (
        <form onSubmit={submit} className="space-y-4">
          <datalist id="staff-list-adv">{staff.map((s: string) => <option key={s} value={s} />)}</datalist>
          <div className="card grid gap-3 sm:grid-cols-2">
            <Field label="Customer name *" value={f.customer_name} onChange={(v: any) => setF({ ...f, customer_name: v })} />
            <Field label="Advance amount (₹) *" type="number" value={f.advance_amount} onChange={(v: any) => setF({ ...f, advance_amount: v })} />
            <Field label="Phone" value={f.customer_phone} onChange={(v: any) => setF({ ...f, customer_phone: v })} />
            <Field label="Place" value={f.customer_place} onChange={(v: any) => setF({ ...f, customer_place: v })} />
            <Field label="Date" type="date" value={f.date} onChange={(v: any) => setF({ ...f, date: v })} />
            <Field label="Assigned To" value={f.assigned_to} onChange={(v: any) => setF({ ...f, assigned_to: v })} list="staff-list-adv" />
          </div>
          <Field label="Notes" value={f.notes} onChange={(v: any) => setF({ ...f, notes: v })} />
          <button className="button w-full">{f.id ? "Update advance" : "Create advance receipt"}</button>
        </form>
      ) : (
        <DataTable endpoint="/api/advances" reloadTrigger={reloadTrigger} columns={[{ key: "receipt_number", label: "Receipt #" }, { key: "issued_at", label: "Date", render: (r: any) => r.issued_at?.slice(0, 10) }, { key: "customer_name", label: "Customer" }, { key: "assigned_to", label: "Assigned To" }, { key: "advance_amount", label: "Amount", render: (r: any) => rupees(r.advance_amount) }]} onEdit={edit} onDelete={remove} onRowClick={(r: any) => setReceipt({ ...r, type: "advance" })} />
      )}
    </div>
  );
}
function Inventory({ items, reload, notify }: any) {
  const [tab, setTab] = useState("create");
  const [f, setF] = useState<any>({ id: "", name: "", default_price: "" });
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (f.id) {
        await api("/api/catalog/items", { method: "PATCH", body: JSON.stringify({ ...f, default_price: amount(f.default_price) }) });
        notify("Item updated.");
      } else {
        await api("/api/catalog/items", { method: "POST", body: JSON.stringify({ name: f.name, default_price: amount(f.default_price) }) });
        notify("Item saved.");
      }
      setF({ id: "", name: "", default_price: "" });
      reload();
      setReloadTrigger(x => x + 1);
      setTab("manage");
    } catch (e: any) { notify(e.message); }
  };

  const edit = (row: any) => { setF({ id: row.id, name: row.name, default_price: row.default_price }); setTab("create"); };
  const remove = async (row: any) => { await api("/api/catalog/items", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); reload(); setReloadTrigger(x => x + 1); notify("Item archived."); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Inventory</h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "create" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => { setTab("create"); setF({ id: "", name: "", default_price: "" }); }}>Add Item</button>
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "manage" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setTab("manage")}>Manage</button>
        </div>
      </div>
      {tab === "create" ? (
        <form onSubmit={submit} className="card grid gap-2 sm:grid-cols-3">
          <input required placeholder="Item name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input type="number" min="0" step="0.01" placeholder="Selling price" value={f.default_price} onChange={(e) => setF({ ...f, default_price: e.target.value })} />
          <button className="button">{f.id ? "Update item" : "Add item"}</button>
        </form>
      ) : (
        <DataTable endpoint="/api/catalog/items" filterDate={false} reloadTrigger={reloadTrigger} columns={[{ key: "name", label: "Name" }, { key: "default_price", label: "Price", render: (r: any) => rupees(r.default_price) }]} onEdit={edit} onDelete={remove} />
      )}
    </div>
  );
}
function Expenses({ categories, reload, notify, setExpenseRecord, staff }: any) {
  const [tab, setTab] = useState("create");
  const [f, setF] = useState<any>({ id: "", expense_name: "", category_id: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "", assigned_to: "" });
  const [cat, setCat] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [editCat, setEditCat] = useState<any>(null);
  const [catName, setCatName] = useState("");
  const [confirmCatDelete, setConfirmCatDelete] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (f.id) {
        await api("/api/expenses", { method: "PATCH", body: JSON.stringify(f) });
        notify("Expense updated.");
      } else {
        await api("/api/expenses", { method: "POST", body: JSON.stringify(f) });
        notify("Expense recorded.");
      }
      setF({ id: "", expense_name: "", category_id: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
      setReloadTrigger(x => x + 1);
      setTab("manage");
    } catch (e: any) { notify(e.message); }
  };
  const addCategory = async () => {
    try { if (!cat.trim()) return; await api("/api/catalog/categories", { method: "POST", body: JSON.stringify({ name: cat }) }); setCat(""); await reload(); notify("Category added."); } catch (e: any) { notify(e.message); }
  };

  const updateCategory = async () => {
    try {
      if (!catName.trim()) return;
      await api("/api/catalog/categories", { method: "PATCH", body: JSON.stringify({ id: editCat.id, name: catName }) });
      await reload();
      setEditCat(null);
      notify("Category updated.");
    } catch (e: any) { notify(e.message); }
  };

  const deleteCategory = async () => {
    try {
      await api("/api/catalog/categories", { method: "DELETE", body: JSON.stringify({ id: editCat.id }) });
      await reload();
      setEditCat(null);
      setConfirmCatDelete(false);
      notify("Category deleted.");
    } catch (e: any) { notify(e.message); }
  };

  const edit = (row: any) => { setF({ id: row.id, expense_name: row.expense_name, category_id: row.category_id || "", amount: row.amount, expense_date: row.expense_date?.slice(0, 10) || "", notes: row.notes || "", assigned_to: row.assigned_to || "" }); setTab("create"); };
  const remove = async (row: any) => { await api("/api/expenses", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("Expense deleted."); };

  return (
    <div className="space-y-4">
      {editCat && (
        <Modal title="Edit Category" onClose={() => { setEditCat(null); setConfirmCatDelete(false); }}>
          {!confirmCatDelete ? (
            <div className="space-y-4">
              <input className="w-full border rounded p-2" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category Name" />
              <div className="flex justify-between pt-4">
                <button type="button" className="text-rose-600 text-sm font-medium hover:underline" onClick={() => setConfirmCatDelete(true)}>Delete Category</button>
                <div className="flex gap-3">
                  <button type="button" className="button-secondary" onClick={() => setEditCat(null)}>Cancel</button>
                  <button type="button" className="button" onClick={updateCategory}>Save</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-600">Are you sure you want to delete this category? Expenses using it will become uncategorised.</p>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="button-secondary" onClick={() => setConfirmCatDelete(false)}>Cancel</button>
                <button type="button" className="button bg-rose-600 hover:bg-rose-700" onClick={deleteCategory}>Delete</button>
              </div>
            </div>
          )}
        </Modal>
      )}
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Expenses</h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "create" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => { setTab("create"); setF({ id: "", expense_name: "", category_id: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "", assigned_to: "" }); }}>Add Expense</button>
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "manage" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setTab("manage")}>Manage</button>
        </div>
      </div>
      {tab === "create" ? (
        <div className="space-y-4">
          <datalist id="staff-list-exp">{staff.map((s: string) => <option key={s} value={s} />)}</datalist>
          <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
            <Field label="Expense name" value={f.expense_name} onChange={(v: any) => setF({ ...f, expense_name: v })} />
            <label><span className="label">Category</span><select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}><option value="">Uncategorised</option>{categories.map((x: any) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
            <Field label="Amount (₹)" type="number" value={f.amount} onChange={(v: any) => setF({ ...f, amount: v })} />
            <Field label="Date" type="date" value={f.expense_date} onChange={(v: any) => setF({ ...f, expense_date: v })} />
            <Field label="Assigned To" value={f.assigned_to} onChange={(v: any) => setF({ ...f, assigned_to: v })} list="staff-list-exp" />
            <button className="button sm:col-span-2">{f.id ? "Update expense" : "Save expense"}</button>
          </form>
          <div className="card">
            <h3 className="font-semibold">Categories</h3>
            <div className="mt-2 flex gap-2"><input value={cat} placeholder="e.g. Rent" onChange={(e) => setCat(e.target.value)} /><button type="button" className="button" onClick={addCategory}>Add</button></div>
            <div className="mt-3 flex flex-wrap gap-2">{categories.map((x: any) => <button type="button" onClick={() => { setEditCat(x); setCatName(x.name); }} className="rounded-full bg-brand-50 hover:bg-brand-100 px-3 py-1 text-sm text-brand-700 transition-colors" key={x.id}>{x.name}</button>)}</div>
          </div>
        </div>
      ) : (
        <DataTable endpoint="/api/expenses" reloadTrigger={reloadTrigger} columns={[{ key: "expense_date", label: "Date", render: (r: any) => r.expense_date?.slice(0, 10) }, { key: "expense_name", label: "Name" }, { key: "category_name", label: "Category" }, { key: "assigned_to", label: "Assigned To" }, { key: "amount", label: "Amount", render: (r: any) => rupees(r.amount) }]} onEdit={edit} onDelete={remove} onRowClick={(r: any) => setExpenseRecord(r)} />
      )}
    </div>
  );
}
function Reports() {
  const [r, setR] = useState<any>();
  useEffect(() => {
    api("/api/reports")
      .then(setR)
      .catch(() => { });
  }, []);
  const rows = [
    ["Cash inflow", r?.summary?.income, "Money collected from invoices"],
    ["Cash outflow", r?.summary?.expenses, "All recorded expenses"],
    ["Profit / loss", r?.summary?.profit, "Inflow less expenses"],
    ["Account aggregation", r?.summary?.sales, "Total invoice item sales"],
  ];
  return (
    <div>
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Reports</h2>
        <a href="/api/reports/export" download className="button text-sm px-4 py-1.5">Export Excel</a>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([t, v, d]) => (
          <div className="card" key={String(t)}>
            <p className="font-semibold">{t}</p>
            <p className="mt-2 text-2xl font-bold text-brand-700">
              {v === undefined ? "—" : rupees(v as number)}
            </p>
            <p className="text-sm text-slate-500">{d}</p>
          </div>
        ))}
      </div>
      <div className="card mt-4">
        <h3 className="font-semibold">Sales trend (last 30 days)</h3>
        <div className="mt-4 flex h-36 items-end gap-2">
          {(r?.chart || []).map((x: any) => (
            <div
              title={`${x.label}: ${rupees(x.value)}`}
              key={x.label}
              className="min-w-4 flex-1 rounded-t bg-brand-500"
              style={{
                height: `${Math.max(8, Math.min(100, (x.value / Math.max(...r.chart.map((a: any) => a.value))) * 100))}%`,
              }}
            />
          ))}
          {!r?.chart?.length && (
            <p className="text-sm text-slate-500">No sales data yet.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          For Excel, use your browser’s print/export or connect a dedicated
          export library before production launch.
        </p>
      </div>
    </div>
  );
}
function Config({ config, setConfig, notify }: any) {
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const x = await api("/api/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setConfig(x);
      notify("Store details saved.");
    } catch (e: any) {
      notify(e.message);
    }
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <h2 className="text-2xl font-bold">Store configuration</h2>
      <div className="card space-y-3">
        <Field
          label="Store name"
          value={config.store_name || ""}
          onChange={(v: any) => setConfig({ ...config, store_name: v })}
        />
        <Field
          label="Store address"
          value={config.address || ""}
          onChange={(v: any) => setConfig({ ...config, address: v })}
        />
        <Field
          label="Store contact number"
          value={config.contact_number || ""}
          onChange={(v: any) => setConfig({ ...config, contact_number: v })}
        />
        <Field
          label="GSTIN (optional)"
          value={config.gstin || ""}
          onChange={(v: any) => setConfig({ ...config, gstin: v })}
        />
      </div>
      <button className="button">Save configuration</button>
    </form>
  );
}
function Users({ notify }: any) {
  const [tab, setTab] = useState("create");
  const [f, setF] = useState<any>({ id: "", name: "", email: "", password: "" });
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (f.id) {
        await api("/api/users", { method: "PATCH", body: JSON.stringify(f) });
        notify("User updated.");
      } else {
        await api("/api/users", { method: "POST", body: JSON.stringify(f) });
        notify("User created.");
      }
      setF({ id: "", name: "", email: "", password: "" });
      setReloadTrigger(x => x + 1);
      setTab("manage");
    } catch (e: any) { notify(e.message); }
  };

  const edit = (row: any) => { setF({ id: row.id, name: row.name, email: row.email, password: "" }); setTab("create"); };
  const remove = async (row: any) => { await api("/api/users", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("User deleted."); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Users</h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "create" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => { setTab("create"); setF({ id: "", name: "", email: "", password: "" }); }}>{f.id ? "Edit User" : "Create User"}</button>
          <button type="button" className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${tab === "manage" ? "bg-white text-brand-700 shadow" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setTab("manage")}>Manage</button>
        </div>
      </div>
      {tab === "create" ? (
        <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
          <Field label="Name *" value={f.name} onChange={(v: any) => setF({ ...f, name: v })} />
          <Field label="Email (Username) *" type="email" value={f.email} onChange={(v: any) => setF({ ...f, email: v })} disabled={!!f.id} />
          <Field label={f.id ? "New Password (leave blank to keep current)" : "Password *"} type="password" value={f.password} onChange={(v: any) => setF({ ...f, password: v })} />
          <div className="sm:col-span-2">
            <button className="button">{f.id ? "Update User" : "Create User"}</button>
            {f.id && <button type="button" className="button-secondary ml-3" onClick={() => { setF({ id: "", name: "", email: "", password: "" }); setTab("manage"); }}>Cancel</button>}
          </div>
        </form>
      ) : (
        <DataTable endpoint="/api/users" reloadTrigger={reloadTrigger} filterDate={false} columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "created_at", label: "Created At", render: (r: any) => r.created_at?.slice(0, 10) }
        ]} onEdit={edit} onDelete={remove} />
      )}
    </div>
  );
}
function Logs() {
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">Audit Logs</h2>
      <DataTable
        endpoint="/api/logs"
        filterDate={false}
        columns={[
          { key: "created_at", label: "Timestamp", render: (r: any) => new Date(r.created_at).toLocaleString() },
          { key: "user_email", label: "User" },
          { key: "action", label: "Action" },
          { key: "table_name", label: "Entity" },
          { key: "details", label: "Details", render: (r: any) => <pre className="text-xs overflow-auto max-w-[200px]">{JSON.stringify(r.details)}</pre> }
        ]}
      />
    </div>
  );
}
function ExpenseView({ data, close }: any) {
  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-slate-900/50 p-4">
      <div className="mx-auto max-w-md">
        <div id="receipt" className="rounded-2xl bg-white p-6 shadow-2xl">
          <div className="text-center">
            <h2 className="text-xl font-bold text-brand-700">Expense Record</h2>
            <hr className="my-4" />
            <p className="font-semibold">{data.expense_name}</p>
            <p className="text-sm">{data.expense_date?.slice(0, 10)}</p>
          </div>
          <div className="mt-4 text-sm">
            <p><b>Category:</b> {data.category_name || "Uncategorised"}</p>
            {data.notes && <p><b>Notes:</b> {data.notes}</p>}
          </div>
          <div className="mt-4 space-y-1 text-sm border-t pt-2">
            <p className="flex justify-between text-lg font-bold">
              <span>Amount</span>
              <span>{rupees(data.amount)}</span>
            </p>
          </div>
        </div>
        <div className="print:hidden mt-4 rounded-xl bg-slate-800 p-4 text-xs text-slate-300">
          <p>Created by: {data.created_by || "Unknown"} on {data.created_at?.slice(0, 10)}</p>
          {data.updated_by && <p>Updated by: {data.updated_by}</p>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="button-secondary" onClick={() => window.print()}>Print</button>
          <button onClick={close} className="w-full text-sm text-white">Close</button>
        </div>
      </div>
    </div>
  );
}
function ReceiptView({ data, config, close }: any) {
  const phone = String(data.customer_phone || "").replace(/\D/g, "");
  const text = encodeURIComponent(
    `Thank you for shopping with ${config.store_name}. ${data.type === "advance" ? "Advance receipt" : "Invoice"} ${data.receipt_number || data.invoice_number}: ${rupees(data.advance_amount || data.grand_total)}`,
  );
  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-slate-900/50 p-4">
      <div className="mx-auto max-w-md">
        <div id="receipt" className="rounded-2xl bg-white p-6 shadow-2xl">
          <div className="text-center">
            <h2 className="text-xl font-bold text-brand-700">
              {config.store_name}
            </h2>
            <p className="text-sm text-slate-500">{config.address}</p>
            <p className="text-sm text-slate-500">{config.contact_number}</p>
            <hr className="my-4" />
            <p className="font-semibold">
              {data.type === "advance" ? "ADVANCE RECEIPT" : "INVOICE"}
            </p>
            <p className="text-sm">
              #{data.receipt_number || data.invoice_number}
            </p>
          </div>
          <div className="mt-4 text-sm">
            <p>
              <b>Customer:</b> {data.customer_name}
            </p>
            {data.customer_phone && (
              <p>
                <b>Phone:</b> {data.customer_phone}
              </p>
            )}
            {data.customer_place && (
              <p>
                <b>Place:</b> {data.customer_place}
              </p>
            )}
          </div>
          {data.items && (
            <div className="mt-4 border-y py-2 text-sm">
              {data.items.map((i: any, n: number) => (
                <div className="flex justify-between" key={n}>
                  <span>
                    {i.item_name} × {i.quantity}
                  </span>
                  <span>{rupees(i.quantity * i.unit_price)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-1 text-sm">
            {data.type === "invoice" && (
              <>
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{rupees(data.subtotal)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Discount</span>
                  <span>−{rupees(data.discount)}</span>
                </p>
                <p className="flex justify-between">
                  <span>GST / Tax</span>
                  <span>{rupees(data.tax_amount)}</span>
                </p>
              </>
            )}
            <p className="flex justify-between text-lg font-bold">
              <span>{data.type === "advance" ? "Advance paid" : "Total"}</span>
              <span>{rupees(data.type === "advance" ? data.advance_amount : data.grand_total)}</span>
            </p>
            {data.type === "invoice" && Number(data.advance_amount) > 0 && (
              <>
                <p className="flex justify-between">
                  <span>Advance adjusted</span>
                  <span>−{rupees(data.advance_amount)}</span>
                </p>
                <p className="flex justify-between font-bold">
                  <span>Balance due</span>
                  <span>{rupees(data.balance_due)}</span>
                </p>
              </>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            Thank you for choosing us!
          </p>
        </div>
        <div className="print:hidden mt-4 rounded-xl bg-slate-800 p-4 text-xs text-slate-300">
          <p>Created by: {data.created_by || "Unknown"} on {data.created_at?.slice(0, 10) || data.date}</p>
          {data.updated_by && <p>Updated by: {data.updated_by}</p>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="button-secondary" onClick={() => window.print()}>
            Save PDF
          </button>
          <button
            className="button-secondary"
            onClick={() => navigator.share?.({ title: "Zalish receipt", text })}
          >
            Share
          </button>
          {phone ? (
            <a
              className="button"
              href={`https://wa.me/91${phone}?text=${text}`}
              target="_blank"
            >
              WhatsApp
            </a>
          ) : (
            <button disabled className="button">
              WhatsApp
            </button>
          )}
        </div>
        <button onClick={close} className="mt-2 w-full text-sm text-white">
          Close
        </button>
      </div>
    </div>
  );
}
function Field({ label, type = "text", value, onChange, list }: any) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        type={type}
        list={list}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}




function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }: any) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-slate-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="button bg-rose-600 hover:bg-rose-700" onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

function DataTable({ endpoint, columns, onEdit, onDelete, filterDate = true, reloadTrigger = 0, onRowClick }: any) {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append("search", search);
      if (startDate) q.append("startDate", startDate);
      if (endDate) q.append("endDate", endDate);
      const res = await api(endpoint + "?" + q.toString());
      setData(res.items || res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [search, startDate, endDate, endpoint, reloadTrigger]);

  return (
    <div className="space-y-4">
      {confirmDelete && (
        <ConfirmModal
          title="Confirm Deletion"
          message="Are you sure you want to delete this record? This action cannot be undone."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 rounded-md border border-slate-300 px-3 py-1.5" />
        {filterDate && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>From</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5" />
            <span>To</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5" />
          </div>
        )}
      </div>
      {loading ? <p>Loading...</p> : (
        <>
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {columns.map((c: any) => <th key={c.key} className="p-3 font-semibold text-slate-700">{c.label}</th>)}
                  <th className="p-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 && <tr><td colSpan={columns.length + 1} className="p-6 text-center text-slate-500">No records found</td></tr>}
                {data.map((row, i) => (
                  <tr key={row.id || i} className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={(e) => { if ((e.target as any).closest('button') || (e.target as any).tagName === 'A') return; onRowClick?.(row); }}>
                    {columns.map((c: any) => <td key={c.key} className="p-3">{c.render ? c.render(row) : row[c.key]}</td>)}
                    <td className="p-3 flex gap-3">
                      {onEdit && <button type="button" onClick={() => onEdit(row)} className="text-brand-600 font-medium hover:underline">Edit</button>}
                      {onDelete && <button type="button" onClick={() => setConfirmDelete(row)} className="text-rose-600 font-medium hover:underline">Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid md:hidden gap-3">
            {data.length === 0 && <p className="text-center text-slate-500 p-4">No records found</p>}
            {data.map((row, i) => (
              <div key={row.id || i} className={`rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`} onClick={(e) => { if ((e.target as any).closest('button') || (e.target as any).tagName === 'A') return; onRowClick?.(row); }}>
                {columns.map((c: any) => (
                  <div key={c.key} className="flex justify-between items-start text-sm">
                    <span className="font-semibold text-slate-500">{c.label}:</span>
                    <span className="text-right ml-2 font-medium text-slate-900">{c.render ? c.render(row) : row[c.key]}</span>
                  </div>
                ))}
                {(onEdit || onDelete) && (
                  <div className="pt-3 mt-2 border-t border-slate-100 flex justify-end gap-4">
                    {onEdit && <button type="button" onClick={() => onEdit(row)} className="text-brand-600 font-medium text-sm">Edit</button>}
                    {onDelete && <button type="button" onClick={() => setConfirmDelete(row)} className="text-rose-600 font-medium text-sm">Delete</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
