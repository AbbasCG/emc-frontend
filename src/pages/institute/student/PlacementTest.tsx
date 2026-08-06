import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, ChevronRight, AlertCircle, Headphones, BookOpen } from 'lucide-react';
import { EmcButton } from '@/components/ui';

// Mock data for the placement test
const testQuestions = [
  {
    id: 1,
    type: 'reading',
    question: 'Read the following text and select the best summary.',
    text: 'Global warming is a major challenge of our time. It refers to the long-term heating of Earth\'s climate system, primarily due to human activities.',
    options: [
      'Global warming is caused by natural events.',
      'Global warming is a major human-induced climate issue.',
      'Climate change is not a real problem.',
      'Earth\'s climate is cooling down.'
    ],
  },
  {
    id: 2,
    type: 'grammar',
    question: 'Choose the correct word: "I ______ to the store yesterday."',
    options: ['go', 'gone', 'went', 'going'],
  },
  {
    id: 3,
    type: 'listening',
    question: 'Listen to the audio and answer: What did the speaker buy?',
    audioSrc: '/mock-audio.mp3', // Mock audio
    options: ['A car', 'A book', 'A laptop', 'A phone'],
  }
];

export default function PlacementTest() {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const [isFinished, setIsFinished] = useState(false);
  const [level, setLevel] = useState<string | null>(null);

  // Timer logic
  useEffect(() => {
    if (started && !isFinished && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timerId);
    } else if (timeLeft === 0 && started && !isFinished) {
      handleFinish();
    }
  }, [started, isFinished, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelect = (option: string) => {
    setAnswers({ ...answers, [currentStep]: option });
  };

  const handleNext = () => {
    if (currentStep < testQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setIsFinished(true);
    // Mock API call to submit answers and get level
    setTimeout(() => {
      setLevel('B1'); // Assigned level
    }, 1500);
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 md:p-12 text-center"
        >
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">English Placement Test</h1>
          <p className="text-gray-600 mb-8 text-lg">
            This test will help us determine your English proficiency level to place you in the perfect class. 
            It includes reading, grammar, and listening sections.
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 text-left flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900">Important Instructions</h3>
              <ul className="list-disc list-inside text-blue-800 mt-2 space-y-1">
                <li>You have <strong>60 minutes</strong> to complete the test.</li>
                <li>Make sure you are in a quiet environment.</li>
                <li>You will need headphones for the listening section.</li>
                <li>Do not refresh the page during the test.</li>
              </ul>
            </div>
          </div>

          <EmcButton 
            size="lg" 
            className="w-full sm:w-auto px-12 text-lg h-14"
            onClick={() => setStarted(true)}
          >
            Start Test Now
          </EmcButton>
        </motion.div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center"
        >
          {!level ? (
            <div className="flex flex-col items-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600 text-lg">Analyzing your results...</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Test Completed!</h2>
              <p className="text-gray-600 mb-6">Based on your results, you have been placed in:</p>
              
              <div className="bg-primary-50 rounded-xl p-6 mb-8 border border-primary-100">
                <span className="block text-primary-600 font-semibold mb-1">Your Level</span>
                <span className="text-5xl font-extrabold text-primary-700 tracking-tight">{level}</span>
                <p className="text-primary-800 mt-3 font-medium">Intermediate English</p>
              </div>

              <EmcButton size="lg" className="w-full">
                Continue to Payment
              </EmcButton>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  const currentQ = testQuestions[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 px-4 py-2 rounded-lg font-medium text-gray-700">
            Question {currentStep + 1} of {testQuestions.length}
          </div>
          <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
            <motion.div 
              className="h-full bg-primary-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep) / testQuestions.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 text-rose-600 font-mono text-lg bg-rose-50 px-4 py-2 rounded-lg border border-rose-100">
          <Clock className="w-5 h-5" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border p-8 md:p-12"
        >
          {currentQ.type === 'listening' && (
            <div className="mb-8 flex flex-col items-center justify-center p-8 bg-blue-50 rounded-xl border border-blue-100">
              <Headphones className="w-12 h-12 text-blue-600 mb-4" />
              <audio controls className="w-full max-w-md">
                <source src={currentQ.audioSrc} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {currentQ.text && (
            <div className="mb-8 p-6 bg-gray-50 rounded-xl border text-gray-800 text-lg leading-relaxed">
              {currentQ.text}
            </div>
          )}

          <h2 className="text-2xl font-semibold text-gray-900 mb-8 leading-tight">
            {currentQ.question}
          </h2>

          <div className="space-y-4">
            {currentQ.options.map((option, idx) => {
              const isSelected = answers[currentStep] === option;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                    isSelected 
                      ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-sm' 
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{option}</span>
                  {isSelected && <CheckCircle2 className="w-6 h-6 text-primary-600" />}
                </button>
              );
            })}
          </div>

          <div className="mt-12 flex justify-end">
            <EmcButton 
              size="lg"
              disabled={!answers[currentStep]}
              onClick={handleNext}
              className="px-8"
            >
              {currentStep === testQuestions.length - 1 ? 'Submit Test' : 'Next Question'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </EmcButton>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
