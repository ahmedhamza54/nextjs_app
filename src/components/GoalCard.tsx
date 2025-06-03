"use client";

import React from 'react';
import { Goal } from '@/types/goal';
import { Card } from '@/components/ui/card';

interface GoalCardProps {
  goal: Goal;
  onClick: () => void;
}

const GOAL_COLORS = [
  'bg-gradient-to-br from-purple-500 to-pink-500',
  'bg-gradient-to-br from-blue-500 to-cyan-500',
  'bg-gradient-to-br from-green-500 to-teal-500',
  'bg-gradient-to-br from-orange-500 to-red-500',
  'bg-gradient-to-br from-indigo-500 to-purple-500',
  'bg-gradient-to-br from-pink-500 to-rose-500',
];

// 🧠 Use goal ID to consistently assign a color
const getColorFromId = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GOAL_COLORS.length;
  return GOAL_COLORS[index];
};

const GoalCard: React.FC<GoalCardProps> = ({ goal, onClick }) => {
  const assignedColor = goal.color && goal.color.includes('from-')
    ? goal.color
    : getColorFromId(goal.id); // ✅ Use goal ID to get consistent color

  const completed = goal.checklist?.filter(item => item.completed).length ?? 0;
  const total = goal.checklist?.length ?? 1;
  const progress = (completed / total) * 100;

  const getCardClasses = () => {
    if (goal.isGenerating) {
      return `
        bg-gradient-to-br from-gray-200 to-gray-300
        animate-pulse animate-fade-in
        cursor-not-allowed
      `;
    }

    if (goal.isGenerated) {
      return `
        ${assignedColor}
        hover:scale-105 transform transition-all duration-300 
        cursor-pointer hover:shadow-xl
        animate-scale-in
      `;
    }

    return `
      bg-gray-200 
      cursor-not-allowed
    `;
  };

  const getTextClasses = () => {
    if (goal.isGenerating) {
      return 'text-gray-600 animate-pulse';
    }

    if (goal.isGenerated) {
      return 'text-white font-semibold';
    }

    return 'text-gray-500';
  };

  return (
    <Card 
      className={`
        p-6 rounded-2xl border-none relative overflow-hidden
        ${getCardClasses()}
      `}
      onClick={goal.isGenerated ? onClick : undefined}
    >
      {goal.isGenerating && (
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-ping"></div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className={`text-lg ${getTextClasses()}`}>
          {goal.title}
        </h3>

        {goal.isGenerating && (
          <p className="text-sm text-gray-500 animate-fade-in">
            AI is generating your plan...
          </p>
        )}

        {goal.isGenerated && (
          <p className="text-white/80 text-sm">
            {total} tasks ready
          </p>
        )}

        {!goal.isGenerating && !goal.isGenerated && (
          <p className="text-gray-400 text-sm">
            Waiting to generate...
          </p>
        )}
      </div>

      {goal.isGenerated && (
        <div className="mt-4">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GoalCard;
