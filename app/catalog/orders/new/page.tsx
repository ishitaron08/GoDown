import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ product?: string }>;
}

export default async function CatalogOrderNewPage({ searchParams }: Props) {
  const params = await searchParams;
  const product = params.product;

  if (product) {
    redirect(`/dashboard/orders?product=${product}`);
  }

  redirect("/dashboard/orders");
}
