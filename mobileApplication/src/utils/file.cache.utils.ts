import RNFS from 'react-native-fs';
import { PlaylistItemModel } from '../types/app.types';

const rootPath = `${RNFS.DocumentDirectoryPath}/signage-cache`;
const stagingPath = `${rootPath}/staging`;
const activePath = `${rootPath}/active`;

const resolveExtension = (fileName?: string, mimeType?: string): string => {
  if (fileName && fileName.includes('.')) {
    return fileName.substring(fileName.lastIndexOf('.'));
  }

  if (!mimeType) {
    return '';
  }

  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    return '.jpg';
  }
  if (mimeType.includes('png')) {
    return '.png';
  }
  if (mimeType.includes('webp')) {
    return '.webp';
  }
  if (mimeType.includes('mp4')) {
    return '.mp4';
  }
  if (mimeType.includes('webm')) {
    return '.webm';
  }
  return '';
};

const ensurePath = async (path: string): Promise<void> => {
  const exists = await RNFS.exists(path);
  if (!exists) {
    await RNFS.mkdir(path);
  }
};

export const fileCacheUtils = {
  prepareCacheDirectories: async (): Promise<void> => {
    await ensurePath(rootPath);
    await ensurePath(stagingPath);
    await ensurePath(activePath);
  },
  replaceAllContent: async (items: PlaylistItemModel[]): Promise<PlaylistItemModel[]> => {
    await fileCacheUtils.prepareCacheDirectories();
    await RNFS.unlink(stagingPath).catch(() => undefined);
    await RNFS.mkdir(stagingPath);

    const nextItems: PlaylistItemModel[] = [];

    for (const item of items) {
      if (item.type === 'WEBPAGE') {
        const webpageFileName = `${item.id}-${item.order}.html`;
        const webpageDestinationPath = `${stagingPath}/${webpageFileName}`;

        try {
          const webpageResponse = await fetch(item.url);
          const webpageHtml = await webpageResponse.text();
          await RNFS.writeFile(webpageDestinationPath, webpageHtml, 'utf8');

          nextItems.push({
            ...item,
            localPath: `${activePath}/${webpageFileName}`
          });
        } catch (_error) {
          // Keep fallback remote URL for cases where local webpage caching fails.
          nextItems.push(item);
        }

        continue;
      }

      const extension = resolveExtension(item.fileName, item.fileMimeType);
      const fileName = `${item.id}-${item.order}${extension}`;
      const destinationPath = `${stagingPath}/${fileName}`;

      if (item.fileData) {
        await RNFS.writeFile(destinationPath, item.fileData, 'base64');
      } else {
        await RNFS.downloadFile({ fromUrl: item.url, toFile: destinationPath, connectionTimeout: 30000, readTimeout: 60000 }).promise;
      }

      nextItems.push({
        ...item,
        localPath: `${activePath}/${fileName}`
      });
    }

    await RNFS.unlink(activePath).catch(() => undefined);
    await RNFS.moveFile(stagingPath, activePath);
    await RNFS.mkdir(stagingPath);
    return nextItems;
  }
};
