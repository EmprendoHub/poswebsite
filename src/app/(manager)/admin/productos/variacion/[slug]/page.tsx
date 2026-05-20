import EditVariationProduct from "../../_components/EditVariationProduct";
import { getOneProduct } from "@/app/_actions";
import { getCookiesName } from "@/backend/helpers";
import { cookies } from "next/headers";

const ProductDetailsPage = async ({ params }: { params: any }) => {
  const nextCookies = cookies();
  const cookieName = getCookiesName();
  const nextAuthSessionToken = nextCookies.get(cookieName);
  const currentCookies = `${cookieName}=${nextAuthSessionToken?.value}`;

  const data = await getOneProduct(params.slug, false);
  const product = JSON.parse(data.product);

  return (
    <EditVariationProduct product={product} currentCookies={currentCookies} />
  );
};

export default ProductDetailsPage;
