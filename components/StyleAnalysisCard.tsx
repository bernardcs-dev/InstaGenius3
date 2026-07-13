import React from 'react';
import { StyleAnalysis } from '../types';

interface StyleAnalysisCardProps {
  analysis: StyleAnalysis | null;
  isLoading: boolean;
}

export const StyleAnalysisCard: React.FC<StyleAnalysisCardProps> = ({ analysis, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-2 bg-slate-700 rounded w-full"></div>
          <div className="h-2 bg-slate-700 rounded w-5/6"></div>
          <div className="h-2 bg-slate-700 rounded w-4/6"></div>
        </div>
        <div className="flex gap-2 mt-4">
            <div className="w-8 h-8 rounded-full bg-slate-700"></div>
            <div className="w-8 h-8 rounded-full bg-slate-700"></div>
            <div className="w-8 h-8 rounded-full bg-slate-700"></div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-indigo-500/30">
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400">
          <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5Z" clipRule="evenodd" />
        </svg>
        <h3 className="text-white font-semibold">Identified Style DNA</h3>
      </div>

      <div className="space-y-5">
        <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Color Palette</span>
            <div className="flex gap-3 mt-2">
                {analysis.colorPalette.map((color, idx) => (
                    <div key={idx} className="group relative">
                        <div 
                            className="w-10 h-10 rounded-full border border-slate-600 shadow-sm" 
                            style={{ backgroundColor: color }}
                        />
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 px-1 rounded whitespace-nowrap">
                            {color}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-3 rounded-lg">
                <span className="text-xs text-indigo-300 font-medium block mb-1">Mood</span>
                <p className="text-sm text-slate-200">{analysis.mood}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg">
                <span className="text-xs text-indigo-300 font-medium block mb-1">Typography</span>
                <p className="text-sm text-slate-200">{analysis.typography}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg sm:col-span-2">
                <span className="text-xs text-indigo-300 font-medium block mb-1">Visual Style</span>
                <p className="text-sm text-slate-200">{analysis.visualStyle}</p>
            </div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3">Layout Structure</h4>
            <div className="grid grid-cols-1 gap-3">
                <div>
                    <span className="text-[10px] text-slate-500 uppercase">Composition</span>
                    <p className="text-sm text-slate-200">{analysis.layoutStructure.composition}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase">Positioning</span>
                        <p className="text-sm text-slate-200">{analysis.layoutStructure.positioning}</p>
                    </div>
                    <div>
                         <span className="text-[10px] text-slate-500 uppercase">Spacing</span>
                         <p className="text-sm text-slate-200">{analysis.layoutStructure.spacing}</p>
                    </div>
                </div>
                <div>
                     <span className="text-[10px] text-slate-500 uppercase">Overlays</span>
                     <p className="text-sm text-slate-200">{analysis.layoutStructure.overlayStyles}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};