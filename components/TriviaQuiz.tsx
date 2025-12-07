'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TriviaQuestion, getRandomQuestions } from '@/lib/triviaQuestions';
import { GemIcon, CheckIcon, XIcon } from './icons';

interface TriviaQuizProps {
  onPointsEarned?: (points: number) => void;
  maxQuestions?: number;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function TriviaQuiz({ onPointsEarned, maxQuestions = 5 }: TriviaQuizProps) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [totalPoints, setTotalPoints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Initialize questions
  useEffect(() => {
    setQuestions(getRandomQuestions(maxQuestions));
  }, [maxQuestions]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = useCallback((optionIndex: number) => {
    if (answerState !== 'unanswered') return; // Already answered

    setSelectedAnswer(optionIndex);
    const isCorrect = optionIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      setAnswerState('correct');
      const newTotal = totalPoints + currentQuestion.points;
      setTotalPoints(newTotal);
      onPointsEarned?.(currentQuestion.points);
    } else {
      setAnswerState('incorrect');
    }

    setShowExplanation(true);

    // Auto-advance to next question after delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setAnswerState('unanswered');
        setShowExplanation(false);
      }
    }, 3000);
  }, [answerState, currentQuestion, currentIndex, questions.length, totalPoints, onPointsEarned]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Points Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full">
          <GemIcon className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-700">{totalPoints} pts</span>
        </div>
        <span className="text-xs text-slate-500">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        {/* Question */}
        <p className="text-slate-800 font-medium text-sm mb-4 leading-relaxed">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === currentQuestion.correctIndex;
            const showCorrect = answerState !== 'unanswered' && isCorrectOption;
            const showWrong = answerState === 'incorrect' && isSelected;

            let buttonClass = 'w-full text-left p-3 rounded-lg border text-sm transition-all ';

            if (answerState === 'unanswered') {
              buttonClass += 'border-slate-200 hover:border-teal-300 hover:bg-teal-50 active:bg-teal-100';
            } else if (showCorrect) {
              buttonClass += 'border-green-400 bg-green-50 text-green-800';
            } else if (showWrong) {
              buttonClass += 'border-red-400 bg-red-50 text-red-800';
            } else {
              buttonClass += 'border-slate-200 bg-slate-50 text-slate-500';
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={answerState !== 'unanswered'}
                className={buttonClass}
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    showCorrect ? 'bg-green-500' :
                    showWrong ? 'bg-red-500' :
                    'bg-slate-100'
                  }`}>
                    {showCorrect && <CheckIcon className="w-4 h-4 text-white" />}
                    {showWrong && <XIcon className="w-4 h-4 text-white" />}
                    {answerState === 'unanswered' && (
                      <span className="text-xs font-medium text-slate-400">
                        {String.fromCharCode(65 + index)}
                      </span>
                    )}
                  </div>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            answerState === 'correct'
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-start gap-2">
              {answerState === 'correct' ? (
                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <span className="text-amber-500 flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
              <div>
                <p className={`font-medium mb-1 ${
                  answerState === 'correct' ? 'text-green-800' : 'text-amber-800'
                }`}>
                  {answerState === 'correct' ? `+${currentQuestion.points} points!` : 'Good try!'}
                </p>
                <p className={answerState === 'correct' ? 'text-green-700' : 'text-amber-700'}>
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index < currentIndex ? 'bg-teal-500' :
              index === currentIndex ? 'bg-teal-500 w-4' :
              'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default TriviaQuiz;
