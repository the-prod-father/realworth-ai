
'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadIcon, XIcon, CameraIcon } from './icons';

interface FileUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const ImagePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);

    // Cleanup function to revoke the object URL when the component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative group aspect-square">
      <img
        src={imageUrl}
        alt={file.name}
        className="w-full h-full object-cover rounded-lg bg-slate-100 border"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-white/80 text-slate-800 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
        aria-label="Remove file"
      >
        <XIcon />
      </button>
    </div>
  );
};

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (newFiles) {
      const fileList = Array.from(newFiles);
      setFiles(prev => [...prev, ...fileList].slice(-5)); // Limit to 5 files
    }
  }, [setFiles]);

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if(e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2 text-center">Upload photos of your item</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex flex-col justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-teal-500 bg-teal-50 hover:bg-teal-100">
          <CameraIcon className="mx-auto h-10 w-10 text-teal-500" />
          <p className="mt-2 text-sm font-semibold text-teal-700">Take a Picture</p>
        </button>
        <div onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop} onClick={() => fileInputRef.current?.click()} className={`flex flex-col justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-teal-400 bg-teal-50' : 'border-slate-300 hover:border-slate-400'}`}>
          <UploadIcon className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-semibold text-teal-600">Upload files</span> or drag & drop
          </p>
        </div>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" aria-label="Take a picture" />
      <input ref={fileInputRef} type="file" multiple accept="image/*,.heic,.heif" onChange={onFileChange} className="hidden" aria-label="File upload" />

      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Selected Images:</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {files.map((file, index) => (
              <ImagePreview
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
