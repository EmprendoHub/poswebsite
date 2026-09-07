import EditVariationProduct from "../../_components/EditVariationProduct";
import { getOneProductForEdit } from "@/app/_actions";
import { getCookiesName } from "@/backend/helpers";
import { cookies } from "next/headers";

// Disable caching for this page to ensure fresh product data on every visit
export const revalidate = 0;
export const dynamic = "force-dynamic"; // Force dynamic rendering on every request

const ProductDetailsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const nextCookies = await cookies();
  const cookieName = getCookiesName();
  const nextAuthSessionToken = nextCookies.get(cookieName);
  const currentCookies = `${cookieName}=${nextAuthSessionToken?.value}`;

  const data = await getOneProductForEdit(slug, false);
  const product = JSON.parse(data.product);

  return (
    <EditVariationProduct
      key={product._id}
      product={product}
      currentCookies={currentCookies}
    />
  );
};

export default ProductDetailsPage;
