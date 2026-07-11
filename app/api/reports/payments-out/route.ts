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
      WHERE ($1 = '' OR customer_name ILIKE $2 OR bill_number ILIKE $2)
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
      WITH base AS (
        SELECT 
          e.id, 'expense' as record_type, e.expense_name as bill_number, 
          NULL as receipt_number, c.name as customer_name, e.assigned_to, 
          e.amount, e.payment_mode, e.payment_mode_other, COALESCE(e.expense_date, e.date, e.created_at) as date
        FROM zalish_expenses e
        LEFT JOIN zalish_expense_categories c ON c.id = e.category_id
        WHERE e.deleted_at IS NULL
      ),
      filtered AS (
        SELECT * FROM base
        ${filterQuery}
      )
      SELECT *, (SELECT COUNT(*) FROM filtered) as total_count 
      FROM filtered
      ORDER BY date DESC, id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    // Note: We mapped `expense_name` to `bill_number` and `category_name` to `customer_name` 
    // so that it works seamlessly with the generic DataTable columns we'll use in Reports.

    const { rows } = await db.query(query, params);

    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const items = rows.map(r => {
      const { total_count, ...rest } = r;
      return {
        ...rest,
        raw: {
          id: r.id,
          type: "expense",
          expense_name: r.bill_number,
          category_name: r.customer_name,
          assigned_to: r.assigned_to,
          payment_mode: r.payment_mode,
          payment_mode_other: r.payment_mode_other,
          expense_date: r.date,
          amount: r.amount
        }
      };
    });

    return NextResponse.json({ items, totalPages, currentPage: page });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching payments-out" },
      { status: 400 },
    );
  }
}
