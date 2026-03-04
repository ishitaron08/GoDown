import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getStockStatus(
  quantity: number,
  minStockLevel: number
): "in-stock" | "low-stock" | "out-of-stock" {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= minStockLevel) return "low-stock";
  return "in-stock";
}

export function stockStatusLabel(status: string) {
  const map: Record<string, string> = {
    "in-stock": "In Stock",
    "low-stock": "Low Stock",
    "out-of-stock": "Out of Stock",
  };
  return map[status] ?? status;
}

export function generateSKU(name: string, category: string): string {
  const namePart = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const catPart = category.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${catPart}-${namePart}-${random}`;
}
