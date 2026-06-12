import { getOneProduct, getOneProductAdmin } from "@/app/_actions";
import ViewProductDetails from "../../_components/ViewProductDetails";

export async function generateMetadata(
  { params }: { params: any },
  parent: any,
) {
  // fetch data
  const data = await getOneProduct(params.slug, false);
  const product = JSON.parse(data.product);

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: product.title,
    description: product.description,
    openGraph: {
      images: [`${product.variations[0].image}`, ...previousImages],
    },
  };
}

const AdminViewProduct = async ({ params }: { params: any }) => {
  const data: any = await getOneProductAdmin(params.slug);
  const product = JSON.parse(data.product);
  return (
    <>
      <ViewProductDetails product={product} trendingProducts={[]} />
    </>
  );
};

export default AdminViewProduct;
