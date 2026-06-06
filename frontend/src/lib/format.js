export const formatCurrency = (n, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n || 0));

export const formatDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

export const truncate = (s, n = 64) =>
  !s ? "" : s.length > n ? s.slice(0, n - 1) + "…" : s;
