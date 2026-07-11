const fs = require('fs');

let pageText = fs.readFileSync('app/page.tsx', 'utf8');

function replaceBlock(text, startMarker, endMarker, replacement) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    console.log("Could not find start marker:", startMarker.slice(0, 50));
    return text;
  }
  const endIndex = text.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    console.log("Could not find end marker:", endMarker.slice(0, 50));
    return text;
  }
  return text.substring(0, startIndex) + replacement + "\n" + text.substring(endIndex);
}

// 1. ADD MODAL STATE AND COMPONENT
const modalComponent = `
function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
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
        <button className="button-secondary" onClick={onCancel}>Cancel</button>
        <button className="button bg-rose-600 hover:bg-rose-700" onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

function DataTable({ endpoint, columns, onEdit, onDelete, filterDate = true, reloadTrigger = 0 }: any) {
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
          <>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5" />
          </>
        )}
      </div>
      {loading ? <p>Loading...</p> : (
        <>
          {/* Desktop Table View */}
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
                  <tr key={row.id || i} className="hover:bg-slate-50">
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
          
          {/* Mobile Card View */}
          <div className="grid md:hidden gap-3">
            {data.length === 0 && <p className="text-center text-slate-500 p-4">No records found</p>}
            {data.map((row, i) => (
              <div key={row.id || i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
                {columns.map((c: any) => (
                  <div key={c.key} className="flex justify-between items-start text-sm">
                    <span className="font-semibold text-slate-500">{c.label}:</span>
                    <span className="text-right ml-2">{c.render ? c.render(row) : row[c.key]}</span>
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
`;

pageText = replaceBlock(pageText, "function DataTable", "function Billing(", modalComponent);

// 2. RECEIPT VIEW FIXES
const receiptOld = `function ReceiptView({ data, config, close }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4">
      <div className="relative flex max-h-full w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Tax invoice</h2>`;

const receiptNew = `function ReceiptView({ data, config, close }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4">
      <div className="relative flex max-h-full w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Invoice</h2>`;

pageText = pageText.replace(receiptOld, receiptNew);

// Fix Total in ReceiptView
const receiptTotalOld = `{rupees(data.grand_total || data.total)}`;
const receiptTotalNew = `{rupees(data.grand_total || data.advance_amount || data.amount || 0)}`;
pageText = pageText.replace(receiptTotalOld, receiptTotalNew);

