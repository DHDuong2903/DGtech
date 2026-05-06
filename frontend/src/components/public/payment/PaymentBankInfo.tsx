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
    <Card className="overflow-hidden gap-0 p-0 shadow-none border-border">
      <div className="border-b bg-muted/30 p-3">
        <h2 className="text-foreground font-semibold">Transfer manually</h2>
      </div>
      <div className="p-4 space-y-4">
        {/* Bank & Account Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground text-sm font-medium">Bank</label>
            <div className="bg-muted mt-1 flex h-10 items-center justify-between rounded-lg px-3">
              <span className="font-semibold text-sm">{bankCode}</span>
            </div>
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium">Account number</label>
            <div className="bg-muted mt-1 flex h-10 items-center justify-between rounded-lg px-3">
              <span className="font-semibold text-sm tabular-nums">{accountNumber}</span>
              <button
                onClick={() => onCopy(accountNumber!, "account number")}
                className="text-orange-600 hover:text-orange-700 transition-colors p-1 cursor-pointer"
                title="Copy account number"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Account Name */}
        <div>
          <label className="text-muted-foreground text-sm font-medium">Account name</label>
          <div className="bg-muted mt-1 flex h-10 items-center rounded-lg px-3">
            <span className="font-semibold text-sm uppercase">{accountName}</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-muted-foreground text-sm font-medium">Amount</label>
          <div className="bg-muted mt-1 flex h-10 items-center justify-between rounded-lg px-3">
            <span className="font-semibold text-sm text-orange-600 tabular-nums">
              {formatCurrency(amount)}
            </span>
            <button
              onClick={() => onCopy(amount.toString(), "amount")}
              className="text-orange-600 hover:text-orange-700 transition-colors p-1 cursor-pointer"
              title="Copy amount"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-muted-foreground text-sm font-medium">Transfer reference</label>
          <div className="bg-muted mt-1 flex h-10 items-center justify-between rounded-lg px-3">
            <span className="font-semibold text-sm text-orange-600 tracking-wide">{transactionContent}</span>
            <button
              onClick={() => onCopy(transactionContent!, "transfer reference")}
              className="text-orange-600 hover:text-orange-700 transition-colors p-1 cursor-pointer"
              title="Copy reference"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-orange-600 mt-2 font-medium flex items-center gap-1.5 leading-relaxed">
            Enter the reference exactly to ensure your payment is matched automatically.
          </p>
        </div>

        {/* Check Status Button */}
        <Button
          onClick={onCheckStatus}
          disabled={checking}
          className="w-full h-11 mt-2 font-semibold"
          variant="outline"
        >
          {checking ? (
            <>
              <Spinner data-icon="inline-start" />
              Verifying payment...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Check payment status
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
