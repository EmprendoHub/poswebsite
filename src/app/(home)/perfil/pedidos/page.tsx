import React from "react";
import ProfileOrdersInner from "./_components/ProfileOrdersInner";

const UserOrdersPage = async ({
  searchParams,
}: {
  searchParams: Promise<any>;
}) => {
  const resolvedSearchParams = await searchParams;
  const urlParams = {
    keyword: resolvedSearchParams.keyword,
    page: resolvedSearchParams.page,
  };

  return <ProfileOrdersInner searchParams={urlParams} />;
};

export default UserOrdersPage;
