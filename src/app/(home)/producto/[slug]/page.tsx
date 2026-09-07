import { getOneProduct, getOneProductWithTrending } from "@/app/_actions";
import ProductDetailsComponent from "../_components/ProductDetailsComponent";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: any,
) {
  const { slug } = await params;
  // fetch data
  console.log(
    "🔍 [ProductDetailsPage] Fetching product data for slug:",
    slug,
  );
  const data = await getOneProduct(slug, false);
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

const ProductDetailsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const data: any = await getOneProductWithTrending(slug, "");
  const product = JSON.parse(data.product);
  const trendingProducts = JSON.parse(data?.trendingProducts);

  // Fetch taxonomy lookups for displaying resolved names
  let taxonomyLookup = { mainCategories: [], subCategories: [], attributes: [] };
  try {
    const [mainRes, subRes, attrRes] = await Promise.all([
      fetch("http://localhost:3000/api/categories?kind=main", { cache: "force-cache" }),
      fetch("http://localhost:3000/api/categories?kind=sub", { cache: "force-cache" }),
      fetch("http://localhost:3000/api/categories?kind=attribute", { cache: "force-cache" }),
    ]);
    const mainData = await mainRes.json();
    const subData = await subRes.json();
    const attrData = await attrRes.json();
    taxonomyLookup = {
      mainCategories: mainData?.categories ?? [],
      subCategories: subData?.categories ?? [],
      attributes: attrData?.categories ?? [],
    };
  } catch (error) {
    console.error("Error fetching taxonomy lookups:", error);
  }

  return (
    <>
      <ProductDetailsComponent
        product={product}
        trendingProducts={trendingProducts}
        taxonomyLookup={taxonomyLookup}
      />
    </>
  );
};

export default ProductDetailsPage;
