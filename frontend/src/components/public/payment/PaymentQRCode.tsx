import { Card } from "@/src/components/ui/card";
import Image from "next/image";

interface PaymentQRCodeProps {
  qrCodeUrl?: string;
}

export const PaymentQRCode = ({ qrCodeUrl }: PaymentQRCodeProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Quét mã QR để thanh toán</h2>
      {qrCodeUrl && (
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <Image src={qrCodeUrl} alt="QR Code" width={300} height={300} className="w-full h-auto" />
        </div>
      )}
      <p className="text-sm text-gray-600 mt-4 text-center">Sử dụng app ngân hàng để quét mã QR</p>
    </Card>
  );
};
