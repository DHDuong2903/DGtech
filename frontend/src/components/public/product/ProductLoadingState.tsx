export const ProductLoadingState = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground mt-4">Loading product…</p>
      </div>
    </div>
  );
};
