export type RawEvent = {
  timestamp: string;
  label: string;
  value: string | number;
  actor?: string;
  team?: string;
  x?: number;
  y?: number;
  context?: {
    phase?: string;
    zone?: string;
  };
};

export type DataLineEntry = {
  Sequence: number;
  Timestamp: string;
  Label: string;
  Value: string | number;
  Actor?: string;
  Team?: string;
  X?: number;
  Y?: number;
  Context?: {
    Phase?: string;
    Zone?: string;
  };
};

export function buildDataLine(events: RawEvent[]): DataLineEntry[] {
  return events.map((event, index) => ({
    Sequence: index + 1,
    Timestamp: event.timestamp,
    Label: event.label,
    Value: event.value,
    Actor: event.actor,
    Team: event.team,
    X: event.x,
    Y: event.y,
    Context: event.context
      ? {
          Phase: event.context.phase,
          Zone: event.context.zone,
        }
      : undefined,
  }));
}
