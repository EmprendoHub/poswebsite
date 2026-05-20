import React from "react";
import ProfileOrdersInner from "./_components/ProfileOrdersInner";

const UserOrdersPage = async ({ searchParams }: { searchParams: any }) => {
  const urlParams = {
    keyword: searchParams.keyword,
    page: searchParams.page,
  };

  return <ProfileOrdersInner searchParams={urlParams} />;
};

export default UserOrdersPage;
