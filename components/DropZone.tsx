import React, { useCallback } from 'react';
import { UploadedImage } from '../types';

interface DropZoneProps {
  onFilesSelected: (files: UploadedImage[]) => void;
  disabled?: boolean;
  label?: string;
  subLabel?: string;
  multiple?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ 
  onFilesSelected, 
  disabled, 
  label = "Upload Style References",
  subLabel = "Drag & drop or click to select",
  multiple = true
}) => {
  const id = React.useId();
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      
      const files = Array.from(e.dataTransfer.files) as File[];
      processFiles(files);
    },
    [disabled, onFilesSelected]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    Promise.all(
      validFiles.map(file => {
        return new Promise<UploadedImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            // Extract base64 part (remove data:image/xxx;base64,)
            const base64 = result.split(',')[1];
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              base64: base64,
              mimeType: file.type,
              preview: result
            });
          };
          reader.readAsDataURL(file);
        });
      })
    ).then(images => {
      onFilesSelected(images);
    });
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
        disabled 
          ? 'border-slate-700 bg-slate-800/50 opacity-50 cursor-not-allowed' 
          : 'border-indigo-500/50 bg-slate-800/50 hover:bg-slate-800 hover:border-indigo-400 cursor-pointer'
      }`}
    >
      <input
        type="file"
        multiple={multiple}
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        id={id}
        disabled={disabled}
      />
      <label htmlFor={id} className="cursor-pointer flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="text-slate-200 font-medium text-lg">{label}</p>
          <p className="text-slate-400 text-sm mt-1">{subLabel}</p>
          {multiple && <p className="text-slate-500 text-xs mt-2">Upload 3-5 images for best results</p>}
        </div>
      </label>
    </div>
  );
};
