"use client";

import React, { useState, useEffect } from 'react';
import { Goal, ChecklistItem } from '@/types/goal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowDown, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface GoalDetailViewProps {
  goal: Goal;
  onBack: () => void;
  onUpdateGoal: (updatedGoal: Goal) => void; // Add this
}

const GoalDetailView: React.FC<GoalDetailViewProps> = ({ goal, onBack, onUpdateGoal }) => {
  const [visibleTasks, setVisibleTasks] = useState(0);

  useEffect(() => {
    setVisibleTasks(0);
    const timer = setInterval(() => {
      setVisibleTasks((prev) => {
        if (prev >= goal.checklist.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [goal.id, goal.checklist.length]);

  const handleTaskToggle = async (taskId: string) => {
    const updatedChecklist = goal.checklist.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    const updatedGoal = { ...goal, checklist: updatedChecklist };
    
    // Update via API
    try {
      await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, completed: !goal.checklist.find(t => t.id === taskId)!.completed }),
      });
      onUpdateGoal(updatedGoal); // Update parent state
    } catch (error) {
      console.error('Failed to update checklist item:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-400 bg-red-50';
      case 'medium': return 'border-l-yellow-400 bg-yellow-50';
      case 'low': return 'border-l-green-400 bg-green-50';
      default: return 'border-l-gray-400 bg-gray-50';
    }
  };

  const completedTasks = goal.checklist.filter(task => task.completed).length;
  const totalTasks = goal.checklist.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button onClick={onBack} variant="outline" className="mb-4 rounded-xl">
          ← Back to Goals
        </Button>
        
        <div className={`p-8 rounded-2xl ${goal.color} text-white animate-scale-in`}>
          <h1 className="text-3xl font-bold mb-4">{goal.title}</h1>
          <div className="space-y-2">
            <div className="flex justify-between text-white/90">
              <span>Progress</span>
              <span>{completedTasks} of {totalTasks} completed</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-white h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 animate-fade-in">
            Your AI-Generated Action Plan
          </h2>
          
          {goal.checklist.map((task, index) => (
            <Card 
              key={task.id}
              className={`
                p-4 rounded-xl border-l-4 transition-all duration-500 hover:shadow-md
                ${getPriorityColor(task.priority)}
                ${index < visibleTasks 
                  ? 'opacity-100 translate-y-0 animate-slide-in-up' 
                  : 'opacity-0 translate-y-4'
                }
                ${task.completed ? 'opacity-60' : ''}
              `}
              style={{ 
                animationDelay: `${index * 100}ms`,
                transitionDelay: `${index * 50}ms`
              }}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => handleTaskToggle(task.id)}
                  className="mt-1 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                
                <div className="flex-1">
                  <p className={`text-gray-800 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.text}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${task.priority === 'high' ? 'bg-red-100 text-red-700' : ''}
                      ${task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${task.priority === 'low' ? 'bg-green-100 text-green-700' : ''}
                    `}>
                      {task.priority} priority
                    </span>
                  </div>
                </div>
                
                {task.completed && (
                  <div className="text-green-500 animate-scale-in">
                    <Check size={20} />
                  </div>
                )}
              </div>
            </Card>
          ))}
          
          {visibleTasks < goal.checklist.length && (
            <div className="flex justify-center py-4 animate-fade-in">
              <div className="flex items-center gap-2 text-purple-600">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Revealing next task...</span>
              </div>
            </div>
          )}
        </div>

        {completedTasks === totalTasks && totalTasks > 0 && (
          <Card className="mt-8 p-6 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-2xl animate-scale-in">
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
              <p>You've completed your goal: {goal.title}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GoalDetailView;