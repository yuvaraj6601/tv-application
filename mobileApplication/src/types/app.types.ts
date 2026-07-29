export type ContentType = 'IMAGE' | 'VIDEO' | 'WEBPAGE';

export type DeviceOrientation = 'PORTRAIT' | 'LANDSCAPE' | 'PORTRAIT_FLIP' | 'LANDSCAPE_FLIP';

export interface DeviceStateModel {
  deviceId: string | null;
  deviceUniqueId: string | null;
  pairingCode: string | null;
  isPaired: boolean;
  deviceToken: string | null;
  orientation: DeviceOrientation;
}

export interface PlaylistItemModel {
  id: string;
  type: ContentType;
  url: string;
  localPath: string;
  duration: number;
  order: number;
  fileName?: string;
  fileMimeType?: string;
  fileData?: string;
}
