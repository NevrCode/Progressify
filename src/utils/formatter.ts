export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(value);
export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("id-ID");
