// src/components/CheckinForm.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { endpoints } from '../config';


interface CheckinFormProps {
  onSuccess: () => void; // Callback to refresh the chart after a successful submission
}

//Wellshift-Backend-v1

const CheckinForm: React.FC<CheckinFormProps> = ({ onSuccess }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
//   const [spinnerVisible, setSpinnerVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useVoiceInput();

  // Update text when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setText(prev => prev + (prev ? ' ' : '') + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  const getAnonUserId = async (): Promise<string> => {
    let anonUserId = localStorage.getItem('anonUserId');
    if (anonUserId) {
      return anonUserId;
    }

    try {
      const response = await axios.get(endpoints.authAnon, {
        headers: { 'Accept': 'application/json' },
        timeout: 15000,
      });

      anonUserId = response.data?.anon_user_id;
      if (anonUserId) {
        localStorage.setItem('anonUserId', anonUserId);
        return anonUserId;
      }
    } catch (err) {
      console.warn('CheckinForm: Unable to fetch anonymous user id from backend, using local fallback.', err);
    }

    anonUserId = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('anonUserId', anonUserId);
    return anonUserId;
  };

  const getLocalEntriesKey = (anonUserId: string) => `dailyEntries_${anonUserId}`;

  const saveEntryLocally = (entry: any, anonUserId: string) => {
    const key = getLocalEntriesKey(anonUserId);
    const localEntries = JSON.parse(localStorage.getItem(key) || '[]');
    localEntries.push(entry);
    localStorage.setItem(key, JSON.stringify(localEntries));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (text.trim().length < 20) {
      setError("Please write at least 20 characters for a meaningful analysis.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const anonUserId = await getAnonUserId();
      // Use the centralized endpoint configuration
      const response = await axios.post(endpoints.checkin, {
        user_text: text,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Anon-User-Id': anonUserId,
        },
        timeout: 30000, // 30 second timeout
      });

      console.log('Check-in submitted successfully:', response.data);
      
      if (response.data?.anon_user_id) {
        localStorage.setItem('anonUserId', response.data.anon_user_id);
      }
      
      const sentimentLabel = response.data.sentiment_score > 0.6 ? 'positive' : 
                            response.data.sentiment_score < 0.4 ? 'concerning' : 'neutral';
      console.log(`Sentiment analysis: ${sentimentLabel} (${(response.data.sentiment_score * 100).toFixed(1)}%)`);
      
      const newEntry = {
        id: response.data.id,
        timestamp: response.data.timestamp,
        sentiment_score: response.data.sentiment_score,
        anomaly_flag: response.data.anomaly_flag,
        user_text: text.trim(),
        anon_user_id: response.data?.anon_user_id || anonUserId,
      };
      saveEntryLocally(newEntry, anonUserId);
      console.log('CheckinForm: Added entry to localStorage');
      
      setText('');
      onSuccess();
    } catch (err: any) {
      console.error('CheckinForm: API error:', err);
      
      if (err.code === 'ECONNABORTED') {
        setError("Request timed out. The server might be starting up, please try again in a moment.");
      } else if (err.response?.status === 500) {
        setError("Server error. The backend database might be unavailable. Your entry has been saved locally.");
      } else if (err.response?.status >= 400) {
        setError(`Server error (${err.response.status}): ${err.response.data?.detail || 'Unknown error'}`);
      } else if (err.request) {
        setError("Cannot connect to server. Please check your internet connection or try again later.");
      } else {
        setError("Failed to submit entry. Please try again.");
      }
      
      // Even if backend fails, save to localStorage as offline backup
      const offlineEntry = {
        id: `offline-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sentiment_score: 0.5, // Default neutral sentiment
        anomaly_flag: false,
        user_text: text.trim(),
        offline: true,
        anon_user_id: localStorage.getItem('anonUserId') || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      };
      saveEntryLocally(offlineEntry, offlineEntry.anon_user_id);
      console.log('CheckinForm: Saved offline entry to localStorage');
      
      // Still trigger refresh to show the offline entry
      setText('');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* {spinnerVisible ? */}
      {/* Source - https://stackoverflow.com/a/47842233
        Posted by Alex
        Retrieved 2026-07-09, License - CC BY-SA 3.0 */}

      {/* <img src={spinner} alt="loading..." /> */}

      {/* : */}
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Daily Mental Health Check-in</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="reflection-text" className="block text-lg font-medium text-gray-700 mb-3">
                            How are you feeling today? Share whatever is on your mind.
                        </label>
                        <textarea
                            id="reflection-text"
                            value={text}
                            onChange={(e) => {
                            setText(e.target.value);
                            setError(null);
                            }}
                            rows={6}
                            placeholder="Write about your day, your feelings, thoughts, or anything you'd like to share..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
                            disabled={loading}
                            required
                        />
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-500">
                                {text.length}/20 characters minimum
                            </span>
                            {isSupported && (
                                <button
                                    type="button"
                                    onClick={isListening ? stopListening : startListening}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                                    isListening 
                                        ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                                        : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                    }`}
                                    title={isListening ? 'Stop voice input' : 'Start voice input'}
                                >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
                                </svg>
                                <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
                            </button>
                        )}
                    </div>
                    </div>

                    {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                        </svg>
                        <p className="text-red-800 font-medium">{error}</p>
                        </div>
                    </div>
                    )}

                    <div className="flex justify-center">
                        <button 
                            type="submit" 
                            disabled={loading || text.trim().length < 20}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            {loading ? 'Analyzing...' : 'Submit Entry'}
                        </button>
                    </div>
                </form>
            </div>
        {/* } */}
    </div>
  );
};

export default CheckinForm;