interface OrdersPageHeaderProps {
  orderCount: number;
}

export const OrdersPageHeader = ({ orderCount }: OrdersPageHeaderProps) => {
  return (
    <div className="mb-8">
      <h1 className="text-foreground mb-2 text-3xl font-bold">Your orders</h1>
      <p className="text-muted-foreground">
        {orderCount} {orderCount === 1 ? "order" : "orders"}
      </p>
    </div>
  );
};
