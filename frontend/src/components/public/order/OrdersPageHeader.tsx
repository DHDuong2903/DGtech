interface OrdersPageHeaderProps {
  orderCount: number;
}

export const OrdersPageHeader = ({ orderCount }: OrdersPageHeaderProps) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Đơn hàng của bạn</h1>
      <p className="text-gray-600">{orderCount} đơn hàng</p>
    </div>
  );
};
