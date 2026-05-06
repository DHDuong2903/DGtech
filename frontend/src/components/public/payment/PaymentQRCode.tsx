import { Card } from "@/src/components/ui/card";
import Image from "next/image";

interface PaymentQRCodeProps {
  qrCodeUrl?: string;
}

export const PaymentQRCode = ({ qrCodeUrl }: PaymentQRCodeProps) => {
  return (
    <Card className="overflow-hidden gap-0 p-0 shadow-none border-border">
      <div className="border-b bg-muted/30 p-3">
        <h2 className="text-foreground font-semibold">Scan QR code to pay</h2>
      </div>
      <div className="p-4">
        {qrCodeUrl ? (
          <div className="bg-card border-border mx-auto max-w-[350px] rounded-lg border-2 p-4">
            <Image
              src={qrCodeUrl}
              alt="QR Code"
              width={350}
              height={350}
              className="h-auto w-full"
              priority
            />
          </div>
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg bg-muted/50 border-2 border-dashed">
            <p className="text-muted-foreground text-sm">Generating QR code...</p>
          </div>
        )}
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Use your banking app to scan the QR code for instant payment
        </p>
      </div>
    </Card>
  );
};
