
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, DatabaseZap, Check,
  Globe, Award, Heart, MessageSquare, RefreshCcw, Star, Plane, Tag, Calendar, MapPin, Share2, Users, Flame, Copy, Facebook, Instagram, Send, Info, ExternalLink, Mail, User, AlertTriangle
} from 'lucide-react';
import { AppStatus, CrmEntry } from './types';
import { GOOGLE_SCRIPT_URL, GOOGLE_APPS_SCRIPT_CODE } from './constants';
import { getGourmetResponse } from './services/geminiService';

const DAYS = ["Day 1", "Day 2", "Day 3"];

const COUNTRIES = [
  { id: 'VN', name: '越南', icon: '🇻🇳' },
  { id: 'TH', name: '泰國', icon: '🇹🇭' },
  { id: 'ID', name: '印尼', icon: '🇮🇩' },
  { id: 'FR', name: '法國', icon: '🇫🇷' },
  { id: 'GB', name: '英國', icon: '🇬🇧' },
  { id: 'KR', name: '韓國', icon: '🇰🇷' },
  { id: 'JP', name: '日本', icon: '🇯🇵' }
];

const FEEDBACK_TAGS = [
  "🔥 味道超道地",
  "😋 吃了還想吃",
  "📸 看起來超美",
  "💰 CP值無敵強",
  "🏮 攤位超漂亮",
  "💖 服務超熱情"
];

interface FeedEntry {
  eventDay: string;
  timestamp: string;
  nickname: string;
  favoriteCountry: string;
  tags: string;
  feedback: string;
}

