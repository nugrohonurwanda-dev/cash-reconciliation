import { ShiftStatus } from "@prisma/client";

export const IMMUTABLE_SHIFT_STATUSES: ShiftStatus[] = [
  ShiftStatus.PENDING,
  ShiftStatus.PENDING_FINANCE,
  ShiftStatus.CLOSED,
];
