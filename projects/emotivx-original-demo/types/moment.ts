export type DataLine = {
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

export type ViewPort = {
  Start: number;
  End: number;
  AspectRatio?: string;
  Seat?: {
    Section?: string;
    Row?: string;
    Seat?: string;
  };
  Coordinates?: {
    Latitude?: number;
    Longitude?: number;
    Altitude?: number;
  };
};

export type NILTag = {
  Name: string;
  Value: string | number;
  Share?: number;
};

export type RightsTag = {
  PartnerID?: string;
  OpportunityID?: string;
  CampaignID?: string;
  PartnerCampaignID?: string;
};

export interface MomentSource {
  FeedProvider: string;
  MatchID: string;
  EventID: string;
  RulesetVersion: string;
  IngestRunID?: string;
}

export interface MomentPlayer {
  PlayerID: string;
  Name: string;
  Team: string;
  Role?: string;
}

export interface MomentMatch {
  HomeTeam: string;
  AwayTeam: string;
  Venue?: string;
  Kickoff?: string;
}

export interface MomentObject {
  MomentID: string;
  Source: MomentSource;
  Timestamp: string;
  Sport: string;
  League: string;
  Competition?: string;
  Match: MomentMatch;
  MomentType: string;
  Title: string;
  Description?: string;
  Players: MomentPlayer[];
  DataLines: DataLine[];
  ViewPort?: ViewPort;
  NILTags: NILTag[];
  Rights?: RightsTag;
  Integrity?: {
    Checksum?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
  };
}
