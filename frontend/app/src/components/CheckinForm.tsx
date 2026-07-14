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
    //const [spinnerVisible, setSpinnerVisible] = useState(true);
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
        let anonUserId = localStorage.getItem("anonUserId");

        if (anonUserId) {
            return anonUserId;
        }

        try {
            console.log("GET", endpoints.authAnon);

            const response = await axios.get(endpoints.authAnon, {
                headers: {
                    Accept: "application/json",
                },
            });

            anonUserId = response.data.anon_user_id;

            if (anonUserId) {
                localStorage.setItem("anonUserId", anonUserId);
                return anonUserId;
            }

            throw new Error("Backend did not return anon_user_id");
        } catch (err) {
            console.warn("Using locally generated anonymous ID.", err);

            anonUserId = `anon-${crypto.randomUUID()}`;
            localStorage.setItem("anonUserId", anonUserId);

            return anonUserId;
        }
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

        // 1. Validation Check
        if (text.trim().length < 20) {
            setError("Please write at least 20 characters for a meaningful analysis.");
            return;
        }

        setLoading(true);
        setError(null);

        // Track the current user ID for the fallback block scope
        let currentAnonUserId = localStorage.getItem('anonUserId') || '';

        try {
            // 2. Retrieve Anonymous User ID
            currentAnonUserId = await getAnonUserId();

            // 3. Make API POST Request using centralized endpoints
            const response = await axios.post(endpoints.checkin, {
                user_text: text.trim(),
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Anon-User-Id': currentAnonUserId,
                },
                timeout: 15000, // 15-second timeout for snappy responsiveness
            });

            console.log('Check-in submitted successfully:', response.data);

            // 4. Update local tracking ID if backend returns a refreshed one
            if (response.data?.anon_user_id) {
                currentAnonUserId = response.data.anon_user_id;
                localStorage.setItem('anonUserId', currentAnonUserId);
            }

            // 5. Build and log sentiment metrics
            const sentimentLabel = response.data.sentiment_score > 0.6 ? 'positive' :
                response.data.sentiment_score < 0.4 ? 'concerning' : 'neutral';
            console.log(`Sentiment analysis: ${sentimentLabel} (${(response.data.sentiment_score * 100).toFixed(1)}%)`);

            // 6. Persist successful entry locally
            const newEntry = {
                id: response.data.id,
                timestamp: response.data.timestamp,
                sentiment_score: response.data.sentiment_score,
                anomaly_flag: response.data.anomaly_flag,
                user_text: text.trim(),
                anon_user_id: currentAnonUserId,
            };
            saveEntryLocally(newEntry, currentAnonUserId);
            console.log('CheckinForm: Added entry to localStorage');

            // 7. Reset Form UI & Refresh Chart
            setText('');
            onSuccess();

        } catch (err: any) {
            // 8. Clean, structured error logging to inspect exactly what failed
            console.error('CheckinForm: API error details:', {
                message: err.message,
                code: err.code,
                status: err.response?.status,
                data: err.response?.data
            });

            // 9. Informative error message handling based on real error signatures
            if (err.code === 'ECONNABORTED') {
                setError("Request timed out. The server might be starting up, please try again.");
            } else if (err.response?.status === 500) {
                setError("Server database error. Your entry has been saved locally as a backup.");
            } else if (err.response?.status >= 400) {
                setError(`Server rejected request (${err.response.status}): ${err.response.data?.detail || 'Invalid submission format'}`);
            } else if (err.request) {
                setError("Cannot reach server. Saved entry locally to sync when connection returns.");
            } else {
                setError(`Submission error: ${err.message || 'Saved offline backup.'}`);
            }

            // 10. Fallback: Save offline backup entry so your data is never lost
            const fallbackId = currentAnonUserId || `anon-${crypto.randomUUID()}`;
            if (!localStorage.getItem('anonUserId')) {
                localStorage.setItem('anonUserId', fallbackId);
            }

            const offlineEntry = {
                id: `offline-${Date.now()}`,
                timestamp: new Date().toISOString(),
                sentiment_score: 0.5, // Default baseline neutral sentiment
                anomaly_flag: false,
                user_text: text.trim(),
                offline: true,
                anon_user_id: fallbackId,
            };

            saveEntryLocally(offlineEntry, fallbackId);
            console.log('CheckinForm: Saved offline backup entry to localStorage');

            // 11. Clear form and trigger chart updates anyway to showcase offline data
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
                                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${isListening
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