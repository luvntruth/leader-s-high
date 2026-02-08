
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

export interface LiveHandlers {
  onTranscription?: (role: 'user' | 'model', text: string) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'open' | 'closed') => void;
}

export class GeminiLiveService {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext?: AudioContext;
  private outputAudioContext?: AudioContext;
  private scriptProcessor?: ScriptProcessorNode;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  private stream?: MediaStream;

  constructor() {}

  // 가이드라인: 수동 Base64 디코딩
  private decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // 가이드라인: 수동 Base64 인코딩
  private encode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // 가이드라인: Raw PCM(16-bit) -> AudioBuffer 변환
  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  // 가이드라인: 마이크 입력을 Raw PCM Blob으로 인코딩
  private createBlob(data: Float32Array): Blob {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: this.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  async connect(systemInstruction: string, handlers: LiveHandlers) {
    if (this.sessionPromise) return;

    try {
      handlers.onStatusChange?.('connecting');
      
      const key = process.env.API_KEY;
      if (!key) {
        throw new Error("API Key가 설정되지 않았습니다. .env 파일을 확인해주세요.");
      }

      const ai = new GoogleGenAI({ apiKey: key });
      
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      this.inputAudioContext = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioContext = new AudioCtx({ sampleRate: 24000 });
      
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            handlers.onStatusChange?.('open');
            this.startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            await this.handleMessage(message, handlers);
          },
          onerror: (e) => {
            console.error('Live session error:', e);
            handlers.onError?.(e);
            this.disconnect();
          },
          onclose: () => {
            handlers.onStatusChange?.('closed');
            this.disconnect();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      });

      return await this.sessionPromise;
    } catch (err) {
      console.error('Connection failed:', err);
      handlers.onError?.(err);
      this.disconnect();
      throw err;
    }
  }

  private startMic() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      const pcmBlob = this.createBlob(e.inputBuffer.getChannelData(0));
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };
    
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, handlers: LiveHandlers) {
    // 1. 전사 데이터 처리
    if (message.serverContent?.outputTranscription) {
      this.currentOutputTranscription += message.serverContent.outputTranscription.text;
      handlers.onTranscription?.('model', this.currentOutputTranscription);
    } else if (message.serverContent?.inputTranscription) {
      this.currentInputTranscription += message.serverContent.inputTranscription.text;
      handlers.onTranscription?.('user', this.currentInputTranscription);
    }

    if (message.serverContent?.turnComplete) {
      this.currentInputTranscription = '';
      this.currentOutputTranscription = '';
    }

    // 2. 오디오 출력 처리 (모든 파트 순회)
    const parts = message.serverContent?.modelTurn?.parts || [];
    for (const part of parts) {
      const base64Audio = part.inlineData?.data;
      if (base64Audio && this.outputAudioContext) {
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const audioBuffer = await this.decodeAudioData(this.decode(base64Audio), this.outputAudioContext, 24000, 1);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        source.addEventListener('ended', () => this.sources.delete(source));
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
      }
    }

    // 3. 인터럽트 처리
    if (message.serverContent?.interrupted) {
      this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
      this.sources.clear();
      this.nextStartTime = 0;
    }
  }

  disconnect() {
    this.sessionPromise?.then(s => s.close());
    this.sessionPromise = null;
    this.scriptProcessor?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    if (this.inputAudioContext?.state !== 'closed') this.inputAudioContext?.close();
    if (this.outputAudioContext?.state !== 'closed') this.outputAudioContext?.close();
    this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.sources.clear();
    this.nextStartTime = 0;
  }
}
