// Open Charge Map API response types

export interface OCMConnectionType {
  ID: number;
  Title: string;
  FormalName: string | null;
  IsDiscontinued: boolean | null;
}

export interface OCMStatusType {
  ID: number;
  Title: string;
  IsOperational: boolean | null;
}

export interface OCMOperatorInfo {
  ID: number;
  WebsiteURL: string | null;
  Title: string;
  PhonePrimaryContact: string | null;
}

export interface OCMConnection {
  ID: number;
  ConnectionTypeID: number;
  ConnectionType: OCMConnectionType;
  PowerKW: number | null;
  Quantity: number | null;
  StatusTypeID: number | null;
  StatusType: OCMStatusType | null;
}

export interface OCMAddressInfo {
  ID: number;
  Title: string;
  AddressLine1: string | null;
  Town: string | null;
  StateOrProvince: string | null;
  CountryID: number;
  Latitude: number;
  Longitude: number;
  ContactTelephone1: string | null;
}

export interface OCMStation {
  ID: number;
  UUID: string;
  DataProvider: { ID: number; Title: string };
  OperatorInfo: OCMOperatorInfo | null;
  StatusType: OCMStatusType | null;
  AddressInfo: OCMAddressInfo;
  Connections: OCMConnection[];
  NumberOfPoints: number | null;
}
