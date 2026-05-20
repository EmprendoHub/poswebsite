import UpdateProductDetails from "../../_components/UpdateProductDetails";
import { getOneProduct } from "@/app/_actions";

const ProductDetailsPage = async ({ params }: { params: any }) => {
  const data = await getOneProduct(params.slug);
  const product = JSON.parse(data.product);

  return <UpdateProductDetails product={product} />;
};

export default ProductDetailsPage;
