'use client';

import React, { useState, useMemo } from 'react';
import { QuestionMarkIcon, XIcon, SearchIcon, ChevronRightIcon, MessageCircleIcon, SparklesIcon, CameraIcon, GemIcon, LockIcon } from './icons';

// FAQ Categories and Questions
const FAQ_DATA = {
  categories: [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: SparklesIcon,
      color: 'text-teal-500 bg-teal-50',
    },
    {
      id: 'appraisals',
      name: 'Appraisals',
      icon: CameraIcon,
      color: 'text-blue-500 bg-blue-50',
    },
    {
      id: 'collections',
      name: 'Collections',
      icon: GemIcon,
      color: 'text-purple-500 bg-purple-50',
    },
    {
      id: 'subscription',
      name: 'Pro & Billing',
      icon: LockIcon,
      color: 'text-amber-500 bg-amber-50',
    },
  ],
  questions: [
    // Getting Started
    {
      id: 'how-it-works',
      category: 'getting-started',
      question: 'How does RealWorth work?',
      answer: 'RealWorth uses advanced AI to analyze photos of your items and provide instant valuations. Simply snap a photo, and our AI examines details like condition, rarity, brand, and market trends to estimate its worth. It\'s like having an expert appraiser in your pocket!',
      keywords: ['how', 'work', 'what', 'does', 'start'],
    },
    {
      id: 'first-appraisal',
      category: 'getting-started',
      question: 'How do I get my first appraisal?',
      answer: '1. Sign in with your Google account\n2. Click "Start Appraisal" on the home page\n3. Upload or take photos of your item\n4. Add condition details (optional)\n5. Click "Get Appraisal" and wait for AI analysis\n\nYour appraisal will be ready in about 30 seconds!',
      keywords: ['first', 'start', 'begin', 'appraisal', 'how to'],
    },
    {
      id: 'what-can-appraise',
      category: 'getting-started',
      question: 'What items can I appraise?',
      answer: 'RealWorth can appraise almost anything! Popular categories include:\n\n• Books & First Editions\n• Collectibles (cards, coins, memorabilia)\n• Antiques & Vintage Items\n• Art & Prints\n• Jewelry & Watches\n• Electronics\n• Toys & Games\n• Furniture\n\nIf it has value, we can help you discover it!',
      keywords: ['what', 'items', 'things', 'can', 'appraise', 'types'],
    },
    // Appraisals
    {
      id: 'photo-tips',
      category: 'appraisals',
      question: 'How do I take good photos for appraisal?',
      answer: 'For the best results:\n\n• Use good lighting (natural light works great)\n• Take multiple angles\n• Include close-ups of markings, signatures, or labels\n• Show any wear or damage\n• Include a size reference if helpful\n• Avoid blurry or dark photos\n\nThe more detail, the more accurate your appraisal!',
      keywords: ['photo', 'picture', 'camera', 'tips', 'better', 'good'],
    },
    {
      id: 'accuracy',
      category: 'appraisals',
      question: 'How accurate are the valuations?',
      answer: 'Our AI analyzes millions of data points from auction houses, marketplaces, and historical sales. Valuations are estimates based on current market conditions and comparable items.\n\nFor high-value items, we recommend getting a professional appraisal. Our estimates give you a great starting point for understanding your item\'s potential worth.',
      keywords: ['accurate', 'accuracy', 'reliable', 'trust', 'correct', 'value'],
    },
    {
      id: 'scan-mode',
      category: 'appraisals',
      question: 'What is Scan Mode?',
      answer: 'Scan Mode lets you quickly appraise multiple items in a row! Perfect for:\n\n• Estate cleanouts\n• Garage sale prep\n• Inventory assessment\n• Quick collection scanning\n\nJust tap "Scan Mode" and point your camera - our AI auto-detects items and queues them for appraisal.',
      keywords: ['scan', 'mode', 'bulk', 'multiple', 'fast', 'quick'],
    },
    // Collections
    {
      id: 'create-collection',
      category: 'collections',
      question: 'How do I create a collection?',
      answer: '1. Go to the Collections tab\n2. Tap "Create Collection"\n3. Name your collection (e.g., "Vinyl Records", "Sports Cards")\n4. Add items from your appraisal history\n\nCollections help you organize and track the total value of related items!',
      keywords: ['collection', 'create', 'make', 'organize', 'group'],
    },
    {
      id: 'collection-validation',
      category: 'collections',
      question: 'What is collection validation?',
      answer: 'Collection validation helps you build complete sets! When appraising items for a collection, our AI checks:\n\n• If the item belongs to the set\n• What number/edition it is\n• Which items you\'re missing\n• Completeness percentage\n\nGreat for trading cards, book series, or any collectible set!',
      keywords: ['validation', 'validate', 'set', 'complete', 'series'],
    },
    // Subscription
    {
      id: 'free-vs-pro',
      category: 'subscription',
      question: 'What\'s the difference between Free and Pro?',
      answer: '**Free Plan:**\n• 3 appraisals per month\n• Basic AI analysis\n• Appraisal history\n\n**Pro Plan ($19.99/month or $149.99/year):**\n• Unlimited appraisals\n• AI chat for deeper analysis\n• Priority processing\n• Collection validation\n• Export to PDF\n• Priority support',
      keywords: ['free', 'pro', 'difference', 'plan', 'subscription', 'price', 'cost'],
    },
    {
      id: 'cancel-subscription',
      category: 'subscription',
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel anytime:\n\n1. Go to your Profile page\n2. Scroll to "Subscription" section\n3. Click "Manage Subscription"\n4. Select "Cancel Subscription"\n\nYou\'ll keep Pro access until the end of your billing period. Your appraisals and history are always saved!',
      keywords: ['cancel', 'subscription', 'stop', 'end', 'billing'],
    },
    {
      id: 'payment-methods',
      category: 'subscription',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards through Stripe:\n\n• Visa\n• Mastercard\n• American Express\n• Discover\n\nAll payments are securely processed. We never store your card details.',
      keywords: ['payment', 'pay', 'credit', 'card', 'method', 'stripe'],
    },
  ],
};

