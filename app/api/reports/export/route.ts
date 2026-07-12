import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Billing App';
    
    // Inflow
    const inflowSheet = workbook.addWorksheet('Cash Inflow');
    inflowSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Reference', key: 'reference', width: 20 },
      { header: 'Customer', key: 'customer_name', width: 30 },
      { header: 'Assigned To', key: 'assigned_to', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 }
    ];

    const { rows: invoices } = await db.query(
      "SELECT invoice_number as reference, 'Invoice' as type, customer_name, assigned_to, date, grand_total as amount FROM zalish_invoices WHERE deleted_at IS NULL"
    );
    const { rows: advances } = await db.query(
      "SELECT receipt_number as reference, 'Advance' as type, customer_name, assigned_to, date, advance_amount as amount FROM zalish_advances WHERE deleted_at IS NULL"
    );
    
    const allInflow = [...invoices, ...advances].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let totalInflow = 0;
    for (const row of allInflow) {
      inflowSheet.addRow({
        date: row.date ? new Date(row.date).toLocaleDateString() : '',
        type: row.type,
        reference: row.reference,
        customer_name: row.customer_name,
        assigned_to: row.assigned_to || '',
        amount: Number(row.amount)
      });
      totalInflow += Number(row.amount);
    }
    
    inflowSheet.addRow({});
    inflowSheet.addRow({ customer_name: 'Total Inflow', amount: totalInflow }).font = { bold: true };

    // Outflow
    const outflowSheet = workbook.addWorksheet('Cash Outflow (Expenses)');
    outflowSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Expense Name', key: 'expense_name', width: 30 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Assigned To', key: 'assigned_to', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 }
    ];

    const { rows: expenses } = await db.query(
      "SELECT e.expense_name, e.date, e.amount, e.assigned_to, c.name as category FROM zalish_expenses e LEFT JOIN zalish_expense_categories c ON c.id=e.category_id WHERE e.deleted_at IS NULL ORDER BY e.date ASC"
    );
    
    let totalOutflow = 0;
    for (const row of expenses) {
      outflowSheet.addRow({
        date: row.date ? new Date(row.date).toLocaleDateString() : '',
        expense_name: row.expense_name,
        category: row.category || 'Uncategorised',
        assigned_to: row.assigned_to || '',
        amount: Number(row.amount)
      });
      totalOutflow += Number(row.amount);
    }

    outflowSheet.addRow({});
    outflowSheet.addRow({ category: 'Total Outflow', amount: totalOutflow }).font = { bold: true };

    // Aggregator
    const pnlSheet = workbook.addWorksheet('Profit and Loss');
    pnlSheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Amount', key: 'amount', width: 20 }
    ];

    pnlSheet.addRow({ metric: 'Total Cash Inflow', amount: totalInflow });
    pnlSheet.addRow({ metric: 'Total Cash Outflow', amount: totalOutflow });
    pnlSheet.addRow({});
    pnlSheet.addRow({ metric: 'Net Profit', amount: totalInflow - totalOutflow }).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Billing_Report_${new Date().toLocaleDateString("en-CA")}.xlsx"`,
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error exporting report" },
      { status: 400 },
    );
  }
}
