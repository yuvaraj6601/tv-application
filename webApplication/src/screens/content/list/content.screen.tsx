import React, { useEffect, useMemo, useState } from 'react';
import { ContentLibraryItemModel, DashboardContentType, contentService } from '../../../services/content.service';
import { ContentThumbnail } from '../../../components/common/content-thumbnail/content-thumbnail.component';
import { Toast } from '../../../components/common/toast/toast.component';
import { getContentDisplayName } from '../../../utils/functions.utils';
import './content.screen.scss';

type ContentTypeFilter = 'ALL' | DashboardContentType;

export const ContentScreen = (): React.JSX.Element => {
  const [state, setState] = useState<{ items: ContentLibraryItemModel[]; isLoading: boolean; error: string }>({
    items: [],
    isLoading: false,
    error: ''
  });
  const [uploadType, setUploadType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilter>('ALL');
  const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadLibrary = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));
    try {
      const items = await contentService.listLibrary();
      setState({ items, isLoading: false, error: '' });
    } catch (_error) {
      setState({ items: [], isLoading: false, error: 'Failed to load content library.' });
    }
  };

  useEffect(() => {
    loadLibrary().catch(() => undefined);
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    try {
      await contentService.uploadToLibrary({ type: uploadType, file: event.target.files[0] });
      event.target.value = '';
      setToastState({ message: 'Content uploaded successfully.', type: 'success' });
      await loadLibrary();
    } catch (_error) {
      setToastState({ message: 'Failed to upload content.', type: 'error' });
    }
  };

  const handleDelete = async (contentId: string): Promise<void> => {
    try {
      await contentService.deleteFromLibrary(contentId);
      setToastState({ message: 'Content deleted from all devices.', type: 'success' });
      await loadLibrary();
    } catch (_error) {
      setToastState({ message: 'Failed to delete content.', type: 'error' });
    }
  };

  const filteredItems = useMemo(
    () => (typeFilter === 'ALL' ? state.items : state.items.filter(item => item.type === typeFilter)),
    [state.items, typeFilter]
  );

  const filterCounts = useMemo(
    () => ({
      ALL: state.items.length,
      IMAGE: state.items.filter(item => item.type === 'IMAGE').length,
      VIDEO: state.items.filter(item => item.type === 'VIDEO').length,
      WEBPAGE: state.items.filter(item => item.type === 'WEBPAGE').length
    }),
    [state.items]
  );

  return (
    <section className="content-screen">
      <header className="content-screen__header">
        <div className="content-screen__heading">
          <p className="content-screen__eyebrow">Digital Signage Control</p>
          <h1>Content Management</h1>
          <p>All images and videos uploaded across your devices. Deleting an item removes it from every device it&apos;s used on.</p>
        </div>
        <div className="content-screen__upload">
          <select value={uploadType} onChange={event => setUploadType(event.target.value as 'IMAGE' | 'VIDEO')}>
            <option value="IMAGE">IMAGE</option>
            <option value="VIDEO">VIDEO</option>
          </select>
          <input type="file" accept={uploadType === 'IMAGE' ? 'image/*' : 'video/*'} onChange={handleUpload} />
        </div>
      </header>

      <div className="content-screen__filters">
        {(['ALL', 'IMAGE', 'VIDEO'] as ContentTypeFilter[]).map(filter => (
          <button
            type="button"
            key={filter}
            className={`content-screen__filter${typeFilter === filter ? ' content-screen__filter--active' : ''}`}
            onClick={() => setTypeFilter(filter)}
          >
            {filter === 'ALL' ? 'All' : filter === 'IMAGE' ? 'Images' : 'Videos'} ({filterCounts[filter]})
          </button>
        ))}
      </div>

      {state.error ? <p className="content-screen__error">{state.error}</p> : null}
      {state.isLoading ? <p className="content-screen__loading">Loading content...</p> : null}
      {!state.isLoading && !state.error && state.items.length === 0 ? (
        <p className="content-screen__empty">No content uploaded yet. Upload an image or video to get started.</p>
      ) : null}
      {!state.isLoading && !state.error && state.items.length > 0 && filteredItems.length === 0 ? (
        <p className="content-screen__empty">No content matches this filter.</p>
      ) : null}

      {filteredItems.length > 0 ? (
        <div className="content-screen__table-wrapper">
          <table className="content-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Type</th>
                <th>File Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <ContentThumbnail type={item.type} url={item.url} fileName={item.fileName} hideInfo />
                  </td>
                  <td>
                    <span className="content-table__type">{item.type}</span>
                  </td>
                  <td>
                    <span className="content-table__name" title={getContentDisplayName(item.fileName, item.url, item.type)}>
                      {getContentDisplayName(item.fileName, item.url, item.type)}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="content-table__delete" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {toastState ? <Toast message={toastState.message} type={toastState.type} onClose={() => setToastState(null)} /> : null}
    </section>
  );
};
