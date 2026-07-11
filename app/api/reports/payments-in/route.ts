import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const page = parseInt(p.get("page") || "1");
    const limit = parseInt(p.get("limit") || "20");
    const offset = (page - 1) * limit;
    
    const search = p.get("search") || "";
    const startDate = p.get("startDate") || "";
    const endDate = p.get("endDate") || "";
    const mode = p.get("mode") || "All";

    const searchPattern = search ? `%${search}%` : "";

    let filterQuery = `
      WHERE ($1 = '' OR customer_name ILIKE $2 OR bill_number ILIKE $2 OR receipt_number ILIKE $2)
        AND ($3 = 'All' OR payment_mode = $3)
    `;
    const params: any[] = [search ? "1" : "", searchPattern, mode];

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
          id, 'invoice' as record_type, COALESCE(date, created_at) as date, invoice_number as bill_number, 
          NULL as receipt_number, customer_name, assigned_to, 
          grand_total as amount, payment_mode, payment_mode_other 
        FROM zalish_invoices 
        WHERE deleted_at IS NULL AND grand_total > 0
        
        UNION ALL
        
        SELECT 
          id, 'advance' as record_type, COALESCE(date, issued_at) as date, NULL as bill_number, 
          receipt_number, customer_name, assigned_to, 
          advance_amount as amount, payment_mode, payment_mode_other 
        FROM zalish_advances 
        WHERE deleted_at IS NULL AND advance_amount > 0
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

    const { rows } = await db.query(query, params);

    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Structure raw property for ReceiptView/ExpenseView
    const items = rows.map(r => {
      const { total_count, ...rest } = r;
      return {
        ...rest,
        raw: {
          id: r.id,
          type: r.record_type,
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

    return NextResponse.json({ items, totalPages, currentPage: page });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching payments-in" },
      { status: 400 },
    );
  }
}
