import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const p = new URL(req.url).searchParams;
    const name = p.get("name") || "";
    const type = p.get("type") || "All"; // All, Inflow, Outflow
    const mode = p.get("mode") || "All"; // All, UPI, Cash, Card, Other
    const startDate = p.get("startDate") || "";
    const endDate = p.get("endDate") || "";
    const search = p.get("search") || "";
    const page = parseInt(p.get("page") || "1");
    const limit = Math.min(100, Math.max(1, parseInt(p.get("limit") || "10")));
    const offset = (page - 1) * limit;

    if (!name) {
      return NextResponse.json({ error: "User name parameter is required" }, { status: 400 });
    }

    const searchPattern = search ? `%${search}%` : "";

    let filterQuery = `
      WHERE assigned_to = $1
        AND ($2 = 'All' OR record_type = $2)
        AND ($3 = 'All' OR (CASE WHEN $3 = 'Other' THEN payment_mode NOT IN ('UPI', 'Cash', 'Card') ELSE payment_mode = $3 END))
        AND ($4 = '' OR customer_name ILIKE $5 OR bill_number ILIKE $5 OR receipt_number ILIKE $5)
    `;
    const params: any[] = [name, type, mode, search ? "1" : "", searchPattern];

    if (startDate) {
      params.push(startDate);
      filterQuery += ` AND date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      filterQuery += ` AND date <= $${params.length}`;
    }

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(limit, offset);

    const query = `
      WITH combined AS (
        SELECT 
          id, 'Inflow' as record_type, COALESCE(date, created_at) as date, invoice_number as bill_number, 
          NULL as receipt_number, customer_name, assigned_to, 
          grand_total as amount, payment_mode, payment_mode_other 
        FROM zalish_invoices 
        WHERE deleted_at IS NULL AND grand_total > 0
        
        UNION ALL
        
        SELECT 
          id, 'Inflow' as record_type, COALESCE(date, issued_at) as date, NULL as bill_number, 
          receipt_number, customer_name, assigned_to, 
          advance_amount as amount, payment_mode, payment_mode_other 
        FROM zalish_advances 
        WHERE deleted_at IS NULL AND advance_amount > 0

        UNION ALL

        SELECT 
          e.id, 'Outflow' as record_type, COALESCE(e.expense_date, e.date, e.created_at) as date, e.expense_name as bill_number, 
          NULL as receipt_number, c.name as customer_name, e.assigned_to, 
          e.amount, e.payment_mode, e.payment_mode_other
        FROM zalish_expenses e
        LEFT JOIN zalish_expense_categories c ON c.id = e.category_id
        WHERE e.deleted_at IS NULL
      ),
      filtered AS (
        SELECT * FROM combined
        ${filterQuery}
      )
      SELECT *, (SELECT COUNT(*) FROM filtered) as total_count 
      FROM filtered
      ORDER BY date DESC, id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    // Query for filtered totals
    // (Notice we don't apply pagination limit here)
    const summaryQuery = `
      WITH combined AS (
        SELECT 
          id, 'Inflow' as record_type, COALESCE(date, created_at) as date, invoice_number as bill_number, 
          NULL as receipt_number, customer_name, assigned_to, 
          grand_total as amount, payment_mode, payment_mode_other 
        FROM zalish_invoices 
        WHERE deleted_at IS NULL AND grand_total > 0
        
        UNION ALL
        
        SELECT 
          id, 'Inflow' as record_type, COALESCE(date, issued_at) as date, NULL as bill_number, 
          receipt_number, customer_name, assigned_to, 
          advance_amount as amount, payment_mode, payment_mode_other 
        FROM zalish_advances 
        WHERE deleted_at IS NULL AND advance_amount > 0

        UNION ALL

        SELECT 
          e.id, 'Outflow' as record_type, COALESCE(e.expense_date, e.date, e.created_at) as date, e.expense_name as bill_number, 
          NULL as receipt_number, c.name as customer_name, e.assigned_to, 
          e.amount, e.payment_mode, e.payment_mode_other
        FROM zalish_expenses e
        LEFT JOIN zalish_expense_categories c ON c.id = e.category_id
        WHERE e.deleted_at IS NULL
      ),
      filtered AS (
        SELECT * FROM combined
        ${filterQuery}
      )
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE record_type = 'Inflow'), 0)::float as total_inflow,
        COALESCE(SUM(amount) FILTER (WHERE record_type = 'Outflow'), 0)::float as total_outflow
      FROM filtered
    `;

    const summaryParams = params.slice(0, params.length - 2);

    const [dataRes, summaryRes] = await Promise.all([
      db.query(query, params),
      db.query(summaryQuery, summaryParams)
    ]);

    const rows = dataRes.rows;
    const summary = summaryRes.rows[0] || { total_inflow: 0, total_outflow: 0 };

    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const items = rows.map(r => {
      const { total_count, ...rest } = r;
      // Map back to format suitable for ReceiptView / ExpenseView
      return {
        ...rest,
        raw: r.record_type === "Outflow" ? {
          id: r.id,
          type: "expense",
          expense_name: r.bill_number,
          category_name: r.customer_name,
          assigned_to: r.assigned_to,
          payment_mode: r.payment_mode,
          payment_mode_other: r.payment_mode_other,
          expense_date: r.date,
          amount: r.amount
        } : {
          id: r.id,
          type: r.receipt_number ? "advance" : "invoice",
          customer_name: r.customer_name,
          assigned_to: r.assigned_to,
          payment_mode: r.payment_mode,
          payment_mode_other: r.payment_mode_other,
          date: r.date,
          invoice_number: r.bill_number,
          receipt_number: r.receipt_number,
          grand_total: r.amount,
          advance_amount: r.amount
        }
      };
    });

    return NextResponse.json({ items, totalPages, currentPage: page, summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching user report details" },
      { status: 400 },
    );
  }
}
