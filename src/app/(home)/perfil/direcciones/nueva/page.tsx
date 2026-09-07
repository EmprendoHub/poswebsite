import NewAddress from "../../_components/NewAddress";
import React from "react";

const NewAddressPage = async ({
  searchParams,
}: {
  searchParams: Promise<any>;
}) => {
  const resolvedSearchParams = await searchParams;
  return <NewAddress searchParams={resolvedSearchParams} />;
};

export default NewAddressPage;
