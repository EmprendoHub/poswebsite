import React from "react";

const BlogCategoriesSlugPage = ({ params }: { params: any }) => {
  const slug = params.slug;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-4xl font-EB_Garamond">Categoría</h2>
      <p>{slug}</p>
    </div>
  );
};

export default BlogCategoriesSlugPage;
