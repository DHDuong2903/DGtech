import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/src/utils";

interface PaymentBankInfoProps {
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  transactionContent?: string;
  checking: boolean;
  copied: string | null;
  onCopy: (text: string, field: string) => void;
  onCheckStatus: () => void;
}

export const PaymentBankInfo = ({
  bankCode,
  accountNumber,
  accountName,
  amount,
  transactionContent,
  checking,
  copied,
  onCopy,
  onCheckStatus,
}: PaymentBankInfoProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Hoặc chuyển khoản thủ công</h2>

      <div className="space-y-4">
        {/* Bank */}
        <div>
          <label className="text-sm text-gray-600">Ngân hàng</label>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mt-1">
            <span className="font-medium">{bankCode}</span>
          </div>
        </div>

        {/* Account Number */}
        <div>
          <label className="text-sm text-gray-600">Số tài khoản</label>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mt-1">
            <span className="font-medium">{accountNumber}</span>
            <button
              onClick={() => onCopy(accountNumber!, "số tài khoản")}
              className="text-orange-600 hover:text-orange-700"
            >
              {copied === "số tài khoản" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Account Name */}
        <div>
          <label className="text-sm text-gray-600">Tên tài khoản</label>
          <div className="bg-gray-50 p-3 rounded-lg mt-1">
            <span className="font-medium">{accountName}</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm text-gray-600">Số tiền</label>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mt-1">
            <span className="font-medium text-orange-600 text-lg">{formatCurrency(amount)}</span>
            <button
              onClick={() => onCopy(amount.toString(), "số tiền")}
              className="text-orange-600 hover:text-orange-700"
            >
              {copied === "số tiền" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-sm text-gray-600">Nội dung chuyển khoản</label>
          <div className="flex items-center justify-between bg-orange-50 border border-orange-200 p-3 rounded-lg mt-1">
            <span className="font-medium text-orange-600">{transactionContent}</span>
            <button
              onClick={() => onCopy(transactionContent!, "nội dung")}
              className="text-orange-600 hover:text-orange-700"
            >
              {copied === "nội dung" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            ⚠️ Vui lòng nhập chính xác nội dung để hệ thống tự động xác nhận
          </p>
        </div>
      </div>

      {/* Check Status Button */}
      <Button onClick={onCheckStatus} disabled={checking} className="w-full mt-6" variant="outline">
        {checking ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Đang kiểm tra...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Kiểm tra thanh toán
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center mt-3">Hệ thống tự động kiểm tra mỗi 10 giây</p>
    </Card>
  );
};
