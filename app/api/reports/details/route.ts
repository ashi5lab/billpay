import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const type = p.get("type");
    
    if (!["inflow", "outflow", "profit", "sales"].includes(type || "")) {
      throw new Error("Invalid report type");
    }

    let items: any[] = [];

    // The detail list for "inflow" intentionally includes unsettled advance receipts as their own line items
    // because they represent cash actually received, even though the summary card's headline number
    // (unchanged, from /api/reports) only sums invoice totals.
    
    if (type === "inflow" || type === "profit" || type === "sales") {
      const query = `
        SELECT n.*, a.receipt_number as advance_receipt_number 
        FROM zalish_invoices n 
        LEFT JOIN zalish_advances a ON a.id = n.advance_id 
        WHERE n.deleted_at IS NULL
      `;
      const invs = await db.query(query);
      const invoices = invs.rows;

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

      for (const i of invoices) {
        let amount = Number(i.grand_total);
        if (type === "sales") {
          amount = i.items.reduce((s: number, item: any) => s + Number(item.quantity) * Number(item.unit_price), 0);
        }
        items.push({
          id: i.id,
          record_type: "invoice",
          bill_number: i.invoice_number,
          receipt_number: null,
          advance_receipt_number: i.advance_receipt_number,
          assigned_to: i.assigned_to,
          date: i.date || i.created_at,
          amount: amount,
          raw: { ...i, type: "invoice" },
        });
      }
    }

    if (type === "inflow" || type === "profit") {
      const { rows: advances } = await db.query(
        "SELECT * FROM zalish_advances WHERE deleted_at IS NULL AND settled_invoice_id IS NULL"
      );
      for (const a of advances) {
        items.push({
          id: a.id,
          record_type: "advance",
          bill_number: null,
          receipt_number: a.receipt_number,
          advance_receipt_number: null,
          assigned_to: a.assigned_to,
          date: a.date || a.created_at,
          amount: Number(a.advance_amount),
          raw: { ...a, type: "advance" },
        });
      }
    }

    if (type === "outflow" || type === "profit") {
      const { rows: expenses } = await db.query(
        "SELECT e.*, c.name as category_name FROM zalish_expenses e LEFT JOIN zalish_expense_categories c ON c.id=e.category_id WHERE e.deleted_at IS NULL"
      );
      for (const e of expenses) {
        items.push({
          id: e.id,
          record_type: "expense",
          bill_number: null,
          receipt_number: null,
          advance_receipt_number: null,
          assigned_to: e.assigned_to,
          date: e.expense_date || e.date || e.created_at,
          amount: type === "profit" ? -Number(e.amount) : Number(e.amount),
          raw: e,
        });
      }
    }

    items.sort((a, b) => {
      const dA = new Date(a.date).getTime();
      const dB = new Date(b.date).getTime();
      if (dA !== dB) return dB - dA;
      const cA = new Date(a.raw?.created_at || a.date).getTime();
      const cB = new Date(b.raw?.created_at || b.date).getTime();
      return cB - cA;
    });

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching details" },
      { status: 400 },
    );
  }
}
