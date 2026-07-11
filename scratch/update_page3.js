const fs = require('fs');
let text = fs.readFileSync('app/page.tsx', 'utf8');

const dataTableIndex = text.indexOf('function DataTable(');
if (dataTableIndex !== -1) {
  text = text.substring(0, dataTableIndex);
}

const modalsAndTable = `
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
          
          <div className="grid md:hidden gap-3">
            {data.length === 0 && <p className="text-center text-slate-500 p-4">No records found</p>}
            {data.map((row, i) => (
              <div key={row.id || i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
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
`;
text += "\n" + modalsAndTable;

const receiptOld1 = 'function ReceiptView({ data, config, close }: any) {';
const receiptOldIndex = text.indexOf(receiptOld1);
if(receiptOldIndex !== -1) {
   let receiptEndIndex = text.indexOf('function Config', receiptOldIndex);
   if(receiptEndIndex === -1) receiptEndIndex = text.indexOf('function Users', receiptOldIndex);
   if(receiptEndIndex !== -1) {
     let receiptBlock = text.substring(receiptOldIndex, receiptEndIndex);
     receiptBlock = receiptBlock.replace('<h2 className="text-lg font-bold">Tax invoice</h2>', '<h2 className="text-lg font-bold">Invoice</h2>');
     receiptBlock = receiptBlock.replace('{rupees(data.grand_total || data.total)}', '{rupees(data.grand_total || data.advance_amount || data.amount || 0)}');
     text = text.substring(0, receiptOldIndex) + receiptBlock + text.substring(receiptEndIndex);
   }
}

text = text.replace('if(confirm("Delete this invoice? If it had an advance applied, the advance will be restored.")) {', 'if (true) {');
text = text.replace('if(confirm("Delete advance receipt?")) {', 'if (true) {');
text = text.replace('if(confirm("Archive item?")) {', 'if (true) {');

const expensesNew = `function Expenses({ categories, reload, notify }: any) {
  const [tab, setTab] = useState("create");
  const [f, setF] = useState<any>({ id: "", expense_name: "", category_id: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
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

  const edit = (row: any) => { setF({ id: row.id, expense_name: row.expense_name, category_id: row.category_id || "", amount: row.amount, expense_date: row.expense_date?.slice(0,10) || "", notes: row.notes || "" }); setTab("create"); };
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

let expIdx = text.indexOf('function Expenses(');
if (expIdx !== -1) {
  let reportsIdx = text.indexOf('function Reports', expIdx);
  if (reportsIdx !== -1) {
    text = text.substring(0, expIdx) + expensesNew + "\\n" + text.substring(reportsIdx);
  }
}

fs.writeFileSync('app/page.tsx', text);
