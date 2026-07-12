import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const type = p.get("type");
    
    if (!type) throw new Error("Missing type parameter");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Billing App';

    // Helper functions for sheets
    const addInflowSheet = async (sheetName: string, modeFilter: string = "All") => {
      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Bill/Receipt #', key: 'reference', width: 20 },
        { header: 'Customer', key: 'customer_name', width: 30 },
        { header: 'Assigned To', key: 'assigned_to', width: 20 },
        { header: 'Payment Mode', key: 'payment_mode', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 }
      ];

      const { rows: invoices } = await db.query(
        "SELECT invoice_number as reference, 'Invoice' as type, customer_name, assigned_to, date, payment_mode, payment_mode_other, grand_total as amount FROM zalish_invoices WHERE deleted_at IS NULL AND grand_total > 0"
      );
      const { rows: advances } = await db.query(
        "SELECT receipt_number as reference, 'Advance' as type, customer_name, assigned_to, date, payment_mode, payment_mode_other, advance_amount as amount FROM zalish_advances WHERE deleted_at IS NULL AND advance_amount > 0 AND settled_invoice_id IS NULL"
      );
      
      let allInflow = [...invoices, ...advances].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (modeFilter !== "All") {
        allInflow = allInflow.filter(r => r.payment_mode === modeFilter || (modeFilter === "Other" && r.payment_mode === "Other"));
      }

      let total = 0;
      for (const row of allInflow) {
        sheet.addRow({
          date: row.date ? new Date(row.date).toLocaleDateString() : '',
          type: row.type,
          reference: row.reference,
          customer_name: row.customer_name,
          assigned_to: row.assigned_to || '',
          payment_mode: row.payment_mode === 'Other' ? row.payment_mode_other : row.payment_mode,
          amount: Number(row.amount)
        });
        total += Number(row.amount);
      }
      sheet.addRow({});
      sheet.addRow({ customer_name: 'Total', amount: total }).font = { bold: true };
    };

    const addOutflowSheet = async (sheetName: string, modeFilter: string = "All") => {
      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Expense Name', key: 'expense_name', width: 30 },
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Assigned To', key: 'assigned_to', width: 20 },
        { header: 'Payment Mode', key: 'payment_mode', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 }
      ];

      const { rows: expenses } = await db.query(
        "SELECT e.expense_name, COALESCE(e.expense_date, e.date, e.created_at) as date, e.amount, e.payment_mode, e.payment_mode_other, e.assigned_to, c.name as category FROM zalish_expenses e LEFT JOIN zalish_expense_categories c ON c.id=e.category_id WHERE e.deleted_at IS NULL ORDER BY e.date ASC"
      );
      
      let allOutflow = expenses;
      if (modeFilter !== "All") {
        allOutflow = allOutflow.filter(r => r.payment_mode === modeFilter || (modeFilter === "Other" && r.payment_mode === "Other"));
      }

      let total = 0;
      for (const row of allOutflow) {
        sheet.addRow({
          date: row.date ? new Date(row.date).toLocaleDateString() : '',
          expense_name: row.expense_name,
          category: row.category || 'Uncategorised',
          assigned_to: row.assigned_to || '',
          payment_mode: row.payment_mode === 'Other' ? row.payment_mode_other : row.payment_mode,
          amount: Number(row.amount)
        });
        total += Number(row.amount);
      }
      sheet.addRow({});
      sheet.addRow({ category: 'Total', amount: total }).font = { bold: true };
    };

    const addAllInvoicesSheet = async () => {
      const sheet = workbook.addWorksheet("All Invoices");
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Invoice #', key: 'invoice_number', width: 20 },
        { header: 'Customer', key: 'customer_name', width: 30 },
        { header: 'Assigned To', key: 'assigned_to', width: 20 },
        { header: 'Payment Mode', key: 'payment_mode', width: 20 },
        { header: 'Advance Adjusted', key: 'advance_adjusted', width: 20 },
        { header: 'Advance Receipt #', key: 'advance_receipt_number', width: 20 },
        { header: 'Grand Total', key: 'grand_total', width: 15 }
      ];

      const { rows: invoices } = await db.query(`
        SELECT i.*, a.receipt_number as advance_receipt_number, a.advance_amount 
        FROM zalish_invoices i 
        LEFT JOIN zalish_advances a ON a.id = i.advance_id 
        WHERE i.deleted_at IS NULL 
        ORDER BY i.date ASC
      `);

      let total = 0;
      for (const row of invoices) {
        sheet.addRow({
          date: row.date ? new Date(row.date).toLocaleDateString() : '',
          invoice_number: row.invoice_number,
          customer_name: row.customer_name,
          assigned_to: row.assigned_to || '',
          payment_mode: row.payment_mode === 'Other' ? row.payment_mode_other : row.payment_mode,
          advance_adjusted: row.advance_amount ? Number(row.advance_amount) : 0,
          advance_receipt_number: row.advance_receipt_number || '',
          grand_total: Number(row.grand_total)
        });
        total += Number(row.grand_total);
      }
      sheet.addRow({});
      sheet.addRow({ advance_receipt_number: 'Total', grand_total: total }).font = { bold: true };
    };

    // Routing based on type
    if (type === "payments-in") {
      await addInflowSheet("All Inbound");
      await addInflowSheet("UPI", "UPI");
      await addInflowSheet("Cash", "Cash");
      await addInflowSheet("Card", "Card");
    } else if (type === "payments-out") {
      await addOutflowSheet("All Outbound");
      await addOutflowSheet("UPI", "UPI");
      await addOutflowSheet("Cash", "Cash");
      await addOutflowSheet("Card", "Card");
    } else if (type === "payments-all") {
      await addInflowSheet("Payments IN (All)");
      await addOutflowSheet("Payments OUT (All)");
    } else if (type === "all-invoices") {
      await addAllInvoicesSheet();
    } else if (type === "all-expenses") {
      await addOutflowSheet("All Expenses");
    } else {
      throw new Error("Unknown download type");
    }

    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Report_${type}_${new Date().toLocaleDateString("en-CA")}.xlsx"`,
      }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error exporting report" },
      { status: 400 },
    );
  }
}