const App: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedCountry, setSelectedCountry] = useState('VN');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [communityFeed, setCommunityFeed] = useState<FeedEntry[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const isBackendConfigured = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('https://script.google.com');

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFeedData = async () => {
    if (!isBackendConfigured) return;
    setLoadingFeed(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const data = await response.json();
      if (data.feed) {
        setCommunityFeed(data.feed);
      }
    } catch (err) {
      console.error("Fetch data failed:", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    if (isBackendConfigured) fetchFeedData();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const copyToClipboard = async (text: string, silent = false) => {
    const shareText = `【國際週美食護照】${text}\n#InternationalWeek #美食護照 #NTNU`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (!silent) showToast("文案已複製！快去發限動貼上吧 ✨");
      return true;
    } catch (err) {
      console.error('Failed to copy!', err);
      return false;
    }
  };

  const handleShareIG = async () => {
    await copyToClipboard(aiMessage, true);
    if (navigator.share) {
      try {
        await navigator.share({
          title: '國際週美食推薦',
          text: `【國際週美食護照】${aiMessage}\n#InternationalWeek #美食護照 #NTNU`,
          url: window.location.href,
        });
        showToast("分享選單已開啟！", "info");
      } catch (err) {
        showToast("文案已複製！請手動開啟 IG 發佈 📸");
      }
    } else {
      showToast("文案已複製！請開啟 IG 發佈限動 📸");
    }
  };

  const handleShareFB = () => {
    copyToClipboard(aiMessage, true);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(aiMessage)}`;
    window.open(fbUrl, '_blank');
    showToast("即將前往臉書，文案已同步複製！", "info");
  };

  const handleCrmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    if (!nickname.trim()) {
      setErrorMsg("請輸入稱呼，開啟你的美食護照！");
      return;
    }

    setStatus(AppStatus.SUBMITTING);
    const timestamp = new Date().toLocaleString('zh-TW', { hour12: false });
    const countryName = COUNTRIES.find(c => c.id === selectedCountry)?.name || '';
    
    const newEntry: CrmEntry = { 
      nickname, 
      favoriteCountry: countryName, 
      selectedTags,
      feedback: comment, 
      eventDay: selectedDay,
      timestamp, 
      id: Date.now().toString() 
    };

    try {
      const aiContext = `評價：${selectedTags.join(', ')}。留言：${comment}`;
      const msgPromise = getGourmetResponse(nickname, countryName, aiContext, selectedDay);

      if (isBackendConfigured) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry),
        });
      }

      const msg = await msgPromise;
      setAiMessage(msg);
      setStatus(AppStatus.SUCCESS);
      
      setTimeout(fetchFeedData, 1500);
      
      setComment('');
      setSelectedTags([]);
      setNickname('');
    } catch (err) {
      console.error(err);
      setErrorMsg("系統同步失敗，請再試一次！");
      setStatus(AppStatus.ERROR);
      setTimeout(() => setStatus(AppStatus.IDLE), 3000);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-start p-4 bg-[#080808] text-slate-100 font-sans overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-green-600/90 border-green-400' : 'bg-amber-600/90 border-amber-400'} backdrop-blur-md`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-white" /> : <Info className="w-4 h-4 text-white" />}
            <span className="text-sm font-bold text-white whitespace-nowrap">{toast.message}</span>
          </div>
        </div>
      )}

      {/* 慶典背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <main className="w-full max-w-md z-10 space-y-5 py-8 md:py-12">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2">
            <MapPin className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-black tracking-[0.2em] text-amber-500 uppercase">International Week 2026</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic leading-none drop-shadow-2xl">
            國際週美食<span className="text-red-600">護照</span>
          </h1>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] italic">Digital Food Passport</p>
        </div>

        {!isBackendConfigured && (
          <div className="bg-red-600/10 border border-red-600/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DatabaseZap className="w-5 h-5 text-red-600" />
              <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">資料庫尚未連動</p>
            </div>
            <button onClick={() => setShowSetup(true)} className="text-[10px] font-black bg-red-600 text-white px-3 py-1.5 rounded-lg uppercase">設定教學</button>
          </div>
        )}

        <div className="glass rounded-[2.5rem] p-7 sm:p-9 shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>
          
          {status === AppStatus.SUCCESS ? (
            <div className="py-2 text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="space-y-4">
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                   <div className="absolute inset-0 border-4 border-dashed border-red-500/30 rounded-full animate-spin-slow"></div>
                   <div className="relative bg-white/5 p-4 rounded-full border-2 border-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                      <span className="text-4xl">{COUNTRIES.find(c => c.id === selectedCountry)?.icon || '🍕'}</span>
                   </div>
                   <div className="absolute -bottom-2 bg-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase italic shadow-lg">Verified</div>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">打卡完成！</h2>
                  <p className="text-amber-500 font-bold text-[10px] uppercase tracking-widest">獲得了此地戳印</p>
                </div>
              </div>

              {/* 社群分享文案區 */}
              <div className="space-y-4">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-left relative overflow-hidden group">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3">AI 幫你寫好了推薦語：</p>
                  <div className="min-h-[60px]">
                    <p className="text-base font-bold leading-relaxed italic text-white pr-4">"{aiMessage}"</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleShareIG} className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl text-[11px] font-black text-white uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-xl">
                    <Instagram className="w-4 h-4" /> 分享到 IG
                  </button>
                  <button onClick={handleShareFB} className="flex items-center justify-center gap-2 bg-[#1877F2] py-4 rounded-2xl text-[11px] font-black text-white uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-xl">
                    <Facebook className="w-4 h-4" /> 分享到 FB
                  </button>
                </div>

                <button onClick={() => copyToClipboard(aiMessage)} className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-4 rounded-2xl text-[11px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                  <Copy className="w-4 h-4" /> 僅複製推薦文案
                </button>
              </div>
              
              <button onClick={() => setStatus(AppStatus.IDLE)} className="w-full bg-slate-800 py-4 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.3em] active:scale-95 transition-transform">
                Back / 繼續下一站
              </button>
            </div>
          ) : (
            <form onSubmit={handleCrmSubmit} className="space-y-7">
              <div className="space-y-7">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Identification / 您的稱呼</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                    <input
                      type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)}
                      placeholder="請輸入暱稱或稱呼"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-red-600/30 font-bold placeholder:text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Travel Date / 參加天數</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DAYS.map(day => (
                      <button
                        key={day} type="button" onClick={() => setSelectedDay(day)}
                        className={`py-3 rounded-xl text-[11px] font-black border transition-all ${
                          selectedDay === day ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Discovery / 我今天吃了...</label>
                   <div className="grid grid-cols-4 gap-2">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.id} type="button" onClick={() => setSelectedCountry(c.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1 ${
                            selectedCountry === c.id ? 'bg-red-600/20 border-red-600' : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-2xl">{c.icon}</span>
                          <span className={`text-[9px] font-black ${selectedCountry === c.id ? 'text-white' : 'text-slate-600'}`}>{c.name}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Experience Tags / 必推理由</label>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_TAGS.map((tag) => (
                      <button
                        key={tag} type="button" onClick={() => toggleTag(tag)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                          selectedTags.includes(tag) 
                          ? 'bg-amber-600/20 border-amber-600 text-amber-500' 
                          : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errorMsg && <p className="text-center text-red-600 text-[10px] font-bold animate-pulse">{errorMsg}</p>}

              <button
                type="submit" disabled={status === AppStatus.SUBMITTING}
                className="w-full bg-gradient-to-r from-red-600 to-amber-600 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 text-white shadow-2xl active:scale-95 uppercase italic"
              >
                {status === AppStatus.SUBMITTING ? <span>Passporting...</span> : <><span>Claim My Stamp</span><Plane className="w-5 h-5" /></>}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Backend Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg overflow-y-auto">
           <div className="glass w-full max-w-lg my-auto rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-300">
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-600/5">
                <h2 className="font-bold text-white text-xs uppercase tracking-widest italic flex items-center gap-2"><DatabaseZap className="w-4 h-4" /> 解決 SyntaxError (Unexpected token 'export')</h2>
                <button onClick={() => setShowSetup(false)} className="text-slate-500 hover:text-white p-2">✕</button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="p-4 bg-red-600/20 border border-red-600/30 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-1">關鍵錯誤提醒</h4>
                    <p className="text-[10px] text-red-200/70 leading-relaxed">
                      請勿直接從檔案中複製 <code className="bg-black/30 px-1 rounded">export const...</code>。Google 試算表腳本不支援 export 關鍵字。
                      <br /><strong className="text-white underline">請務必點擊下方的「複製純淨代碼」按鈕。</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0 border border-white/10 text-slate-400">1</div>
                    <div className="flex-1">
                      <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">複製純淨代碼</h4>
                      <button onClick={() => { navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE); showToast("純淨代碼已複製！"); }} className="w-full py-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-500 transition-all shadow-lg active:scale-95">
                        <Copy className="w-3 h-3" /> 複製純淨代碼 (不含 Export)
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0 border border-white/10 text-slate-400">2</div>
                    <div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">完全覆蓋貼上</h4>
                      <p className="text-[10px] text-slate-400">在 Google Apps Script 中刪除原本的所有程式碼（包含預設的 <code className="bg-white/5 px-1">function myFunction()</code>），然後直接貼上剛複製的內容。</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-black shrink-0 text-white">3</div>
                    <div>
                      <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">發布並更新網址</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">點擊「部署」 &gt; 「新部署」 &gt; 「網頁應用程式」。將「誰可以存取」改為「所有人」。部署後，將出現的網址貼回本專案的 <code className="bg-white/10 px-1 rounded text-amber-500">constants.ts</code> 即可。</p>
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowSetup(false)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-700 transition-all">
                  我了解了，再去試一次
                </button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;
