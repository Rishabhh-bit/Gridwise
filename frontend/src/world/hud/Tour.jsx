import React from 'react';
import { Play, Pause, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

export function TourOverlay({
  active,
  currentStep,
  totalSteps,
  caption,
  stepInfo,
  onNext,
  onPrev,
  onClose,
  playing,
  onTogglePlay,
}) {
  if (!active) return null;

  return (
    <div className="tour-narrative-overlay" role="dialog" aria-label="Guided Shortage Tour">
      <div className="tour-card">
        <header className="tour-header">
          <div className="tour-badge">
            <Sparkles size={13} />
            <span>FOLLOW THE SHORTAGE · STEP {currentStep + 1} OF {totalSteps}</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close Tour">
            <X size={15} />
          </button>
        </header>

        <div className="tour-body">
          <h3>{stepInfo?.title}</h3>
          <p className="tour-step-desc">{stepInfo?.description}</p>
          <div className="tour-caption-box">
            <p>{caption}</p>
          </div>
        </div>

        <footer className="tour-footer">
          <div className="tour-playback-ctrls">
            <button
              className="button secondary"
              onClick={onTogglePlay}
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
              <span>{playing ? 'Pause Tour' : 'Resume'}</span>
            </button>
            <button
              className="icon-button"
              disabled={currentStep === 0}
              onClick={onPrev}
              aria-label="Previous tour step"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="icon-button"
              disabled={currentStep === totalSteps - 1}
              onClick={onNext}
              aria-label="Next tour step"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="button primary" onClick={currentStep < totalSteps - 1 ? onNext : onClose}>
            <span>{currentStep < totalSteps - 1 ? 'Next Step' : 'Finish Tour'}</span>
            <ChevronRight size={14} />
          </button>
        </footer>
      </div>
    </div>
  );
}
