import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline - FoodShare",
  description: "You are currently offline. Check your internet connection.",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <WifiOff className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        It looks like you&apos;ve lost your internet connection. Some features may be unavailable
        until you&apos;re back online.
      </p>
      <Button
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
        className="min-w-[120px]"
      >
        Try again
      </Button>
    </div>
  );
}
