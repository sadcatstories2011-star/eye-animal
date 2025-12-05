import React, { useEffect, useState } from 'react';
import { AnimalDetails } from '../types';
import { Button } from './Button';
import { generateSimilarImages } from '../services/geminiService';

interface AnimalResultsProps {
  data: AnimalDetails;
  originalImage: string;
  onAskAI: () => void;
  onVoiceMode: () => void;
  onReset: () => void;
}

export const AnimalResults: React.FC<AnimalResultsProps> = ({ data, originalImage, onAskAI, onVoiceMode, onReset }) => {
  const [similarImages, setSimilarImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchImages = async () => {
      try {
        const images = await generateSimilarImages(data.commonName);
        if (isMounted) {
            setSimilarImages(images);
            setLoadingImages(false);
        }
      } catch (error) {
        console.error("Failed to load similar images", error);
        if (isMounted) setLoadingImages(false);
      }
    };
    fetchImages();
    return () => { isMounted = false; };
  }, [data.commonName]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-20">
      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="md:flex">
          {/* Image Side */}
          <div className="md:w-1/2 h-64 md:h-auto relative bg-slate-200">
            <img 
              src={originalImage} 
              alt="Uploaded Animal" 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
              Your Photo
            </div>
          </div>

          {/* Details Side */}
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
                {data.conservationStatus}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">{data.commonName}</h1>
              <p className="text-lg text-slate-500 italic font-serif">{data.scientificName}</p>
            </div>

            <p className="text-slate-600 leading-relaxed mb-6">
              {data.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Habitat</span>
                <p className="text-sm font-medium text-slate-700">{data.habitat}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Diet</span>
                <p className="text-sm font-medium text-slate-700">{data.diet}</p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
               <p className="text-sm text-amber-900">
                 <span className="font-bold mr-1">Fun Fact:</span>
                 {data.funFact}
               </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={onAskAI} variant="primary" className="flex-1 flex gap-2 items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM6 20.25a.75.75 0 01.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 01.75.75v.008c0 .414-.336.75-.75.75h-.008a.75.75 0 01-.75-.75v-.008c0-.414.336-.75.75-.75h.008a.75.75 0 01-.75-.75v-.008z" clipRule="evenodd" />
                </svg>
                Chat
              </Button>
              <Button onClick={onVoiceMode} variant="secondary" className="flex-1 flex gap-2 items-center justify-center bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                   <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                   <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                 </svg>
                 Voice Mode
              </Button>
            </div>
            <div className="mt-3">
              <Button onClick={onReset} variant="outline" className="w-full">
                 New Scan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Images Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Similar Images</h2>
        {loadingImages ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-slate-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : similarImages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {similarImages.map((imgUrl, idx) => (
              <div key={idx} className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
                <img 
                  src={imgUrl} 
                  alt={`${data.commonName} variation ${idx + 1}`} 
                  className="w-full h-64 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                   <p className="text-white text-sm font-medium">AI Generated Visualization</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500">
             Could not generate similar images at this time.
          </div>
        )}
      </div>
    </div>
  );
};
