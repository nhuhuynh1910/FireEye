/* components/SafetyVoteModal.jsx */
import React, { useState, useEffect } from 'react';
import { useSystem } from '../store/SystemContext';
import { API_BASE_URL } from '../services/api';

export const SafetyVoteModal = () => {
    const { activeVote, submitVote, isCameraOnline } = useSystem();
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!activeVote) return;

        const calculateTime = () => {
            const remaining = Math.max(0, Math.round(activeVote.expires_at - (Date.now() / 1000)));
            setTimeLeft(remaining);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [activeVote]);

    if (!activeVote) return null;

    const streamUrl = `${API_BASE_URL}/api/camera/stream?t=${Date.now()}`;
    const progressPercent = Math.min(100, (timeLeft / 45) * 100);

    return (
        <div className="safety-modal-overlay">
            <div className="safety-modal-container">
                <div className="safety-modal-header" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="safety-header-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--accent-amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px var(--accent-amber))' }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    <div className="safety-header-text">
                        <h2>SAFETY CRITICAL DIRECTIVE</h2>
                        <p>Consensus Verification Required</p>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="safety-modal-body">
                    {/* Left: Video Feed */}
                    <div className="safety-video-pane">
                        <div className="safety-video-title">
                            ZONE {activeVote.zone_id} LIVE SCAN FEED
                        </div>
                        <div className="safety-video-wrapper">
                            {isCameraOnline ? (
                                <img src={streamUrl} alt="Safety Live Stream" className="safety-stream-image" />
                            ) : (
                                <div className="safety-video-offline">
                                    <span>[ CAMERA FEED OFFLINE ]</span>
                                </div>
                            )}
                            <div className="safety-camera-overlay-hud">
                                <span className="hud-class-label">ZONE_{activeVote.zone_id}</span>
                                <span className="hud-rec-dot">● REC</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Vote Panel Details */}
                    <div className="safety-details-pane">
                        <div className="safety-detail-item">
                            <span className="detail-label">INITIATOR:</span>
                            <span className="detail-value text-cyan">{activeVote.initiator_name}</span>
                        </div>
                        <div className="safety-detail-item">
                            <span className="detail-label">TARGET ACTION:</span>
                            <span className="detail-value text-red">
                                TURN SPRINKLER {activeVote.target_action}
                            </span>
                        </div>
                        
                        {/* Vote Counts */}
                        <div className="safety-vote-tally-box">
                            <div className="tally-header">VOTE COUNT SUMMARY</div>
                            <div className="tally-body">
                                <div className="tally-column approve">
                                    <span className="tally-label">APPROVE</span>
                                    <span className="tally-count">{activeVote.votes_approve}</span>
                                </div>
                                <div className="tally-divider"></div>
                                <div className="tally-column reject">
                                    <span className="tally-label">REJECT</span>
                                    <span className="tally-count">{activeVote.votes_reject}</span>
                                </div>
                            </div>
                            <div className="tally-threshold">
                                CONSENSUS THRESHOLD: <strong>{activeVote.votes_approve} / {activeVote.threshold}</strong>
                            </div>
                        </div>

                        {/* Timer / Progress Bar */}
                        <div className="safety-timer-box">
                            <div className="timer-header">
                                <span>TIME REMAINING:</span>
                                <span className="timer-countdown">{timeLeft} SECONDS</span>
                            </div>
                            <div className="timer-progress-container">
                                <div 
                                    className="timer-progress-bar" 
                                    style={{ 
                                        width: `${progressPercent}%`,
                                        backgroundColor: timeLeft > 10 ? 'var(--accent-cyan)' : '#ef4444'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="safety-modal-actions">
                    <button 
                        className="btn-safety-vote approve" 
                        onClick={() => submitVote('APPROVE')}
                    >
                        ✓ APPROVE OPERATIONAL DIRECTIVE
                    </button>
                    <button 
                        className="btn-safety-vote reject" 
                        onClick={() => submitVote('REJECT')}
                    >
                        ✗ REJECT DIRECTIVE (ABORT)
                    </button>
                </div>
            </div>
        </div>
    );
};