// 3. EXPENSES COMPONENT (Category Modal)
const expensesNew = `function Expenses({ categories, reload, notify }: any) {
  const [tab, setTab] = useState("create");
  const [f, setF] = useState<any>({ id: "", expense_name: "", category_id: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [cat, setCat] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  
  // Category Edit Modal
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

  const edit = (row: any) => { setF({ id: row.id, expense_name: row.expense_name, category_id: row.category_id || "", amount: row.amount, expense_date: row.expense_date?.slice(0,10) || "", notes: row.notes || "" }); setTab("create"); };
  const remove = async (row: any) => { await api("/api/expenses", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("Expense deleted."); };

  return (
    <div className="space-y-4">
      {editCat && (
        <Modal title="Edit Category" onClose={() => { setEditCat(null); setConfirmCatDelete(false); }}>
          {!confirmCatDelete ? (
             <div className="space-y-4">
                <input className="w-full" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category Name" />
                <div className="flex justify-between">
                  <button className="text-rose-600 text-sm font-medium" onClick={() => setConfirmCatDelete(true)}>Delete Category</button>
                  <div className="flex gap-2">
                    <button className="button-secondary" onClick={() => setEditCat(null)}>Cancel</button>
                    <button className="button" onClick={updateCategory}>Save</button>
                  </div>
                </div>
             </div>
          ) : (
             <div className="space-y-4">
               <p className="text-slate-600">Are you sure you want to delete this category? Expenses using it will become uncategorised.</p>
               <div className="flex justify-end gap-2">
                 <button className="button-secondary" onClick={() => setConfirmCatDelete(false)}>Cancel</button>
                 <button className="button bg-rose-600 hover:bg-rose-700" onClick={deleteCategory}>Delete</button>
               </div>
             </div>
          )}
        </Modal>
      )}
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Expenses</h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button type="button" className={\`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors \${tab==="create"?"bg-white text-brand-700 shadow":"text-slate-600 hover:text-slate-900"}\`} onClick={()=>{setTab("create"); setF({ id: "", expense_name: "", category_id: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });}}>Add Expense</button>
          <button type="button" className={\`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors \${tab==="manage"?"bg-white text-brand-700 shadow":"text-slate-600 hover:text-slate-900"}\`} onClick={()=>setTab("manage")}>Manage</button>
        </div>
      </div>
      {tab === "create" ? (
        <div className="space-y-4">
          <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
            <Field label="Expense name" value={f.expense_name} onChange={(v: any) => setF({ ...f, expense_name: v })} />
            <label><span className="label">Category</span><select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}><option value="">Uncategorised</option>{categories.map((x: any) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
            <Field label="Amount (₹)" type="number" value={f.amount} onChange={(v: any) => setF({ ...f, amount: v })} />
            <Field label="Date" type="date" value={f.expense_date} onChange={(v: any) => setF({ ...f, expense_date: v })} />
            <button className="button sm:col-span-2">{f.id ? "Update expense" : "Save expense"}</button>
          </form>
          <div className="card">
            <h3 className="font-semibold">Categories</h3>
            <div className="mt-2 flex gap-2"><input value={cat} placeholder="e.g. Rent" onChange={(e) => setCat(e.target.value)} /><button type="button" className="button" onClick={addCategory}>Add</button></div>
            <div className="mt-3 flex flex-wrap gap-2">{categories.map((x: any) => <button type="button" onClick={() => { setEditCat(x); setCatName(x.name); }} className="rounded-full bg-brand-50 hover:bg-brand-100 px-3 py-1 text-sm text-brand-700 transition-colors" key={x.id}>{x.name}</button>)}</div>
          </div>
        </div>
      ) : (
        <DataTable endpoint="/api/expenses" reloadTrigger={reloadTrigger} columns={[{key:"expense_date",label:"Date",render:(r:any)=>r.expense_date?.slice(0,10)},{key:"expense_name",label:"Name"},{key:"category_name",label:"Category"},{key:"amount",label:"Amount",render:(r:any)=>rupees(r.amount)}]} onEdit={edit} onDelete={remove} />
      )}
    </div>
  );
}`;
pageText = replaceBlock(pageText, "function Expenses({ categories, reload, notify }: any) {", "function Reports() {", expensesNew);

// Replace confirm() in other components
pageText = pageText.replace('const remove = async (row: any) => { if(confirm("Delete this invoice? If it had an advance applied, the advance will be restored.")) { await api("/api/invoices", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("Invoice deleted."); } };', 
'const remove = async (row: any) => { await api("/api/invoices", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("Invoice deleted."); };');

pageText = pageText.replace('const remove = async (row: any) => { if(confirm("Delete advance receipt?")) { await api("/api/advances", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("Advance deleted."); } };',
'const remove = async (row: any) => { await api("/api/advances", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); setReloadTrigger(x => x + 1); notify("Advance deleted."); };');

pageText = pageText.replace('const remove = async (row: any) => { if(confirm("Archive item?")) { await api("/api/catalog/items", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); reload(); setReloadTrigger(x => x + 1); notify("Item archived."); } };',
'const remove = async (row: any) => { await api("/api/catalog/items", { method: "DELETE", body: JSON.stringify({ id: row.id }) }); reload(); setReloadTrigger(x => x + 1); notify("Item archived."); };');

// Also update page.tsx to change toast notify to modal notify?
// The user says "Make sure we don't use alerts, use modals for confirmations, success or failture."
// Our notify function sets `toast` which displays in a `div className="fixed bottom-20 ...`. This is a Toast, not a Javascript alert(). 
// But if they want a modal, we can change the toast to a simple Modal or leave it as a nice Toast. A Toast is usually better, but let's change `toast` rendering to a modal if it's an error maybe?
// Actually, Toast is completely fine for success/failure in modern apps, and they specifically mentioned `alerts` (meaning `alert("...")`). I will keep the Toast for notify as it's non-blocking, but they might mean they want modals. I will change `toast` to use the `Modal` component!

const toastOld = `{toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}`;
const toastNew = `{toast && (
        <Modal title="Notification" onClose={() => setToast("")}>
          <p className="text-slate-600 mb-6">{toast}</p>
          <div className="flex justify-end">
            <button className="button" onClick={() => setToast("")}>OK</button>
          </div>
        </Modal>
      )}`;
pageText = pageText.replace(toastOld, toastNew);

fs.writeFileSync('app/page.tsx', pageText);
console.log("Updated page.tsx completely");
