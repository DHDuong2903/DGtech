export const LoadingState = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Đang tải đơn hàng...</p>
      </div>
    </div>
  );
};