interface HelpChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpChatWidget({ isOpen, onClose }: HelpChatWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  // Filter questions based on search or category
  const filteredQuestions = useMemo(() => {
    let questions = FAQ_DATA.questions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      questions = questions.filter(q =>
        q.question.toLowerCase().includes(query) ||
        q.answer.toLowerCase().includes(query) ||
        q.keywords.some(k => query.includes(k))
      );
    } else if (selectedCategory) {
      questions = questions.filter(q => q.category === selectedCategory);
    }

    return questions;
  }, [searchQuery, selectedCategory]);

  const selectedQuestionData = FAQ_DATA.questions.find(q => q.id === selectedQuestion);

  const handleBack = () => {
    if (selectedQuestion) {
      setSelectedQuestion(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
  };

  const handleQuestionSelect = (questionId: string) => {
    setSelectedQuestion(questionId);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedCategory(null);
    setSelectedQuestion(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-20 bottom-20 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:max-h-[600px] z-50 bg-white rounded-2xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            {(selectedCategory || selectedQuestion) && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 rotate-180" />
              </button>
            )}
            <div>
              <h3 className="font-semibold">
                {selectedQuestion ? 'Answer' : selectedCategory ? FAQ_DATA.categories.find(c => c.id === selectedCategory)?.name : 'Help Center'}
              </h3>
              {!selectedQuestion && !selectedCategory && (
                <p className="text-teal-100 text-xs">How can we help you?</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar (only on main screen) */}
        {!selectedQuestion && (
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for help..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Show Answer */}
          {selectedQuestion && selectedQuestionData && (
            <div className="p-4">
              <h4 className="font-semibold text-slate-900 mb-3">{selectedQuestionData.question}</h4>
              <div className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                {selectedQuestionData.answer}
              </div>
            </div>
          )}

          {/* Show Categories (home screen, no search) */}
          {!selectedQuestion && !selectedCategory && !searchQuery && (
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Categories</p>
              <div className="grid grid-cols-2 gap-2">
                {FAQ_DATA.categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-sm transition-all text-left ${category.color}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium text-slate-700">{category.name}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-6 mb-3">Popular Questions</p>
              <div className="space-y-1">
                {FAQ_DATA.questions.slice(0, 4).map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleQuestionSelect(q.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-sm text-slate-700">{q.question}</span>
                    <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show Questions (category selected or search results) */}
          {!selectedQuestion && (selectedCategory || searchQuery) && (
            <div className="p-4">
              {filteredQuestions.length > 0 ? (
                <div className="space-y-1">
                  {filteredQuestions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleQuestionSelect(q.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                    >
                      <span className="text-sm text-slate-700">{q.question}</span>
                      <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <QuestionMarkIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No results found for "{searchQuery}"</p>
                  <p className="text-slate-400 text-xs mt-1">Try different keywords or browse categories</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Contact Support */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 text-center mb-2">Still need help?</p>
          <a
            href="mailto:support@realworth.ai"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <MessageCircleIcon className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </>
  );
}

// Help Button Component for Header
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-full transition-colors"
      aria-label="Help"
      title="Help Center"
    >
      <QuestionMarkIcon className="w-5 h-5" />
    </button>
  );
}

export default HelpChatWidget;
