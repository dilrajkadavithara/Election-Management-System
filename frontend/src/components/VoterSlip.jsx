import React from 'react';
import './VoterSlip.css';
import symbolImg from '../assets/symbol.webp';

const VoterSlip = ({ voterName, serialNo, epicNo, boothNo, pollingStation, constituency, party }) => {
    // Branding Logic
    const themeStyle = party ? {
        '--party-color': party.primary_color,
        '--party-gradient': party.accent_gradient,
        '--party-color-tint': `${party.primary_color}20`, // Add transparency for tint
        '--party-color-rgba': `${party.primary_color}40`,
        '--party-color-alt': party.primary_color === '#000080' ? '#b45309' : party.primary_color // Alternative for accent
    } : {};

    const logoSrc = party ? `/api/party-symbol/${party.symbol_image}` : symbolImg;
    const partyName = party?.short_label || "INC";

    return (
        <div className="voter-slip-wrapper" style={themeStyle}>
            {/* Side Accent Bar */}
            <div className="side-accent-gradient"></div>

            {/* Left Section - Hero Symbol */}
            <div className="slip-left-section">
                <div className="party-symbol-container-premium">
                    <img src={logoSrc} alt="Party Symbol" className="party-symbol-img-premium" />
                </div>
                <div className="symbol-label-premium">{partyName}</div>
            </div>

            {/* Right Section - Premium Content */}
            <div className="slip-details-section">
                <div className="voter-data-container">
                    <header className="premium-header">
                        <div className="constituency-info">
                            <span className="constituency-label">Constituency</span>
                            <h3 className="constituency-name-premium">{constituency}</h3>
                        </div>
                    </header>

                    <div className="voter-hero-section">
                        <h1 className="voter-name-hero">{voterName}</h1>
                        <div className="epic-badge-premium">
                            <span className="epic-label">EPIC ID:</span>
                            <span className="epic-value">{epicNo}</span>
                        </div>
                    </div>

                    <div className="dual-badge-system">
                        <div className="premium-pill-badge blue-theme">
                            <div className="pill-content">
                                <span className="pill-title">Serial Number</span>
                                <span className="pill-number">{serialNo}</span>
                            </div>
                        </div>
                        <div className="premium-pill-badge amber-theme">
                            <div className="pill-content">
                                <span className="pill-title">Booth Number</span>
                                <span className="pill-number">{boothNo}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="luxury-footer">
                    <div className="station-icon">📍</div>
                    <div className="station-details">
                        <span className="station-label">Polling Station</span>
                        <p className="station-name-luxury">{pollingStation}</p>
                    </div>
                </footer>

                {/* The Absolute Safety Barrier */}
                <div className="safe-cut-barrier">
                    <span className="no-print opacity-20 text-[8px] uppercase font-bold">Safety Cutting Zone</span>
                </div>
            </div>
        </div>
    );
};

export default VoterSlip;
