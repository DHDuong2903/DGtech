"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
  title?: string;
  description?: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  /** Shown on the confirm button while `confirmLoading` (e.g. "Deleting"). */
  confirmBusyLabel?: string;
  confirmLoading?: boolean;
}

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = "category",
  title,
  description,
  cancelLabel = "Hủy",
  confirmLabel = "Xóa",
  confirmBusyLabel,
  confirmLoading = false,
}: DeleteConfirmModalProps) => {
  const capitalizedType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
  const dialogTitle = title ?? `Xóa ${capitalizedType}`;
  const dialogDescription =
    description ?? (
      <>
        Bạn có chắc là muốn xóa <span className="font-semibold text-foreground">{itemName}</span>? Hành động này không
        thể hoàn tác.
      </>
    );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle>{dialogTitle}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{dialogDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={confirmLoading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onConfirm} disabled={confirmLoading}>
            {confirmLoading ? (
              <>
                <Spinner data-icon="inline-start" />
                {confirmBusyLabel ??
                  (confirmLabel === "Delete"
                    ? "Deleting"
                    : confirmLabel === "Xóa"
                      ? "Đang xóa"
                      : confirmLabel)}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
