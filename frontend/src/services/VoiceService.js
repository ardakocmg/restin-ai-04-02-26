// Shared Voice Recognition Service
class VoiceService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  isSupported() {
    return this.recognition !== null;
  }

  startRecording() {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      this.isListening = true;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        resolve(transcript);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        reject(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  stopRecording() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export default VoiceService;
