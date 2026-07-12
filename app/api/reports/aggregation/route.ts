import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const range = p.get("range") || "current_month"; // "current_month", "all", "custom"
    const start = p.get("start");
    const end = p.get("end");

    let invoiceDateFilter = "";
    let advanceDateFilter = "";
    let expenseDateFilter = "";
    
    if (range === "current_month") {
      invoiceDateFilter = `AND date_trunc('month', i.date) = date_trunc('month', current_date)`;
      advanceDateFilter = `AND date_trunc('month', date) = date_trunc('month', current_date)`;
      expenseDateFilter = `AND date_trunc('month', COALESCE(e.expense_date, e.date, e.created_at)) = date_trunc('month', current_date)`;
    } else if (range === "custom" && start && end) {
      invoiceDateFilter = `AND i.date >= '${start}' AND i.date <= '${end}'`;
      advanceDateFilter = `AND date >= '${start}' AND date <= '${end}'`;
      expenseDateFilter = `AND COALESCE(e.expense_date, e.date, e.created_at) >= '${start}' AND COALESCE(e.expense_date, e.date, e.created_at) <= '${end}'`;
    }

    const { rows: invoices } = await db.query(`
      SELECT i.*, a.receipt_number as advance_receipt_number 
      FROM zalish_invoices i 
      LEFT JOIN zalish_advances a ON a.id = i.advance_id 
      WHERE i.deleted_at IS NULL ${invoiceDateFilter}
    `);

    const { rows: advances } = await db.query(`
      SELECT * FROM zalish_advances 
      WHERE deleted_at IS NULL AND settled_invoice_id IS NULL ${advanceDateFilter}
    `);

    const { rows: expenses } = await db.query(`
      SELECT e.*, c.name as category_name 
      FROM zalish_expenses e 
      LEFT JOIN zalish_expense_categories c ON c.id=e.category_id 
      WHERE e.deleted_at IS NULL ${expenseDateFilter}
    `);

    let items: any[] = [];
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const i of invoices) {
      const amount = Number(i.grand_total);
      totalInflow += amount;
      items.push({
        id: i.id,
        record_type: "invoice",
        type: "Credit",
        description: `Bill #: ${i.invoice_number}${i.advance_receipt_number ? ` (Advance used: ${i.advance_receipt_number})` : ''}`,
        assigned_to: i.assigned_to,
        date: i.date || i.created_at,
        amount: amount,
        raw: { ...i, type: "invoice" },
      });
    }

    for (const a of advances) {
      const amount = Number(a.advance_amount);
      totalInflow += amount;
      items.push({
        id: a.id,
        record_type: "advance",
        type: "Credit",
        description: `Advance Receipt #: ${a.receipt_number}`,
        assigned_to: a.assigned_to,
        date: a.date || a.created_at,
        amount: amount,
        raw: { ...a, type: "advance" },
      });
    }

    for (const e of expenses) {
      const amount = Number(e.amount);
      totalOutflow += amount;
      items.push({
        id: e.id,
        record_type: "expense",
        type: "Debit",
        description: `Expense: ${e.expense_name} (${e.category_name || "Uncategorised"})`,
        assigned_to: e.assigned_to,
        date: e.expense_date || e.date || e.created_at,
        amount: amount,
        raw: { ...e, type: "expense" },
      });
    }

    items.sort((a, b) => {
      const dA = new Date(a.date).getTime();
      const dB = new Date(b.date).getTime();
      return dB - dA;
    });

    const profit = totalInflow - totalOutflow;

    return NextResponse.json({
      summary: {
        inflow: totalInflow,
        outflow: totalOutflow,
        profit: profit
      },
      items
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching aggregation details" },
      { status: 400 },
    );
  }
}
