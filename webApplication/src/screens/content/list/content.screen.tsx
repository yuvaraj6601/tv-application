import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ContentLibraryItemModel, DashboardContentType, contentService } from '../../../services/content.service';
import { ContentThumbnail } from '../../../components/common/content-thumbnail/content-thumbnail.component';
import { Toast } from '../../../components/common/toast/toast.component';
import { ContentSortBy, ContentTypeFilterValue, filterSortAndPaginateContent, getContentDisplayName } from '../../../utils/functions.utils';
import './content.screen.scss';

const PAGE_SIZE = 10;

const formatUploadedAt = (value: string): string => {
  const date = new Date(value);
  const datePart = date.toLocaleDateString('en-GB');
  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
};

export const ContentScreen = (): React.JSX.Element => {
  const [state, setState] = useState<{ items: ContentLibraryItemModel[]; isLoading: boolean; error: string }>({
    items: [],
    isLoading: false,
    error: ''
  });
  const [uploadType, setUploadType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilterValue>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<ContentSortBy>('NEWEST');
  const [page, setPage] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    setPage(1);
  }, [typeFilter, searchTerm, sortBy]);

  const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSelectedFile(event.target.files && event.target.files.length > 0 ? event.target.files[0] : null);
  };

  const handleConfirmUpload = async (): Promise<void> => {
    if (!selectedFile) {
      return;
    }

    try {
      await contentService.uploadToLibrary({ type: uploadType, file: selectedFile });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const filterCounts = useMemo(
    () => ({
      ALL: state.items.length,
      IMAGE: state.items.filter(item => item.type === 'IMAGE').length,
      VIDEO: state.items.filter(item => item.type === 'VIDEO').length,
      WEBPAGE: state.items.filter(item => item.type === 'WEBPAGE').length
    }),
    [state.items]
  );

  const paginatedResult = useMemo(
    () => filterSortAndPaginateContent(state.items, { typeFilter, searchTerm, sortBy, page, pageSize: PAGE_SIZE }),
    [state.items, typeFilter, searchTerm, sortBy, page]
  );

  const rangeStart = paginatedResult.totalItems === 0 ? 0 : (paginatedResult.page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(paginatedResult.page * PAGE_SIZE, paginatedResult.totalItems);

  return (
    <section className="content-screen">
      <header className="content-screen__header">
        <div className="content-screen__heading">
          <p className="content-screen__eyebrow">Digital Signage Control</p>
          <h1>Content Management</h1>
          <p>All images and videos uploaded across your devices. Deleting an item removes it from every device it&apos;s used on.</p>
        </div>
        <div className="content-screen__upload">
          <select
            value={uploadType}
            onChange={event => {
              setUploadType(event.target.value as 'IMAGE' | 'VIDEO');
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            <option value="IMAGE">IMAGE</option>
            <option value="VIDEO">VIDEO</option>
          </select>
          <button type="button" className="content-screen__file-picker" onClick={() => fileInputRef.current?.click()}>
            Choose file
            <span>{selectedFile ? selectedFile.name : 'No file chosen'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="content-screen__file-input"
            accept={uploadType === 'IMAGE' ? 'image/*' : 'video/*'}
            onChange={handleSelectFile}
          />
          <button type="button" className="content-screen__upload-button" disabled={!selectedFile} onClick={handleConfirmUpload}>
            + Upload
          </button>
        </div>
      </header>

      <div className="content-screen__toolbar">
        <div className="content-screen__filters">
          {(['ALL', 'IMAGE', 'VIDEO'] as ContentTypeFilterValue[]).map(filter => (
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
        <div className="content-screen__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input placeholder="Search files..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />
        </div>
        <select value={sortBy} onChange={event => setSortBy(event.target.value as ContentSortBy)}>
          <option value="NEWEST">Sort: Newest</option>
          <option value="OLDEST">Sort: Oldest</option>
          <option value="NAME">Sort: Name</option>
        </select>
      </div>

      {state.error ? <p className="content-screen__error">{state.error}</p> : null}
      {state.isLoading ? <p className="content-screen__loading">Loading content...</p> : null}
      {!state.isLoading && !state.error && state.items.length === 0 ? (
        <p className="content-screen__empty">No content uploaded yet. Upload an image or video to get started.</p>
      ) : null}
      {!state.isLoading && !state.error && state.items.length > 0 && paginatedResult.totalItems === 0 ? (
        <p className="content-screen__empty">No content matches this filter.</p>
      ) : null}

      {paginatedResult.totalItems > 0 ? (
        <>
          <div className="content-screen__table-wrapper">
            <table className="content-table">
              <thead>
                <tr>
                  <th>Thumbnail</th>
                  <th>Type</th>
                  <th>File Name</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResult.items.map(item => (
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
                      <span className="content-table__uploaded">{formatUploadedAt(item.createdAt)}</span>
                    </td>
                    <td>
                      <button type="button" className="content-table__delete" aria-label="Delete content" onClick={() => handleDelete(item.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path
                            d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7h14Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="content-screen__pagination">
            <span>
              Showing {rangeStart} to {rangeEnd} of {paginatedResult.totalItems} items
            </span>
            <div className="content-screen__pagination-controls">
              <button type="button" disabled={paginatedResult.page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                &lt;
              </button>
              {Array.from({ length: paginatedResult.totalPages }, (_value, index) => index + 1).map(pageNumber => (
                <button
                  type="button"
                  key={pageNumber}
                  className={pageNumber === paginatedResult.page ? 'content-screen__pagination-controls--active' : ''}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                disabled={paginatedResult.page >= paginatedResult.totalPages}
                onClick={() => setPage(prev => Math.min(paginatedResult.totalPages, prev + 1))}
              >
                &gt;
              </button>
            </div>
          </div>
        </>
      ) : null}

      {toastState ? <Toast message={toastState.message} type={toastState.type} onClose={() => setToastState(null)} /> : null}
    </section>
  );
};
