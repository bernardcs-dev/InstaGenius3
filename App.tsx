import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Layout, 
  Type as TypeIcon, 
  Image as ImageIcon, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Layers,
  PenTool,
  Trash2,
  Plus,
  History,
  User,
  Palette,
  Clock,
  DollarSign,
  X
} from 'lucide-react';
import { DropZone } from './components/DropZone';
import { StyleAnalysisCard } from './components/StyleAnalysisCard';
import { analyzeBrandStyle, generateCreativePost, suggestLayoutsAndContent } from './services/geminiService';
import { AppState, UploadedImage, StyleAnalysis, AspectRatio, PostFormat, CarouselCount, GeneratedPost, LayoutSuggestion, PostContent, HistoryItem, TextStyle, LogoPosition, LogoOpacity, LogoSize } from './types';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [logo, setLogo] = useState<UploadedImage | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
  const [logoOpacity, setLogoOpacity] = useState<LogoOpacity>('solid');
  const [logoSize, setLogoSize] = useState<LogoSize>('medium');
  const [characterImage, setCharacterImage] = useState<UploadedImage | null>(null);
  const [characterDescription, setCharacterDescription] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [format, setFormat] = useState<PostFormat>(PostFormat.FEED_STATIC);
  const [carouselCount, setCarouselCount] = useState<CarouselCount>(4);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null);
  const [layoutSuggestions, setLayoutSuggestions] = useState<LayoutSuggestion[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutSuggestion | null>(null);
  const [editableContent, setEditableContent] = useState<PostContent>({ 
    headline: '', 
    headlineStyle: { font: 'Inter', color: '#ffffff', size: 'Large' },
    subtitle: '',
    subtitleStyle: { font: 'Inter', color: '#cbd5e1', size: 'Medium' }
  });
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Check for API Key
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for local development
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success as per guidelines
    }
  };

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('instagenius_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('instagenius_history', JSON.stringify(history));
  }, [history]);

  // 1. Handle File Upload
  const handleFilesSelected = (newImages: UploadedImage[]) => {
    // Only keep the last 5 images to avoid token limits
    const updatedImages = [...images, ...newImages].slice(-5);
    setImages(updatedImages);
    setGeneratedPost(null); // Reset generated post on new upload
    
    // Auto-trigger analysis if we have images and haven't analyzed yet
    if (updatedImages.length > 0) {
      performAnalysis(updatedImages);
    }
  };

  const handleLogoSelected = (newLogos: UploadedImage[]) => {
    if (newLogos.length > 0) {
      setLogo(newLogos[0]);
    }
  };

  const handleCharacterSelected = (newChars: UploadedImage[]) => {
    if (newChars.length > 0) {
      setCharacterImage(newChars[0]);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // 2. Perform Style Analysis
  const performAnalysis = async (imgs: UploadedImage[]) => {
    setAppState(AppState.ANALYZING);
    setError(null);
    try {
      const analysis = await analyzeBrandStyle(imgs);
      setStyleAnalysis(analysis);
      setAppState(AppState.READY_TO_PLAN);
    } catch (e) {
      console.error(e);
      setError("Failed to analyze brand style. Please try different images.");
      setAppState(AppState.ERROR);
    }
  };

  // 2.5 Suggest Layouts and Content
  const handlePlan = async () => {
    if (!styleAnalysis || !caption) return;
    setAppState(AppState.PLANNING);
    setError(null);
    try {
      const { suggestions, content } = await suggestLayoutsAndContent(caption, styleAnalysis, images);
      setLayoutSuggestions(suggestions);
      setSelectedLayout(suggestions[0]);
      setEditableContent(content);
      setAppState(AppState.REVIEWING_PLAN);
    } catch (e) {
      console.error(e);
      setError("Falha ao sugerir layouts. Por favor, tente novamente.");
      setAppState(AppState.READY_TO_PLAN);
    }
  };

  // 3. Generate Creative
  const handleGenerate = async () => {
    if (!styleAnalysis || !caption) return;
    
    setAppState(AppState.GENERATING);
    setError(null);
    setCurrentSlide(0);
    try {
      const post = await generateCreativePost(
        caption, 
        styleAnalysis, 
        images, 
        format, 
        carouselCount, 
        logo || undefined,
        logoPosition,
        logoOpacity,
        logoSize,
        selectedLayout || undefined,
        editableContent,
        characterImage || undefined,
        characterDescription
      );
      setGeneratedPost(post);
      setAppState(AppState.COMPLETE);

      // Add to history
      const costPerImage = 0.03; // Estimated cost for 1K image
      const totalCost = post.images.length * costPerImage;
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        image: post.images[0],
        format: format,
        cost: totalCost,
        caption: caption
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.message || String(e);
      
      if (errorMsg.includes("PERMISSION_DENIED") || errorMsg.includes("Requested entity was not found")) {
        setError("Erro de permissão. Por favor, selecione sua chave de API novamente.");
        setHasApiKey(false);
      } else {
        setError("Falha ao gerar imagem. Por favor, tente novamente.");
      }
      setAppState(AppState.REVIEWING_PLAN); // Allow retry from plan review
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Configuração Necessária</h1>
            <p className="text-slate-400 text-sm">
              Para gerar imagens de alta qualidade com o Gemini 3.1, você precisa selecionar sua própria chave de API (Google Cloud Project pago).
            </p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-300 text-left">
            <p className="font-bold mb-1">Por que isso é necessário?</p>
            <p>Modelos avançados de geração de imagem exigem uma conta com faturamento ativado. Veja a <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-200">documentação de faturamento</a> para mais detalhes.</p>
          </div>
          <button
            onClick={handleSelectKey}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
          >
            Selecionar Chave de API
          </button>
        </div>
      </div>
    );
  }

  if (hasApiKey === null) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight">InstaGenius</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm font-medium"
              >
                <History className="w-4 h-4" />
                Histórico
              </button>
              <div className="text-sm text-slate-400 hidden sm:block">Powered by Gemini 3.1 & Nano Banana Pro</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Settings (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Upload Section */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">1. Estilos de Referência</h2>
              <DropZone 
                onFilesSelected={handleFilesSelected} 
                disabled={appState === AppState.ANALYZING || appState === AppState.GENERATING}
                label="Arraste ou clique para subir referências"
              />
              
              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {images.map((img) => (
                    <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700">
                      <img src={img.preview} alt="Upload" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Logo Section */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. Logo da Marca (Opcional)</h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <DropZone 
                      onFilesSelected={handleLogoSelected} 
                      disabled={appState === AppState.GENERATING}
                      label="Upload Logo"
                    />
                  </div>
                  {logo && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-white/10 p-2">
                      <img src={logo.preview} alt="Logo" className="w-full h-full object-contain" />
                      <button 
                        onClick={() => setLogo(null)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                {logo && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Posição</label>
                      <select 
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                        value={logoPosition}
                        onChange={(e) => setLogoPosition(e.target.value as LogoPosition)}
                      >
                        <option value="top-left">Canto Superior Esquerdo</option>
                        <option value="top-center">Em Cima no Meio</option>
                        <option value="top-right">Canto Superior Direito</option>
                        <option value="bottom-left">Canto Inferior Esquerdo</option>
                        <option value="bottom-center">Em Baixo no Meio</option>
                        <option value="bottom-right">Canto Inferior Direito</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Opacidade</label>
                      <select 
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                        value={logoOpacity}
                        onChange={(e) => setLogoOpacity(e.target.value as LogoOpacity)}
                      >
                        <option value="solid">Sobreposto (Sólido)</option>
                        <option value="translucent">Translúcido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Tamanho</label>
                      <select 
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                        value={logoSize}
                        onChange={(e) => setLogoSize(e.target.value as LogoSize)}
                      >
                        <option value="small">Pequeno</option>
                        <option value="medium">Médio</option>
                        <option value="large">Grande</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Character Section */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Personagem Fixo (Opcional)</h2>
              <p className="text-xs text-slate-400 mb-3">Suba a foto de uma pessoa para ser usada como modelo em todos os posts.</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <DropZone 
                    onFilesSelected={handleCharacterSelected} 
                    disabled={appState === AppState.GENERATING}
                    label="Upload Personagem"
                  />
                </div>
                {characterImage && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-white/10">
                    <img src={characterImage.preview} alt="Personagem" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCharacterImage(null)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <textarea
                rows={2}
                className="w-full mt-3 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                placeholder="Descreva a aparência, roupas ou pose da pessoa (opcional)..."
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                disabled={appState === AppState.GENERATING}
              />
            </section>

            {/* 3. Analysis Result */}
            {(appState !== AppState.IDLE || styleAnalysis) && (
               <section>
                 <h2 className="text-lg font-semibold text-white mb-3">4. Análise de Estilo</h2>
                 <StyleAnalysisCard 
                   analysis={styleAnalysis} 
                   isLoading={appState === AppState.ANALYZING} 
                 />
               </section>
            )}

            {/* 4. Caption & Action */}
            <section className={styleAnalysis ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
              <h2 className="text-lg font-semibold text-white mb-3">5. Detalhes do Novo Post</h2>
              <div className="space-y-4">
                
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Formato do Post
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: PostFormat.STORY, label: "Story (9:16)", desc: "1080 x 1920px" },
                      { value: PostFormat.FEED_STATIC, label: "Feed Static (4:5)", desc: "1080 x 1440px" },
                      { value: PostFormat.FEED_CAROUSEL, label: "Feed Carousel (4:5)", desc: "1080 x 1440px" },
                      { value: PostFormat.LANDSCAPE, label: "Landscape (1.91:1)", desc: "1200 x 566px" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormat(option.value)}
                        disabled={appState === AppState.GENERATING}
                        className={`p-3 rounded-lg text-left border transition-all ${
                          format === option.value
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className="font-semibold text-sm">{option.label}</div>
                        <div className="text-xs opacity-70">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Carousel Count Selection */}
                {format === PostFormat.FEED_CAROUSEL && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Número de Slides
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[4, 5, 6].map((count) => (
                        <button
                          key={count}
                          onClick={() => setCarouselCount(count as CarouselCount)}
                          disabled={appState === AppState.GENERATING}
                          className={`py-2 px-2 rounded-lg text-sm font-medium border transition-all ${
                            carouselCount === count
                              ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {count} Slides
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Caption Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Sobre o que é o post?
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Ex: Uma promoção especial na nossa coleção de verão, vibe minimalista."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    disabled={appState === AppState.PLANNING || appState === AppState.GENERATING}
                  />
                </div>
                
                {appState === AppState.READY_TO_PLAN || appState === AppState.PLANNING ? (
                  <button
                    onClick={handlePlan}
                    disabled={!caption || appState === AppState.PLANNING || !styleAnalysis}
                    className={`w-full py-4 px-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                      ${(!caption || appState === AppState.PLANNING)
                        ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/25 active:scale-[0.98]'
                      }
                    `}
                  >
                    {appState === AppState.PLANNING ? (
                      <>
                        <RefreshCw className="animate-spin h-5 w-5" />
                        Planejando Layouts...
                      </>
                    ) : (
                      <>
                        <Layers className="h-5 w-5" />
                        Sugerir 2 Layouts
                      </>
                    )}
                  </button>
                ) : appState === AppState.REVIEWING_PLAN || appState === AppState.GENERATING || appState === AppState.COMPLETE ? (
                  <div className="space-y-6">
                    {/* Layout Selection */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-1">
                        <Layout className="w-4 h-4" />
                        <span>Escolha um Layout</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {layoutSuggestions.map((suggestion, idx) => (
                          <button
                            key={suggestion.id}
                            onClick={() => setSelectedLayout(suggestion)}
                            className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group ${
                              selectedLayout?.id === suggestion.id
                                ? "bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500"
                                : "bg-slate-800 border-slate-700 hover:border-slate-600"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 mb-1">Opção 0{idx + 1}</div>
                                <div className="font-bold text-white text-base">{suggestion.name}</div>
                                <div className="text-xs text-slate-400 mt-1 leading-relaxed">{suggestion.description}</div>
                              </div>
                              {selectedLayout?.id === suggestion.id && (
                                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>

                    {/* Editable Content Box */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-5 shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <PenTool className="w-4 h-4 text-indigo-400" />
                          Textos da Imagem
                        </h3>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Editor</span>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Headline Section */}
                        <div className="space-y-3">
                          <div className="group">
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 group-focus-within:text-indigo-400 transition-colors">Título Principal</label>
                            <div className="relative">
                              <TypeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                              <input 
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Digite o título..."
                                value={editableContent.headline}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, headline: e.target.value }))}
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <select 
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-indigo-500"
                                value={editableContent.headlineStyle.font}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, headlineStyle: { ...prev.headlineStyle, font: e.target.value } }))}
                              >
                                <option value="Inter">Inter</option>
                                <option value="Playfair Display">Playfair</option>
                                <option value="Space Grotesk">Space Grotesk</option>
                                <option value="JetBrains Mono">Mono</option>
                              </select>
                            </div>
                            <div className="w-12">
                              <input 
                                type="color"
                                className="w-full h-8 bg-transparent border-none cursor-pointer"
                                value={editableContent.headlineStyle.color}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, headlineStyle: { ...prev.headlineStyle, color: e.target.value } }))}
                              />
                            </div>
                            <div className="w-20">
                              <select 
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-indigo-500"
                                value={editableContent.headlineStyle.size}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, headlineStyle: { ...prev.headlineStyle, size: e.target.value } }))}
                              >
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                                <option value="X-Large">XL</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Subtitle Section */}
                        <div className="space-y-3">
                          <div className="group">
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 group-focus-within:text-indigo-400 transition-colors">Subtítulo de Apoio</label>
                            <div className="relative">
                              <TypeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                              <input 
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Digite o subtítulo..."
                                value={editableContent.subtitle}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, subtitle: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <select 
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-indigo-500"
                                value={editableContent.subtitleStyle.font}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, subtitleStyle: { ...prev.subtitleStyle, font: e.target.value } }))}
                              >
                                <option value="Inter">Inter</option>
                                <option value="Playfair Display">Playfair</option>
                                <option value="Space Grotesk">Space Grotesk</option>
                                <option value="JetBrains Mono">Mono</option>
                              </select>
                            </div>
                            <div className="w-12">
                              <input 
                                type="color"
                                className="w-full h-8 bg-transparent border-none cursor-pointer"
                                value={editableContent.subtitleStyle.color}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, subtitleStyle: { ...prev.subtitleStyle, color: e.target.value } }))}
                              />
                            </div>
                            <div className="w-20">
                              <select 
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-indigo-500"
                                value={editableContent.subtitleStyle.size}
                                onChange={(e) => setEditableContent(prev => ({ ...prev, subtitleStyle: { ...prev.subtitleStyle, size: e.target.value } }))}
                              >
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                                <option value="X-Large">XL</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <button
                      onClick={handleGenerate}
                      disabled={appState === AppState.GENERATING}
                      className={`w-full py-4 px-4 rounded-xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2
                        ${appState === AppState.GENERATING
                          ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 active:scale-[0.98]'
                        }
                      `}
                    >
                      {appState === AppState.GENERATING ? (
                        <>
                          <RefreshCw className="animate-spin h-5 w-5" />
                          Gerando Imagem...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Gerar Imagem
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => setAppState(AppState.READY_TO_PLAN)}
                      className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
                    >
                      ← Voltar para o planejamento
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Preview Area (8 cols) */}
          <div className="lg:col-span-8">
            <div className="h-full min-h-[600px] bg-slate-800/30 border border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
              
              {/* Background Decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
              </div>

              {generatedPost ? (
                <div className="relative z-10 w-full max-w-lg mx-auto animate-in fade-in zoom-in duration-500">
                  <div className="bg-white p-4 pb-12 rounded-sm shadow-2xl transform transition-transform duration-300">
                    {/* Slide Counter for Carousel */}
                    {generatedPost.images.length > 1 && (
                      <div className="absolute top-6 right-6 z-20 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {currentSlide + 1} / {generatedPost.images.length}
                      </div>
                    )}

                    {/* Dynamic Image Container */}
                    <div className={`w-full bg-slate-100 rounded-sm overflow-hidden relative ${format === PostFormat.STORY ? 'aspect-[9/16]' : format === PostFormat.LANDSCAPE ? 'aspect-[1.91/1]' : 'aspect-[4/5]'}`}>
                      <img 
                        src={`data:image/png;base64,${generatedPost.images[currentSlide]}`} 
                        alt={`Generated Slide ${currentSlide + 1}`} 
                        className="w-full h-full object-cover"
                      />

                      {/* Carousel Navigation Arrows */}
                      {generatedPost.images.length > 1 && (
                        <>
                          <button 
                            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                            disabled={currentSlide === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-0 transition-opacity hover:bg-white/40"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setCurrentSlide(prev => Math.min(generatedPost.images.length - 1, prev + 1))}
                            disabled={currentSlide === generatedPost.images.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-0 transition-opacity hover:bg-white/40"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                        <div className="flex-1 space-y-2">
                             <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                             <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    </div>
                  </div>
                                    <div className="mt-6 flex flex-col items-center gap-4">
                     <div className="flex gap-4">
                        <a 
                          href={`data:image/png;base64,${generatedPost.images[currentSlide]}`} 
                          download={`instagenius-${format.toLowerCase()}-${currentSlide + 1}.png`}
                          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Download className="w-5 h-5" />
                            Baixar Slide {currentSlide + 1}
                        </a>
                        {generatedPost.images.length > 1 && (
                          <button 
                            onClick={() => {
                              generatedPost.images.forEach((img, idx) => {
                                const link = document.createElement('a');
                                link.href = `data:image/png;base64,${img}`;
                                link.download = `instagenius-carousel-slide-${idx + 1}.png`;
                                link.click();
                              });
                            }}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-medium transition-colors border border-slate-600"
                          >
                            Baixar Todos
                          </button>
                        )}
                     </div>
                     {generatedPost.images.length > 1 && (
                       <div className="flex gap-1">
                         {generatedPost.images.map((_, idx) => (
                           <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentSlide ? 'w-4 bg-indigo-500' : 'bg-slate-600'}`}
                           />
                         ))}
                       </div>
                     )}
                  </div>
                </div>
              ) : (
                <div className="text-center z-10 max-w-md">
                   <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
                     <ImageIcon className="w-10 h-10 text-slate-500" />
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-2">Pronto para Criar</h3>
                   <p className="text-slate-400">
                     Faça upload dos seus posts do Instagram para analisarmos o estilo da sua marca. Depois, descreva seu novo post e nós geraremos um criativo consistente para você.
                   </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-800 z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-bold text-lg">Histórico de Criações</h2>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <Clock className="w-12 h-12" />
                    <p className="text-sm">Nenhuma criação ainda.<br/>Suas artes aparecerão aqui.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="group bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all">
                      <div className="aspect-[4/5] relative overflow-hidden">
                        <img src={`data:image/png;base64,${item.image}`} alt="Histórico" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <button 
                            onClick={() => {
                              setGeneratedPost({ images: [item.image], format: item.format });
                              setAppState(AppState.COMPLETE);
                              setShowHistory(false);
                            }}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg"
                          >
                            Visualizar
                          </button>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <DollarSign className="w-3 h-3" />
                            ${item.cost.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed italic">"{item.caption}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {history.length > 0 && (
                <div className="p-6 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      if (confirm('Deseja limpar todo o histórico?')) {
                        setHistory([]);
                      }
                    }}
                    className="w-full py-3 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all"
                  >
                    Limpar Histórico
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;