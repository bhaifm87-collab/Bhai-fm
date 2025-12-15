class AudioService {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = this.loadVoice.bind(this);
    }
  }

  private loadVoice() {
    const voices = this.synth.getVoices();
    // Try to find a robotic or authoritative voice
    this.voice = voices.find(v => v.name.includes('Google US English')) || 
                 voices.find(v => v.name.includes('Samantha')) || 
                 voices[0];
  }

  public speak(text: string, rate: number = 1.0, pitch: number = 1.0) {
    if (!this.synth) return;
    
    // Cancel previous utterances for immediate feedback
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  public playPing() {
    // Simple oscillator beep for UI interaction
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        // Audio context might be blocked
    }
  }
}

export const audioService = new AudioService();
