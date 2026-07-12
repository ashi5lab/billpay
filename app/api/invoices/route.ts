import { NextResponse } from "next/server";
import { db, transaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { roundMoney } from "@/lib/money";
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, Number(p.get("page") || 1)),
      limit = Math.min(100, Math.max(1, Number(p.get("limit") || 10)));
    const q = p.get("search") || "";
    const startDate = p.get("startDate") || "";
    const endDate = p.get("endDate") || "";

    let whereClause = "n.deleted_at IS NULL";
    const params: any[] = [limit, (page - 1) * limit];
    let paramCount = 3;

    if (q) {
      whereClause += ` AND (n.invoice_number ILIKE $${paramCount} OR n.customer_name ILIKE $${paramCount} OR n.customer_phone ILIKE $${paramCount})`;
      params.push(`%${q}%`);
      paramCount++;
    }
    if (startDate) {
      whereClause += ` AND n.created_at >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND n.created_at <= $${paramCount++}`;
      params.push(endDate);
    }

    const query = `SELECT n.*, a.receipt_number as advance_receipt_number FROM zalish_invoices n LEFT JOIN zalish_advances a ON a.id = n.advance_id WHERE ${whereClause} ORDER BY n.created_at DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM zalish_invoices n WHERE ${whereClause.replace(/\$(\d+)/g, (m, x) => `$${Number(x) - 2}`)}`;

    const [items, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(2)),
    ]);

    // Also fetch items for the returned invoices so they can be viewed
    const invoices = items.rows;
    if (invoices.length > 0) {
      const ids = invoices.map((i) => i.id);
      const { rows: lineItems } = await db.query(
        `SELECT * FROM zalish_invoice_items WHERE invoice_id = ANY($1)`,
        [ids],
      );
      for (const inv of invoices) {
        inv.items = lineItems.filter((li) => li.invoice_id === inv.id);
      }
    }

    return NextResponse.json({
      items: invoices,
      total: Number(count.rows[0].count),
      totalPages: Math.ceil(Number(count.rows[0].count) / limit) || 1,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching invoices" },
      { status: 400 },
    );
  }
}
const number = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.customer_name || !Array.isArray(b.items) || !b.items.length)
    return NextResponse.json(
      { error: "Customer and at least one item are required" },
      { status: 400 },
    );
  const cleanItems = b.items.map((i: any) => ({
    ...i,
    quantity: number(i.quantity),
    unit_price: number(i.unit_price),
  }));
  if (cleanItems.some((i: any) => !i.item_name || i.quantity <= 0))
    return NextResponse.json(
      {
        error: "Every invoice item needs a name and quantity greater than zero",
      },
      { status: 400 },
    );
  const subtotal = roundMoney(
    cleanItems.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0),
  );
  const taxRate = number(b.tax_rate),
    tax = roundMoney((subtotal * taxRate) / 100),
    discount = Math.min(number(b.discount), roundMoney(subtotal + tax)),
    total = roundMoney(subtotal + tax - discount);
  const user = await getCurrentUser() || "system";
  const date = b.date || new Date().toLocaleDateString("en-CA");
  const result = await transaction(async (c) => {
    let advance: any = null;
    if (b.advance_id) {
      const a = await c.query(
        "SELECT * FROM zalish_advances WHERE id=$1 AND deleted_at IS NULL AND settled_invoice_id IS NULL FOR UPDATE",
        [b.advance_id],
      );
      advance = a.rows[0];
      if (!advance)
        throw new Error("Selected advance receipt is no longer available");
    }
    const dt = new Date(),
      base = `ZA-${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`;
    const n = await c.query(
      "SELECT invoice_number FROM zalish_invoices WHERE invoice_number LIKE $1",
      [`${base}/%`],
    );
    let nextNum = 1;
    if (n.rows.length > 0) {
      const max = Math.max(...n.rows.map((r: any) => {
        const parts = r.invoice_number.split("/");
        return parseInt(parts[parts.length - 1], 10) || 0;
      }));
      nextNum = max + 1;
    }
    const invoiceNumber = `${base}/${String(nextNum).padStart(2, "0")}`;
    const advanceAmount = Math.min(number(advance?.advance_amount), total),
      balance = roundMoney(total - advanceAmount);
    const paymentMode = b.payment_mode || "UPI";
    const paymentModeOther = paymentMode === "Other" ? b.payment_mode_other : null;
    const paymentStatus = b.payment_status || "PAID";
    const inv = await c.query(
      "INSERT INTO zalish_invoices(invoice_number,customer_name,customer_phone,customer_place,subtotal,discount,tax_rate,tax_amount,grand_total,advance_id,advance_amount,balance_due,date,created_by,assigned_to,payment_mode,payment_mode_other,payment_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *",
      [
        invoiceNumber,
        b.customer_name,
        b.customer_phone || null,
        b.customer_place || null,
        subtotal,
        discount,
        taxRate,
        tax,
        total,
        advance?.id || null,
        advanceAmount,
        balance,
        date,
        user,
        b.assigned_to || null,
        paymentMode,
        paymentModeOther,
        paymentStatus
      ],
    );
    for (const i of cleanItems) {
      const line = roundMoney(i.quantity * i.unit_price);
      await c.query(
        "INSERT INTO zalish_invoice_items(invoice_id,item_id,item_name,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6)",
        [
          inv.rows[0].id,
          i.item_id || null,
          i.item_name,
          i.quantity,
          i.unit_price,
          line,
        ],
      );
    }
    if (advance)
      await c.query(
        "UPDATE zalish_advances SET settled_invoice_id=$1 WHERE id=$2",
        [inv.rows[0].id, advance.id],
      );
    const finalInv = { ...inv.rows[0], items: cleanItems };
    await c.query(
      "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
      ["zalish_invoices", String(finalInv.id), "INSERT", user, JSON.stringify(finalInv)]
    );
    return finalInv;
  });
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) throw new Error("Invoice ID is required");
    const user = await getCurrentUser() || "system";
    
    if (!b.customer_name?.trim())
      throw new Error("Customer name is required");
    const cleanItems = (b.items || []).filter(
      (i: any) =>
        i.item_name &&
        Number.isFinite(Number(i.quantity)) &&
        Number.isFinite(Number(i.unit_price)),
    );
    if (cleanItems.length === 0) throw new Error("At least one valid item is required");
    const subtotal = roundMoney(
      cleanItems.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0),
    );
    const discount = roundMoney(Number(b.discount) || 0),
      taxRate = roundMoney(Number(b.tax_rate) || 0),
      tax = roundMoney((subtotal - discount) * (taxRate / 100)),
      total = roundMoney(subtotal - discount + tax);

    const result = await transaction(async (c) => {
      const { rows: oldInvRows } = await c.query("SELECT * FROM zalish_invoices WHERE id=$1 AND deleted_at IS NULL", [b.id]);
      if (!oldInvRows[0]) throw new Error("Invoice not found");
      const oldInvoice = oldInvRows[0];
      
      const { rows: oldItemsRows } = await c.query("SELECT * FROM zalish_invoice_items WHERE invoice_id=$1", [b.id]);
      const oldRecord = { ...oldInvoice, items: oldItemsRows };
      
      let advance: any = null;
      if (b.advance_id && b.advance_id !== oldInvoice.advance_id) {
        const a = await c.query("SELECT * FROM zalish_advances WHERE id=$1 AND deleted_at IS NULL AND settled_invoice_id IS NULL FOR UPDATE", [b.advance_id]);
        advance = a.rows[0];
        if (!advance) throw new Error("Selected advance receipt is no longer available");
      } else if (b.advance_id === oldInvoice.advance_id && oldInvoice.advance_id) {
         const a = await c.query("SELECT * FROM zalish_advances WHERE id=$1 FOR UPDATE", [oldInvoice.advance_id]);
         advance = a.rows[0];
      }
      
      const date = b.date || oldInvoice.date || new Date().toLocaleDateString("en-CA");
      const advanceAmount = Math.min(Number(advance?.advance_amount || 0), total);
      const balance = roundMoney(total - advanceAmount);
      const paymentMode = b.payment_mode || oldInvoice.payment_mode || "UPI";
      const paymentModeOther = paymentMode === "Other" ? b.payment_mode_other : null;

      const paymentStatus = b.payment_status || oldInvoice.payment_status || "PAID";

      const inv = await c.query(
        "UPDATE zalish_invoices SET customer_name=$1, customer_phone=$2, customer_place=$3, subtotal=$4, discount=$5, tax_rate=$6, tax_amount=$7, grand_total=$8, advance_id=$9, advance_amount=$10, balance_due=$11, date=$12, updated_by=$13, assigned_to=$14, payment_mode=$15, payment_mode_other=$16, is_edited=TRUE, payment_status=$17 WHERE id=$18 RETURNING *",
        [
          b.customer_name,
          b.customer_phone || null,
          b.customer_place || null,
          subtotal,
          discount,
          taxRate,
          tax,
          total,
          advance?.id || null,
          advanceAmount,
          balance,
          date,
          user,
          b.assigned_to || null,
          paymentMode,
          paymentModeOther,
          paymentStatus,
          b.id
        ],
      );

      if (oldInvoice.advance_id && oldInvoice.advance_id !== advance?.id) {
        await c.query("UPDATE zalish_advances SET settled_invoice_id=NULL WHERE id=$1", [oldInvoice.advance_id]);
      }
      if (advance && advance.id !== oldInvoice.advance_id) {
        await c.query("UPDATE zalish_advances SET settled_invoice_id=$1 WHERE id=$2", [b.id, advance.id]);
      }

      await c.query("DELETE FROM zalish_invoice_items WHERE invoice_id=$1", [b.id]);
      
      for (const i of cleanItems) {
        const line = roundMoney(i.quantity * i.unit_price);
        await c.query(
          "INSERT INTO zalish_invoice_items(invoice_id,item_id,item_name,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6)",
          [b.id, i.item_id || null, i.item_name, i.quantity, i.unit_price, line]
        );
      }
      
      const finalInv = { ...inv.rows[0], items: cleanItems };
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_invoices", String(finalInv.id), "UPDATE", user, JSON.stringify({ old: oldRecord, new: finalInv })]
      );
      return finalInv;
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const user = await getCurrentUser() || "system";
    await transaction(async (c) => {
      const inv = await c.query(
        "UPDATE zalish_invoices SET deleted_at=now(), updated_by=$1 WHERE id=$2 RETURNING *",
        [user, id],
      );
      if (inv.rows.length === 0) throw new Error("Invoice not found");
      const invoice = inv.rows[0];
      if (invoice.advance_id) {
        await c.query(
          "UPDATE zalish_advances SET settled_invoice_id=NULL WHERE id=$1",
          [invoice.advance_id],
        );
      }
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_invoices", String(id), "DELETE", user, JSON.stringify({ id, deleted_at: new Date().toISOString() })]
      );
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error deleting invoice" },
      { status: 400 },
    );
  }
}
