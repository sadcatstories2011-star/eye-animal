import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AnimalResults } from './components/AnimalResults';
import { ChatSidebar } from './components/ChatSidebar';
import { VoiceModal } from './components/VoiceModal';
import { identifyAnimal } from './services/geminiService';
import { AppState, AnimalDetails } from './types';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [animalData, setAnimalData] = useState<AnimalDetails | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageSelected = async (base64: string, mimeType: string) => {
    setSelectedImage(`data:${mimeType};base64,${base64}`);
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);

    try {
      // 1. Identify Animal
      const data = await identifyAnimal(base64, mimeType);
      setAnimalData(data);
      setAppState(AppState.RESULTS);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to identify the animal. Please ensure the image is clear and try again.");
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.UPLOAD);
    setSelectedImage(null);
    setAnimalData(null);
    setIsChatOpen(false);
    setIsVoiceOpen(false);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-sm sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-600">
              Eye Animal
            </span>
          </div>
          {appState !== AppState.UPLOAD && (
            <button onClick={handleReset} className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors">
              New Scan
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {appState === AppState.UPLOAD && (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-8 animate-fade-in">
             <div className="text-center space-y-4 max-w-2xl">
               <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                 Discover the Animal Kingdom
               </h1>
               <p className="text-lg text-slate-600 max-w-lg mx-auto">
                 Instantly identify animals, learn fascinating facts, and chat with our AI zoologist.
               </p>
             </div>
             <ImageUploader onImageSelected={handleImageSelected} />
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-emerald-100 rounded-full"></div>
              <div className="w-24 h-24 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-emerald-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
              </div>
            </div>
            <h2 className="text-xl font-medium text-slate-700 animate-pulse">Analyzing image...</h2>
          </div>
        )}

        {appState === AppState.RESULTS && animalData && selectedImage && (
          <AnimalResults 
            data={animalData} 
            originalImage={selectedImage}
            onAskAI={() => setIsChatOpen(true)}
            onVoiceMode={() => setIsVoiceOpen(true)}
            onReset={handleReset}
          />
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto">
            <div className="bg-red-50 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h2>
            <p className="text-slate-600 mb-6">{errorMsg || "We couldn't process your request."}</p>
            <button 
              onClick={handleReset}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Chat Sidebar */}
      {animalData && (
        <ChatSidebar 
          animalData={animalData}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Voice Modal */}
      {animalData && isVoiceOpen && (
        <VoiceModal
          animalData={animalData}
          onClose={() => setIsVoiceOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          © {new Date().getFullYear()} Eye Animal. Powered by Google Gemini.
        </div>
      </footer>
    </div>
  );
}

export default App;
