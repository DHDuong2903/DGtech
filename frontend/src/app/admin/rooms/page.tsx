"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DoorOpen, Plus } from "lucide-react";
import { AdminLayout } from "@/src/components/admin/AdminLayout";
import { AdminContentLoader } from "@/src/components/admin/AdminLoading";
import { createAdminRoomColumns } from "@/src/components/admin/AdminRoomTable";
import { ADMIN_LIST_DATA_TABLE_PROPS } from "@/src/constant";
import { RoomModal } from "@/src/components/admin/RoomModal";
import { DeleteConfirmModal } from "@/src/components/admin/DeleteConfirmModal";
import { useRoomStore } from "@/src/stores";
import type { Room } from "@/src/types";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { DataTable } from "@/src/components/ui/data-table";
import { Alert, AlertDescription } from "@/src/components/ui/alert";

const RoomsPage = () => {
  const { rooms, loading, error, fetchRooms, createRoom, updateRoom, deleteRoom, deleteRooms } = useRoomStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Room[] | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const clearTableSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async (roomData: Omit<Room, "roomId" | "createdAt" | "updatedAt">) => {
    const result = await createRoom(roomData);
    return result.success;
  };

  const handleUpdateRoom = async (roomData: Omit<Room, "roomId" | "createdAt" | "updatedAt">) => {
    if (!selectedRoom) return false;
    const result = await updateRoom(selectedRoom.roomId, roomData);
    if (result.success) setSelectedRoom(null);
    return result.success;
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    setDeleteWorking(true);
    try {
      const result = await deleteRoom(selectedRoom.roomId);
      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedRoom(null);
      }
    } finally {
      setDeleteWorking(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteTargets?.length) return;
    setBulkWorking(true);
    try {
      const result = await deleteRooms(bulkDeleteTargets.map((room) => room.roomId));
      if (result.success) {
        setBulkDeleteTargets(null);
        clearTableSelectionRef.current?.();
      }
    } finally {
      setBulkWorking(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedRoom(null);
    setIsModalOpen(true);
  };

  const handleEditClick = useCallback((room: Room) => {
    setModalMode("edit");
    setSelectedRoom(room);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((room: Room) => {
    setSelectedRoom(room);
    setIsDeleteModalOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      createAdminRoomColumns({
        onEdit: handleEditClick,
        onDelete: handleDeleteClick,
      }),
    [handleEditClick, handleDeleteClick],
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Room</h1>
          </div>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4" />
            Add room
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <AdminContentLoader />
        ) : rooms.length === 0 ? (
          <div className="py-12 text-center">
            <DoorOpen className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No rooms yet</h3>
            <p className="text-muted-foreground mt-2">Add your first room type to organize 3D scenes.</p>
            <Button onClick={openCreateModal} className="mt-4" size="sm">
              <Plus className="h-4 w-4" />
              Add room
            </Button>
          </div>
        ) : (
          <DataTable
            {...ADMIN_LIST_DATA_TABLE_PROPS}
            columns={columns}
            data={rooms}
            getRowId={(row) => String(row.roomId)}
            filterColumnId="name"
            filterPlaceholder="Search by name..."
            noun="rooms"
            onBulkDelete={({ selectedData, clearSelection }) => {
              clearTableSelectionRef.current = clearSelection;
              setBulkDeleteTargets(selectedData);
            }}
          />
        )}
      </div>

      <RoomModal
        key={selectedRoom?.roomId ?? "new"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoom(null);
        }}
        onSave={modalMode === "create" ? handleCreateRoom : handleUpdateRoom}
        room={selectedRoom}
        mode={modalMode}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRoom(null);
        }}
        onConfirm={handleDeleteRoom}
        itemName={selectedRoom?.name ?? ""}
        itemType="room"
        title="Delete room"
        description={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">{selectedRoom?.name}</span>? This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmLoading={deleteWorking}
      />

      <Dialog open={!!bulkDeleteTargets} onOpenChange={(open) => !open && setBulkDeleteTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {bulkDeleteTargets?.length ?? 0} rooms?</DialogTitle>
            <DialogDescription>This cannot be undone</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteTargets(null)} disabled={bulkWorking}>
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

export default RoomsPage;
