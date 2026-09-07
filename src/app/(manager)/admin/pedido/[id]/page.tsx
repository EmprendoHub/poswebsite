import AdminOneOrder from "../_components/AdminOneOrder";
import { getOneOrder } from "@/app/_actions";

const AdminOneOrderPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const resolvedParams = await params;
  const data: any = await getOneOrder(resolvedParams.id);
  const order = JSON.parse(data.order);
  const deliveryAddress = JSON.parse(data.deliveryAddress);
  const orderPayments = JSON.parse(data.orderPayments);
  const customer = JSON.parse(data.customer);
  return (
    <div>
      <AdminOneOrder
        order={order}
        customer={customer}
        id={resolvedParams?.id}
        deliveryAddress={deliveryAddress}
        orderPayments={orderPayments}
        currentCookies={""}
      />
    </div>
  );
};

export default AdminOneOrderPage;
