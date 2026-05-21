export type ContentType = 'IMAGE' | 'VIDEO' | 'WEBPAGE';

export interface DeviceStateModel {
  deviceId: string | null;
  deviceUniqueId: string | null;
  pairingCode: string | null;
  isPaired: boolean;
  deviceToken: string | null;
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
