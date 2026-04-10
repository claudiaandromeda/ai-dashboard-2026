import { MomentObject } from "@/types/moment";

export function parseMoment(payload: unknown): MomentObject {
  return payload as MomentObject;
}
