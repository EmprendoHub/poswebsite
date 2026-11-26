import UpdateAddress from "../../_components/UpdateAddress";
import React from "react";

const UserAddressPage = async ({ params }: { params: any }) => {
  const { id } = await params;
  return <UpdateAddress id={id} />;
};

export default UserAddressPage;
