"use client";

// lib/GoalContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Goal } from '@/types/goal';

interface GoalContextType {
  goals: Goal[];
  updateChecklistItem: (taskId: string, completed: boolean, goalId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export const GoalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals');
        if (!response.ok) throw new Error('Failed to fetch goals');
        const data = await response.json();
        setGoals(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch goals');
        setLoading(false);
      }
    };
    fetchGoals();
  }, []);

  const updateChecklistItem = async (taskId: string, completed: boolean, goalId: string) => {
    try {
      setGoals((prevGoals) =>
        prevGoals.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                checklist: goal.checklist.map((task) =>
                  task.id === taskId ? { ...task, completed } : task
                ),
              }
            : goal
        )
      );

      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, completed }),
      });

      if (!response.ok) throw new Error('Failed to update checklist item');

      const updatedItem = await response.json();
      setGoals((prevGoals) =>
        prevGoals.map((goal) =>
          goal.id === updatedItem.goal.id ? updatedItem.goal : goal
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update checklist item');
      setGoals((prevGoals) =>
        prevGoals.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                checklist: goal.checklist.map((task) =>
                  task.id === taskId ? { ...task, completed: !completed } : task
                ),
              }
            : goal
        )
      );
    }
  };

  return (
    <GoalContext.Provider value={{ goals, updateChecklistItem, loading, error }}>
      {children}
    </GoalContext.Provider>
  );
};

export const useGoals = () => {
  const context = useContext(GoalContext);
  if (!context) throw new Error('useGoals must be used within a GoalProvider');
  return context;
};