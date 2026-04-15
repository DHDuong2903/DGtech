"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserStore } from "../../../stores";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { AdminContentLoader } from "../../../components/admin/AdminLoading";
import { createAdminUserColumns } from "../../../components/admin/AdminUserTable";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { DataTable } from "@/src/components/ui/data-table";
import { Users } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../../../types";

const AdminUsersPage = () => {
  const { users, user: currentUser, loading, fetchAllUsers, updateUserRole, deleteUser, deleteUsers } = useUserStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<User[] | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleSetRole = useCallback(
    async (user: User, role: "user" | "admin") => {
      if (user.role === role) return;
      try {
        await updateUserRole(user.clerkId, role);
      } catch {
        /* toast in store */
      }
    },
    [updateUserRole],
  );

  const handleDeleteClick = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      createAdminUserColumns({
        currentUserClerkId: currentUser?.clerkId,
        onSetRole: handleSetRole,
        onDelete: handleDeleteClick,
      }),
    [currentUser?.clerkId, handleSetRole, handleDeleteClick],
  );

  const actionableFromSelection = useCallback(
    (selected: User[]) => selected.filter((u) => u.clerkId !== currentUser?.clerkId),
    [currentUser?.clerkId],
  );

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      await deleteUser(selectedUser.clerkId);
      setDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      await deleteUsers(bulkDeleteTargets.map((u) => u.clerkId));
      setBulkDeleteTargets(null);
      clearTableSelectionRef.current?.();
    } catch (error) {
      console.error("Error bulk deleting users:", error);
    } finally {
      setBulkWorking(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Users Management</h1>
          </div>
        </div>

        {loading ? (
          <AdminContentLoader />
        ) : users.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No users yet</h3>
            <p className="text-muted-foreground mt-2">Users will appear here after they sign up.</p>
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={users}
            getRowId={(row) => row.clerkId}
            filterColumnId="email"
            filterPlaceholder="Search by email…"
            noun="users"
            bulkSelectionActions={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              const actionable = actionableFromSelection(selectedData);
              const selectedCount = selectedData.length;
              const skipped = selectedCount - actionable.length;

              return (
                <>
                  <span className="text-muted-foreground text-sm font-medium">
                    {selectedCount} selected
                    {skipped > 0 ? ` (${skipped} skipped: your account)` : ""}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={!actionable.length}
                    onClick={() => {
                      if (!actionable.length) {
                        toast.error("No users can be deleted (only your account is selected).");
                        return;
                      }
                      setBulkDeleteTargets(actionable);
                    }}
                  >
                    Delete selected
                  </Button>
                </>
              );
            }}
          />
        )}
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.username || selectedUser?.email}</strong>? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={updating}>
              {updating ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Deleting
                </>
              ) : (
                "Delete user"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} users?</DialogTitle>
            <DialogDescription>
              This cannot be undone
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteTargets(null)} disabled={bulkWorking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteConfirm} disabled={bulkWorking}>
              {bulkWorking ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Deleting
                </>
              ) : (
                "Delete all"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsersPage;
