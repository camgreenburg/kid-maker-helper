import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useChatHistory, useSendMessage } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/ChatMessage";
import { InputDock } from "@/components/InputDock";
import { VideoPlayer, VideoCard } from "@/components/VideoPlayer";
import { type Chat, type ChatMetadata, type VideoMetadata } from "@shared/schema";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper to generate a session ID if one doesn't exist
const getSessionId = () => {
  let id = localStorage.getItem("kid_maker_session_id");
  if (!id) {
    id = Date.now().toString();
    localStorage.setItem("kid_maker_session_id", id);
  }
  return id;
};

export default function Home() {
  const sessionId = useRef(getSessionId()).current;
  const [view, setView] = useState<'chat' | 'video'>('chat');
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
  
  // Data Fetching
  const { data: history = [], isLoading: isHistoryLoading } = useChatHistory(sessionId);
  const sendMessage = useSendMessage();

  // Scroll to bottom helper
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, view]);

  // Handlers
  const handleSend = async (text: string, image?: string) => {
    try {
      await sendMessage.mutateAsync({ sessionId, text, image });
    } catch (error) {
      console.error("Failed to send", error);
    }
  };

  const handleOpenVideo = (videoId: string, title: string) => {
    setCurrentVideo({ videoId, title });
    setView('video');
  };

  const handleChoiceSelect = (choice: string) => {
    handleSend(choice);
  };

  // Find alternates from the last assistant message with metadata
  const lastVideoMessage = [...history]
    .reverse()
    .find(m => m.role === 'assistant' && (m.metadata as ChatMetadata)?.alternates);
  const alternates = (lastVideoMessage?.metadata as ChatMetadata)?.alternates || [];

  return (
    <div className="h-screen w-full bg-slate-50 overflow-hidden flex flex-col md:flex-row font-body">
      
      {/* === VIDEO FOCUS VIEW (Desktop: Always visible if active / Mobile: Swaps) === */}
      <AnimatePresence>
        {(view === 'video' || (window.innerWidth >= 768 && currentVideo)) && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 bg-black md:max-w-[50%] lg:max-w-[60%] relative flex flex-col"
          >
            {/* Header / Back Button (Mobile only) */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/80 to-transparent md:hidden">
              <button 
                onClick={() => setView('chat')}
                className="flex items-center gap-2 text-white font-medium hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
              >
                <ArrowLeft size={18} />
                Back to Chat
              </button>
            </div>

            {/* Video Player */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
              {currentVideo && (
                <div className="w-full max-w-4xl">
                  <VideoPlayer videoId={currentVideo.videoId} autoplay />
                  <h2 className="mt-4 text-white text-xl md:text-2xl font-display font-bold tracking-tight">
                    {currentVideo.title}
                  </h2>
                </div>
              )}
            </div>

            {/* Alternates Strip */}
            {alternates.length > 0 && (
              <div className="bg-zinc-900/90 backdrop-blur-md p-4 border-t border-white/10 overflow-x-auto">
                <div className="flex gap-4 min-w-max px-2">
                  {alternates.map((alt, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentVideo(alt)}
                      className="group relative w-40 aspect-video rounded-lg overflow-hidden border border-white/10 hover:border-primary transition-all"
                    >
                      <img 
                        src={`https://img.youtube.com/vi/${alt.videoId}/mqdefault.jpg`} 
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        alt={alt.title}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 truncate text-[10px] text-white">
                        {alt.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === CHAT VIEW === */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 transition-all duration-300 ${view === 'video' ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-display font-bold text-lg shadow-sm">
              K
            </div>
            <h1 className="font-display font-bold text-xl text-slate-800 tracking-tight">
              Kid Maker Helper
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Optional reset button if needed */}
          </div>
        </header>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 scroll-smooth bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
        >
          {isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-medium animate-pulse">Loading your workshop...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold font-display text-slate-800 mb-2">Ready to Build?</h3>
              <p className="max-w-xs text-slate-500">
                Ask me for project ideas, or show me what you're working on!
              </p>
            </div>
          ) : (
            <>
              {history.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onOpenVideo={handleOpenVideo}
                  onChoiceSelect={handleChoiceSelect}
                />
              ))}
              
              {/* Pending State */}
              {sendMessage.isPending && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 w-full max-w-3xl mx-auto"
                >
                   <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <div className="bg-white border border-border px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-slate-500 shadow-sm italic">
                    Thinking of great ideas...
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <InputDock onSend={handleSend} isLoading={sendMessage.isPending} />
      </div>
    </div>
  );
}
