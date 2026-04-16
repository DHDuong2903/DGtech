import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
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
      <h2 className="text-xl font-semibold mb-4">Or transfer manually</h2>

      <div className="space-y-4">
        {/* Bank */}
        <div>
          <label className="text-muted-foreground text-sm">Bank</label>
          <div className="bg-muted mt-1 flex items-center justify-between rounded-lg p-3">
            <span className="font-medium">{bankCode}</span>
          </div>
        </div>

        {/* Account Number */}
        <div>
          <label className="text-muted-foreground text-sm">Account number</label>
          <div className="bg-muted mt-1 flex items-center justify-between rounded-lg p-3">
            <span className="font-medium">{accountNumber}</span>
            <button
              onClick={() => onCopy(accountNumber!, "account number")}
              className="text-orange-600 hover:text-orange-700"
            >
              {copied === "account number" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Account Name */}
        <div>
          <label className="text-muted-foreground text-sm">Account name</label>
          <div className="bg-muted mt-1 rounded-lg p-3">
            <span className="font-medium">{accountName}</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-muted-foreground text-sm">Amount</label>
          <div className="bg-muted mt-1 flex items-center justify-between rounded-lg p-3">
            <span className="font-medium text-orange-600 text-lg">{formatCurrency(amount)}</span>
            <button
              onClick={() => onCopy(amount.toString(), "amount")}
              className="text-orange-600 hover:text-orange-700"
            >
              {copied === "amount" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-muted-foreground text-sm">Transfer reference</label>
          <div className="flex items-center justify-between bg-orange-50 border border-orange-200 p-3 rounded-lg mt-1">
            <span className="font-medium text-orange-600">{transactionContent}</span>
            <button
              onClick={() => onCopy(transactionContent!, "transfer reference")}
              className="text-orange-600 hover:text-orange-700"
            >
              {copied === "transfer reference" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            ⚠️ Enter the reference exactly so we can match your payment automatically
          </p>
        </div>
      </div>

      {/* Check Status Button */}
      <Button onClick={onCheckStatus} disabled={checking} className="w-full mt-6" variant="outline">
        {checking ? (
          <>
            <Spinner data-icon="inline-start" />
            Checking status
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Check payment status
          </>
        )}
      </Button>

      <p className="text-muted-foreground mt-3 text-center text-xs">We check automatically every 10 seconds</p>
    </Card>
  );
};
