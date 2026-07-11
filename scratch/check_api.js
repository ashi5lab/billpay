const fs = require('fs');

// Fix app/api/invoices/route.ts search
let invoice = fs.readFileSync('app/api/invoices/route.ts', 'utf8');
invoice = invoice.replace(
  'whereClause += ` AND (i.invoice_number ILIKE $${paramCount} OR i.customer_name ILIKE $${paramCount} OR i.customer_phone ILIKE $${paramCount})`;',
  'whereClause += ` AND (i.invoice_number ILIKE $${paramCount} OR i.customer_name ILIKE $${paramCount} OR i.customer_phone ILIKE $${paramCount})`;'
);
// Wait, actually let's check what the current search clause is in those files.
