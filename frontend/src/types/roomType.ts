export interface Room {
  roomId: number;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomFormData {
  name: string;
  description: string;
}
