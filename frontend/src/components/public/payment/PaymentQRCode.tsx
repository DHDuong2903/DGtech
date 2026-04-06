import { Card } from "@/src/components/ui/card";
import Image from "next/image";

interface PaymentQRCodeProps {
  qrCodeUrl?: string;
}

export const PaymentQRCode = ({ qrCodeUrl }: PaymentQRCodeProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Scan QR code to pay</h2>
      {qrCodeUrl && (
        <div className="bg-card border-border rounded-lg border-2 p-4">
          <Image src={qrCodeUrl} alt="QR Code" width={300} height={300} className="w-full h-auto" />
        </div>
      )}
      <p className="text-muted-foreground mt-4 text-center text-sm">Use your banking app to scan the QR code</p>
    </Card>
  );
};
