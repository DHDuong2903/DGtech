"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserStore } from "../../../stores";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { AdminContentLoader } from "../../../components/admin/AdminLoading";
import { createAdminUserColumns } from "../../../components/admin/AdminUserTable";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Card } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
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
import { usersApi } from "@/src/apis/userApi";
import { formatCurrency } from "@/src/utils/formatUtil";
import type { RankSettings, User } from "../../../types";

const DEFAULT_RANK_SETTINGS: RankSettings = {
  bronzeMax: 5_000_000,
  silverMax: 20_000_000,
  cancelPenaltyUnit: 500_000,
};

const AdminUsersPage = () => {
  const { users, user: currentUser, loading, fetchAllUsers, updateUserRole, deleteUser, deleteUsers } = useUserStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<User[] | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [rankSettings, setRankSettings] = useState<RankSettings>(DEFAULT_RANK_SETTINGS);
  const [rankDraft, setRankDraft] = useState<RankSettings>(DEFAULT_RANK_SETTINGS);
  const [rankSaving, setRankSaving] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  useEffect(() => {
    let active = true;
    usersApi
      .adminGetRankConfig()
      .then(({ settings }) => {
        if (!active) return;
        setRankSettings(settings);
        setRankDraft(settings);
      })
      .catch((error) => {
        console.error("Error loading rank settings:", error);
        toast.error("Could not load rank settings");
      });

    return () => {
      active = false;
    };
  }, []);

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

  const rankDirty =
    Number(rankDraft.bronzeMax) !== Number(rankSettings.bronzeMax) ||
    Number(rankDraft.silverMax) !== Number(rankSettings.silverMax) ||
    Number(rankDraft.cancelPenaltyUnit) !== Number(rankSettings.cancelPenaltyUnit);

  const handleSaveRankSettings = async () => {
    const bronzeMax = Math.max(0, Number(rankDraft.bronzeMax) || 0);
    const silverMax = Math.max(0, Number(rankDraft.silverMax) || 0);
    const cancelPenaltyUnit = Math.max(0, Number(rankDraft.cancelPenaltyUnit) || 0);

    if (silverMax <= bronzeMax) {
      toast.error("Silver max must be greater than Bronze max");
      return;
    }

    setRankSaving(true);
    try {
      const { settings } = await usersApi.adminPutRankConfig({ settings: { bronzeMax, silverMax, cancelPenaltyUnit } });
      setRankSettings(settings);
      setRankDraft(settings);
      toast.success("Rank settings saved");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not save rank settings";
      toast.error(msg);
    } finally {
      setRankSaving(false);
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

        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Membership Tier Settings</h2>
                <p className="text-muted-foreground text-sm">
                  Define tier thresholds and canceled-order penalty used to calculate each user membership tier.
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleSaveRankSettings} disabled={rankSaving || !rankDirty}>
                {rankSaving ? (
                  <>
                    <Spinner className="size-3" data-icon="inline-start" />
                    Saving
                  </>
                ) : (
                  "Save settings"
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="bronze-max">Bronze max (VND)</Label>
                <Input
                  id="bronze-max"
                  type="number"
                  min={0}
                  step={100000}
                  value={rankDraft.bronzeMax}
                  onChange={(e) => setRankDraft((s) => ({ ...s, bronzeMax: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="silver-max">Silver max (VND)</Label>
                <Input
                  id="silver-max"
                  type="number"
                  min={0}
                  step={100000}
                  value={rankDraft.silverMax}
                  onChange={(e) => setRankDraft((s) => ({ ...s, silverMax: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cancel-penalty">Cancel penalty (VND / order)</Label>
                <Input
                  id="cancel-penalty"
                  type="number"
                  min={0}
                  step={50000}
                  value={rankDraft.cancelPenaltyUnit}
                  onChange={(e) => setRankDraft((s) => ({ ...s, cancelPenaltyUnit: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Tier thresholds:
                Bronze &lt; {formatCurrency(Number(rankSettings.bronzeMax))}, Silver from{" "}
                {formatCurrency(Number(rankSettings.bronzeMax))} to below {formatCurrency(Number(rankSettings.silverMax))},
                Gold from {formatCurrency(Number(rankSettings.silverMax))}.
              </p>
              <p className="mt-1">
                Canceled-order penalty: {formatCurrency(Number(rankSettings.cancelPenaltyUnit))} per canceled order.
              </p>
            </div>
          </div>
        </Card>

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
            onBulkDelete={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              const actionable = actionableFromSelection(selectedData);
              if (!actionable.length) {
                toast.error("No users can be deleted (only your account is selected).");
                return;
              }
              setBulkDeleteTargets(actionable);
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
            <Button variant="destructive" size="sm" onClick={handleDeleteUser} disabled={updating}>
              {updating ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Deleting user
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
            <Button variant="destructive" size="sm" onClick={handleBulkDeleteConfirm} disabled={bulkWorking}>
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
