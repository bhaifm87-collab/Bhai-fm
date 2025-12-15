import React from 'react';
import { Quest } from '../types';
import { SystemText } from './SystemText';

interface Props {
  quest: Quest;
  onClick: () => void;
  isActive: boolean;
}

export const QuestCard: React.FC<Props> = ({ quest, onClick, isActive }) => {
  return (
    <div 
      onClick={!quest.completed ? onClick : undefined}
      className={`
        relative w-full p-4 mb-3 border-l-4 transition-all duration-300
        ${quest.completed 
          ? 'border-gray-600 bg-gray-900/50 opacity-50' 
          : isActive 
            ? 'border-blue-400 bg-blue-900/20 scale-[1.02]' 
            : 'border-blue-800 bg-gray-900/30 hover:bg-gray-800'
        }
      `}
    >
      <div className="flex justify-between items-center">
        <div>
          <SystemText variant={quest.completed ? 'normal' : isActive ? 'glitch' : 'normal'} size="lg">
            {quest.title}
          </SystemText>
          <p className="text-gray-400 text-xs font-mono mt-1">{quest.description}</p>
        </div>
        <div className="text-right">
          <SystemText variant={quest.completed ? 'success' : 'warning'} size="xl">
             {quest.completed ? 'CLEARED' : `${quest.target} ${quest.unit.toUpperCase()}`}
          </SystemText>
        </div>
      </div>
      
      {/* Decorative lines */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-500/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-500/50" />
    </div>
  );
};
