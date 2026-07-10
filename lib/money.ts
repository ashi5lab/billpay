export const rupees = (value: number | string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
