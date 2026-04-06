export const LoadingState = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground mt-4">Loading orders…</p>
      </div>
    </div>
  );
};
