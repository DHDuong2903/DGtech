export const ProductLoadingState = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Đang tải sản phẩm...</p>
      </div>
    </div>
  );
};
