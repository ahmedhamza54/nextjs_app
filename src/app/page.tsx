"use client";

import React, { useEffect, useState } from 'react';
import { Goal } from '@/types/goal';
import GoalCard from '@/components/GoalCard';
import AddGoalModal from '@/components/AddGoalModal';
import GoalDetailView from '@/components/GoalDetailView';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const Index = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const dbGoals = await fetch('/api/goals').then(res => res.json());
        setGoals(dbGoals);
      } catch (error) {
        console.error('Failed to load goals:', error);
      }
    };

    loadGoals();
  }, []);

  const handleAddGoal = async (title: string) => {
    const tempId = `temp-${Date.now()}`;
    const tempGoal: Goal = {
      id: tempId,
      title,
      isGenerating: true,
      isGenerated: false,
      checklist: [],
      color: '',
      createdAt: new Date().toISOString(),
    };

    setGoals(prev => [...prev, tempGoal]);

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      const newGoal: Goal = await res.json();

      setGoals(prev =>
        prev.map(goal => (goal.id === tempId ? newGoal : goal))
      );
    } catch (err) {
      console.error('Failed to add goal:', err);
      setGoals(prev => prev.filter(goal => goal.id !== tempId));
    }
  };

  const handleGoalClick = (goal: Goal) => {
    if (goal.isGenerated) {
      setSelectedGoal(goal);
    }
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setGoals(prev =>
      prev.map(goal => (goal.id === updatedGoal.id ? updatedGoal : goal))
    );
    setSelectedGoal(updatedGoal);
  };

  if (selectedGoal) {
    return (
      <GoalDetailView
        goal={selectedGoal}
        onBack={() => setSelectedGoal(null)}
        onUpdateGoal={handleUpdateGoal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            AI Goal Planner
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Let AI create personalized action plans for your goals
          </p>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus size={24} className="mr-2" />
            Add New Goal
          </Button>
        </div>

        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => handleGoalClick(goal)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">
              Ready to achieve your goals?
            </h3>
            <p className="text-gray-500 text-lg">
              Add your first goal and let AI create a personalized action plan for you
            </p>
          </div>
        )}

        <AddGoalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddGoal={handleAddGoal}
        />
      </div>
    </div>
  );
};

export default Index;
