import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlayerStats, Quest, Rank, SystemState, WorkoutRecord, QuestType } from './types';
import { BASE_QUESTS, RANK_MULTIPLIERS, RANK_THRESHOLDS, BASE_XP_REWARD } from './constants';
import { SystemText } from './components/SystemText';
import { QuestCard } from './components/QuestCard';
import { audioService } from './services/audioService';
import { getDailyBriefing } from './services/geminiService';

// --- Icons ---
const IconRun = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;

const INITIAL_STATS: PlayerStats = {
  rank: Rank.E,
  xp: 0,
  level: 1,
  streak: 0,
  lastLogin: '',
  totalWorkouts: 0,
  history: []
};

const App: React.FC = () => {
  // State
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [systemState, setSystemState] = useState<SystemState>({
    view: 'BOOT',
    activeQuestId: null,
    dailyQuests: [],
    dailyMessage: 'INITIALIZING...'
  });
  const [filter, setFilter] = useState<'all' | QuestType>('all');
  
  // Timer Refs & State for Workouts
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  
  // Load Data
  useEffect(() => {
    const loadedStats = localStorage.getItem('hunter_stats');
    if (loadedStats) {
      setStats(JSON.parse(loadedStats));
    }
    
    // Simulate Boot Sequence
    setTimeout(() => {
      handleDailyReset(loadedStats ? JSON.parse(loadedStats) : INITIAL_STATS);
    }, 2000);
  }, []);

  // Check for day change / Logic
  const handleDailyReset = async (currentStats: PlayerStats) => {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = currentStats.lastLogin.split('T')[0];
    
    let newQuests: Quest[] = [];
    let newStreak = currentStats.streak;
    let view: SystemState['view'] = 'HOME';
    let message = "WELCOME BACK, HUNTER.";

    if (today !== lastLogin) {
      // New Day Logic
      if (lastLogin && (new Date(today).getTime() - new Date(lastLogin).getTime() > 86400000 * 1.5)) {
        // Missed a day (allow some buffer)
        newStreak = 0;
        view = 'PENALTY'; // Show penalty screen first
        message = "YOU HAVE NEGLECTED YOUR TRAINING.";
      } else if (lastLogin) {
        // Continuous
        // Don't increment streak yet, increment on completion
      }

      // Generate Quests based on Rank
      const multiplier = RANK_MULTIPLIERS[currentStats.rank];
      newQuests = BASE_QUESTS.map(q => ({
        ...q,
        target: Math.ceil(q.target * multiplier),
        current: 0,
        completed: false,
        xpReward: Math.ceil(BASE_XP_REWARD * multiplier),
        difficultyMultiplier: multiplier
      }));

      // Fetch message from Gemini
      message = await getDailyBriefing(currentStats.rank, newStreak);

    } else {
      // Same day, load existing quests from local storage if needed
      // For this demo, we'll regenerate if empty, but usually persisted
      const savedQuests = localStorage.getItem('daily_quests');
      if (savedQuests) {
        newQuests = JSON.parse(savedQuests);
      } else {
         const multiplier = RANK_MULTIPLIERS[currentStats.rank];
         newQuests = BASE_QUESTS.map(q => ({
            ...q,
            target: Math.ceil(q.target * multiplier),
            current: 0,
            completed: false,
            xpReward: Math.ceil(BASE_XP_REWARD * multiplier),
            difficultyMultiplier: multiplier
          }));
      }
    }

    setStats(prev => ({ ...prev, lastLogin: new Date().toISOString(), streak: newStreak }));
    setSystemState(prev => ({ ...prev, view, dailyQuests: newQuests, dailyMessage: message }));
    localStorage.setItem('hunter_stats', JSON.stringify({ ...currentStats, lastLogin: new Date().toISOString(), streak: newStreak }));
    localStorage.setItem('daily_quests', JSON.stringify(newQuests));
  };

  const saveProgress = (updatedQuests: Quest[], updatedStats: PlayerStats) => {
    setSystemState(prev => ({ ...prev, dailyQuests: updatedQuests }));
    setStats(updatedStats);
    localStorage.setItem('daily_quests', JSON.stringify(updatedQuests));
    localStorage.setItem('hunter_stats', JSON.stringify(updatedStats));
  };

  const startQuest = (questId: string) => {
    const quest = systemState.dailyQuests.find(q => q.id === questId);
    if (!quest) return;

    audioService.playPing();
    audioService.speak(`Quest accepted. ${quest.title}. Target: ${quest.target} ${quest.unit}. Begin.`);
    
    setSystemState(prev => ({ ...prev, activeQuestId: questId, view: 'TRAINING' }));
    
    if (quest.unit === 'minutes' || quest.unit === 'seconds') {
      setTimer(quest.unit === 'minutes' ? quest.target * 60 : quest.target);
      setTimerActive(false); // User must tap start
    } else {
      setTimer(0); // Counter mode
    }
  };

  const completeQuest = () => {
    if (!systemState.activeQuestId) return;
    
    const updatedQuests = systemState.dailyQuests.map(q => {
      if (q.id === systemState.activeQuestId) {
        return { ...q, completed: true };
      }
      return q;
    });

    const quest = systemState.dailyQuests.find(q => q.id === systemState.activeQuestId);
    const xpGain = quest ? quest.xpReward : 0;

    // Rank Up Logic
    let newXp = stats.xp + xpGain;
    let newRank = stats.rank;
    
    // Check next rank threshold
    const ranks = Object.values(Rank);
    const currentRankIndex = ranks.indexOf(stats.rank);
    const nextRank = ranks[currentRankIndex + 1] as Rank | undefined;
    
    if (nextRank && newXp >= RANK_THRESHOLDS[nextRank]) {
      newRank = nextRank;
      audioService.speak("Rank Up. Your capabilities have increased.");
    } else {
      audioService.speak("Quest Complete.");
    }

    const updatedStats = { ...stats, xp: newXp, rank: newRank };

    saveProgress(updatedQuests, updatedStats);
    setSystemState(prev => ({ ...prev, view: 'HOME', activeQuestId: null }));

    // Check if ALL quests done
    const allDone = updatedQuests.every(q => q.completed || q.type === 'shadow'); // Shadow is optional
    const mandatoryDone = updatedQuests.filter(q => q.type !== 'shadow').every(q => q.completed);
    
    if (mandatoryDone) {
       setSystemState(prev => ({ ...prev, view: 'SUMMARY' }));
    }
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
    audioService.playPing();
  };

  // Timer Effect
  useEffect(() => {
    if (timerActive && systemState.activeQuestId) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 0) {
            // Timer finished
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            audioService.speak("Time is up.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, systemState.activeQuestId]);

  const finishWorkoutDay = (mood: WorkoutRecord['mood']) => {
    const record: WorkoutRecord = {
      date: new Date().toISOString(),
      xpGained: systemState.dailyQuests.filter(q => q.completed).reduce((acc, q) => acc + q.xpReward, 0),
      mood: mood,
      questsCompleted: systemState.dailyQuests.filter(q => q.completed).length
    };
    
    const newHistory = [record, ...stats.history];
    const newStreak = stats.streak + 1;
    const newStats = { ...stats, history: newHistory, streak: newStreak, totalWorkouts: stats.totalWorkouts + 1 };
    
    setStats(newStats);
    localStorage.setItem('hunter_stats', JSON.stringify(newStats));
    
    // Reset quests for display (completed)
    setSystemState(prev => ({ ...prev, view: 'HOME' }));
    audioService.speak("Daily training complete. Rest well, Hunter.");
  };

  // --- Views ---

  if (systemState.view === 'BOOT') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8">
        <SystemText variant="glitch" size="2xl">SYSTEM INITIALIZING...</SystemText>
        <div className="w-64 h-2 bg-gray-900 mt-4 rounded overflow-hidden">
          <div className="h-full bg-blue-600 animate-[width_2s_ease-out_forwards]" style={{width: '100%'}}></div>
        </div>
      </div>
    );
  }

  if (systemState.view === 'PENALTY') {
    return (
      <div className="h-screen w-screen bg-red-950/20 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black -z-10" />
         <SystemText variant="warning" size="4xl" className="mb-8">PENALTY</SystemText>
         <p className="text-red-400 font-mono mb-8 max-w-md">
           You have failed to maintain the Daily Quest. Your streak has been reset to 0.
           <br/><br/>
           You must survive the penalty zone to restore access.
         </p>
         <button 
           onClick={() => setSystemState(prev => ({...prev, view: 'HOME'}))}
           className="px-8 py-3 border border-red-600 text-red-500 font-mono hover:bg-red-900/50 transition-colors uppercase tracking-widest"
         >
           Accept Punishment
         </button>
      </div>
    );
  }

  if (systemState.view === 'SUMMARY') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col p-6 animate-fade-in">
         <div className="flex-1 flex flex-col justify-center items-center text-center">
            <SystemText variant="success" size="2xl" className="mb-2">QUESTS CLEARED</SystemText>
            <SystemText size="base" className="text-gray-500 mb-8">REPORT</SystemText>
            
            <div className="w-full max-w-md space-y-4 mb-12">
               <div className="flex justify-between border-b border-gray-800 pb-2">
                 <span className="font-mono text-gray-400">XP GAINED</span>
                 <span className="font-mono text-blue-400">+{systemState.dailyQuests.filter(q => q.completed).reduce((a, b) => a + b.xpReward, 0)}</span>
               </div>
               <div className="flex justify-between border-b border-gray-800 pb-2">
                 <span className="font-mono text-gray-400">SURVIVAL DAYS</span>
                 <span className="font-mono text-blue-400">+{1}</span>
               </div>
            </div>

            <SystemText size="lg" className="mb-6">CONDITION CHECK</SystemText>
            <div className="grid grid-cols-4 gap-4 w-full max-w-md">
              {['great', 'good', 'neutral', 'exhausted'].map((m) => (
                <button 
                  key={m}
                  onClick={() => finishWorkoutDay(m as WorkoutRecord['mood'])}
                  className="aspect-square border border-gray-700 hover:border-blue-500 hover:bg-blue-900/20 flex items-center justify-center text-2xl transition-all"
                >
                  {m === 'great' ? '😄' : m === 'good' ? '🙂' : m === 'neutral' ? '😐' : '😫'}
                </button>
              ))}
            </div>
         </div>
      </div>
    );
  }

  if (systemState.view === 'TRAINING') {
    const activeQuest = systemState.dailyQuests.find(q => q.id === systemState.activeQuestId);
    if (!activeQuest) return null;

    const isTimer = activeQuest.unit === 'minutes' || activeQuest.unit === 'seconds';
    
    // Format timer
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    const timeDisplay = isTimer 
      ? `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${timer}`; // In non-timer mode, timer state is used as reps counter

    return (
      <div className="h-screen w-screen bg-black flex flex-col relative overflow-hidden">
        {/* Background Ambient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black -z-10" />
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <button onClick={() => setSystemState(prev => ({...prev, view: 'HOME', activeQuestId: null}))} className="text-gray-500 font-mono text-sm">
             &lt; ABORT
          </button>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
             <span className="text-red-500 font-mono text-xs tracking-widest">LIVE</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
           <SystemText size="xl" className="mb-2 text-center">{activeQuest.title}</SystemText>
           <p className="text-gray-500 font-mono text-center mb-12">{activeQuest.description}</p>

           <div className="relative mb-12">
             {/* Center Display */}
             <div className="text-7xl font-mono font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
               {isTimer ? timeDisplay : timer + ' / ' + activeQuest.target}
             </div>
             <p className="text-center text-blue-500 font-mono mt-2 uppercase tracking-widest">{activeQuest.unit}</p>
           </div>

           {/* Controls */}
           <div className="w-full max-w-xs space-y-4">
              {isTimer ? (
                <button 
                  onClick={toggleTimer}
                  className={`w-full py-4 border ${timerActive ? 'border-yellow-500 text-yellow-500' : 'border-blue-500 text-blue-500'} font-mono uppercase tracking-widest hover:bg-gray-900 transition-colors`}
                >
                  {timerActive ? 'PAUSE' : 'START TIMER'}
                </button>
              ) : (
                <button 
                  onClick={() => {
                     setTimer(prev => Math.min(prev + 1, activeQuest.target));
                     audioService.playPing();
                  }}
                  className="w-full py-6 border border-blue-500 text-blue-500 font-mono uppercase tracking-widest hover:bg-blue-900/20 active:scale-95 transition-all text-xl"
                >
                  +1 REP
                </button>
              )}

              <button 
                 onClick={completeQuest}
                 disabled={isTimer ? timer > 0 : timer < activeQuest.target}
                 className={`w-full py-4 bg-blue-600 text-black font-bold font-mono uppercase tracking-widest transition-all
                   ${(isTimer ? timer > 0 : timer < activeQuest.target) ? 'opacity-20 cursor-not-allowed' : 'opacity-100 hover:bg-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)]'}
                 `}
              >
                COMPLETE QUEST
              </button>
           </div>
        </div>
      </div>
    );
  }

  // HOME VIEW
  const completedCount = systemState.dailyQuests.filter(q => q.completed).length;
  const totalCount = systemState.dailyQuests.length;
  const progress = (completedCount / totalCount) * 100;
  
  // Filtering
  const filteredQuests = systemState.dailyQuests.filter(q => 
    filter === 'all' ? true : q.type === filter
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 max-w-md mx-auto relative shadow-2xl overflow-x-hidden">
      
      {/* Header Stats */}
      <div className="flex justify-between items-end mb-8 pt-4 border-b border-gray-800 pb-4">
        <div>
          <p className="text-xs font-mono text-gray-500 mb-1">PLAYER RANK</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{stats.rank}</span>
            <span className="text-xs font-mono text-blue-400">Level {stats.level}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-gray-500 mb-1">SURVIVAL DAYS</p>
          <span className="text-2xl font-bold text-blue-400">{stats.streak}</span>
        </div>
      </div>

      {/* System Message */}
      <div className="bg-gray-900/50 border-l-2 border-purple-500 p-4 mb-8">
        <p className="text-xs font-mono text-purple-400 mb-1">SYSTEM MESSAGE</p>
        <p className="font-mono text-sm leading-relaxed text-gray-300">
          {systemState.dailyMessage}
        </p>
      </div>

      {/* Daily Quest Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <SystemText>DAILY QUESTS</SystemText>
          <span className="text-xs font-mono text-gray-500">{completedCount}/{totalCount}</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-800 mb-4">
           <div 
             className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-500"
             style={{ width: `${progress}%` }}
           />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(['all', 'strength', 'running', 'shadow'] as const).map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`
                        px-3 py-1 text-xs font-mono border uppercase transition-all whitespace-nowrap
                        ${filter === f 
                            ? 'border-blue-500 text-blue-400 bg-blue-900/20 shadow-[0_0_8px_rgba(59,130,246,0.3)]' 
                            : 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
                        }
                    `}
                >
                    {f === 'all' ? 'ALL' : f === 'running' ? 'RUN' : f === 'strength' ? 'STR' : 'SHADOW'}
                </button>
            ))}
        </div>
      </div>

      {/* Quest List */}
      <div className="space-y-4">
        {filteredQuests.map((quest) => (
          <QuestCard 
            key={quest.id} 
            quest={quest} 
            isActive={systemState.activeQuestId === quest.id}
            onClick={() => startQuest(quest.id)}
          />
        ))}
        {filteredQuests.length === 0 && (
            <div className="p-8 border border-gray-800 border-dashed text-center">
                <p className="text-gray-600 font-mono text-xs">NO TASKS IN CATEGORY</p>
            </div>
        )}
      </div>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-12 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none" />
    </div>
  );
};

export default App;