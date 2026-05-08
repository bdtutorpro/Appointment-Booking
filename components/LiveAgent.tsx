import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GoogleGenAI, 
  LiveServerMessage, 
  Modality, 
  FunctionDeclaration,
  Type
} from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import Visualizer from './Visualizer';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';

// Tool Definition
const checkAvailabilityTool: FunctionDeclaration = {
  name: 'checkAvailability',
  description: 'Check appointment availability for a given date.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: 'The date to check availability for (YYYY-MM-DD format).',
      },
    },
    required: ['date'],
  },
};

const bookAppointmentTool: FunctionDeclaration = {
  name: 'bookAppointment',
  description: 'Book an appointment for a specific date and time.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: 'Date of appointment (YYYY-MM-DD).' },
      time: { type: Type.STRING, description: 'Time of appointment (HH:MM).' },
      name: { type: Type.STRING, description: 'Name of the patient.' },
      contactNumber: { type: Type.STRING, description: 'Contact number of the patient.' },
    },
    required: ['date', 'time', 'name', 'contactNumber'],
  },
};

type ChatMessage = { role: 'user' | 'agent'; text: string };

const LiveAgent: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [bookingStatus, setBookingStatus] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const downloadPDF = (booking: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // Teal 600
    doc.text('RR IT Live Appointment', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('Appointment Confirmation', 105, 35, { align: 'center' });
    
    // Divider
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(20, 45, 190, 45);
    
    // Details
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Slate 500
    
    let y = 60;
    doc.text('Serial Number:', 20, y);
    doc.setTextColor(13, 148, 136);
    doc.setFont('helvetica', 'bold');
    doc.text(`Serial-${booking.serialNumber}`, 70, y);
    
    y += 10;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Patient Name:', 20, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`${booking.name}`, 70, y);
    
    y += 10;
    doc.setTextColor(100, 116, 139);
    doc.text('Contact Number:', 20, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`${booking.contactNumber}`, 70, y);
    
    y += 10;
    doc.setTextColor(100, 116, 139);
    doc.text('Date:', 20, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`${booking.date}`, 70, y);
    
    y += 10;
    doc.setTextColor(100, 116, 139);
    doc.text('Time:', 20, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`${booking.time}`, 70, y);
    
    y += 20;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Confirmation ID:', 20, y);
    doc.setTextColor(13, 148, 136);
    doc.text(`${booking.confirmationId}`, 70, y);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Thank you for choosing RR IT Live Appointment.', 105, 280, { align: 'center' });
    doc.text('One of our representative will contact with you soon.', 105, 285, { align: 'center' });
    
    doc.save(`Appointment_${booking.confirmationId}.pdf`);
  };

  useEffect(() => {
    if (bookingStatus) {
      downloadPDF(bookingStatus);
    }
  }, [bookingStatus]);
  
  // References for Audio Contexts and Stream Management
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAnalyzerRef = useRef<AnalyserNode | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog]);
  
  // State for visualizer
  const [analyzer, setAnalyzer] = useState<AnalyserNode | undefined>(undefined);

  const cleanupAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch(e) {}
      speechRecognitionRef.current = null;
    }
    setAnalyzer(undefined);
  }, []);

  const connectToLiveAPI = async () => {
    setStatus('connecting');
    setError(null);

    try {
      // 1. Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // 2. Setup Audio Input Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Setup Analyzer for Visualizer
      const source = inputCtx.createMediaStreamSource(stream);
      const analyzerNode = inputCtx.createAnalyser();
      analyzerNode.fftSize = 256;
      source.connect(analyzerNode);
      inputAnalyzerRef.current = analyzerNode;
      setAnalyzer(analyzerNode);

      // 3. Initialize Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, httpOptions: { apiVersion: 'v1alpha' } });
      
      // Setup Web Speech API for User transcription
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
             const text = result[0].transcript;
             setChatLog(prev => [...prev, { role: 'user', text }]);
          }
        };
        recognition.onerror = (event: any) => {
            console.warn("Speech recognition error:", event.error);
        };
        recognition.start();
        speechRecognitionRef.current = recognition;
      }
      
      const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: `You are a friendly and efficient multilingual receptionist for "SmileSync Dental". 
            Today is ${new Date().toLocaleDateString()}.
            Doctor's Schedule: Everyday 4:00 PM to 9:00 PM. 
            EXCLUSION: Friday is CLOSED.
            CAPACITY: Maximum 30 patients per day.
            CRITICAL INSTRUCTION: Immediately upon starting the conversation, introduce yourself and ask first: "Which language do you prefer, Bengali or English?".
            Wait for the user's response. If the user chooses Bengali, switch entirely to Bengali for the rest of the conversation. If they choose English, continue in English.
            Help users book appointments. 
            When they ask for availability, call the 'checkAvailability' tool.
            BEFORE calling 'bookAppointment', you MUST ask the user for their name AND their contact number.
            When you have all details (date, time, name, contactNumber), call the 'bookAppointment' tool.
            The serial number is assigned automatically based on booking order.
            After booking is confirmed, you MUST say "আমাদের একজন প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন" (one of our representative will contact you soon in Bengali) and mention their Serial Number.
            Keep responses concise and conversational.`,
        tools: [{ functionDeclarations: [checkAvailabilityTool, bookAppointmentTool] }]
      };

      // 4. Connect Session
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: config,
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setStatus('connected');
            setIsConnected(true);
            
            if (sessionPromiseRef.current) {
              sessionPromiseRef.current.then(session => {
                // Kickstart model so it speaks first
                session.sendRealtimeInput({ text: "Hello! Please introduce yourself and ask me which language I prefer." });
              });
            }

            // Start processing input audio only AFTER session is open
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createBlob(inputData);
               
               // Use sessionPromiseRef to ensure we use the active session
               if (sessionPromiseRef.current) {
                 sessionPromiseRef.current.then(session => {
                   session.sendRealtimeInput({ audio: pcmBlob });
                 });
               }
            };
            
            // Connect the audio processing graph
            // Source (Microphone) -> Analyzer -> ScriptProcessor -> Destination (Muted)
            // Note: We already connected source -> analyzer above.
            analyzerNode.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              const textParts = message.serverContent.modelTurn.parts.filter(p => p.text).map(p => p.text).join('');
              if (textParts) {
                setChatLog(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.role === 'agent') {
                    const newLog = [...prev];
                    newLog[newLog.length - 1] = { ...lastMsg, text: lastMsg.text + textParts };
                    return newLog;
                  }
                  return [...prev, { role: 'agent', text: textParts }];
                });
              }
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (base64Audio) {
              setStatus('speaking');
              
              const outputCtx = outputAudioContextRef.current;
              if (outputCtx) {
                // Ensure nextStartTime is valid
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);

                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputCtx,
                  24000, 
                  1
                );

                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        setStatus('connected'); // Revert to connected if no audio playing
                    }
                };
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              console.log('Interrupted by user');
              sourcesRef.current.forEach(source => source.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle Tool Calls
            if (message.toolCall) {
              console.log('Tool call received', message.toolCall);
              for (const fc of message.toolCall.functionCalls) {
                let result = {};
                
                if (fc.name === 'checkAvailability') {
                    const date = fc.args['date'] as string;
                    const dateObj = new Date(date);
                    const isFriday = dateObj.getDay() === 5; // Friday is 5 in JS (Sun=0, Sat=6)
                    
                    if (isFriday) {
                        result = { available: false, message: 'Friday is closed.' };
                    } else {
                        try {
                            const q = query(collection(db, 'bookings'), where('date', '==', date));
                            const snapshot = await getDocs(q);
                            const count = snapshot.size;
                            if (count >= 30) {
                                result = { available: false, message: 'Appointments for this day are full (30/30).' };
                            } else {
                                result = { available: true, message: `Available. Current bookings: ${count}/30. Serial will be ${count + 1}.`, schedule: '4:00 PM to 9:00 PM' };
                            }
                        } catch (e) {
                            console.error("Error checking availability:", e);
                            result = { available: true, message: 'Available from 4:00 PM to 9:00 PM.' };
                        }
                    }
                    setTranscription(`(Checking availability for ${date}...)`);
                } else if (fc.name === 'bookAppointment') {
                    const date = fc.args['date'] as string;
                    const time = fc.args['time'] as string;
                    const name = fc.args['name'] as string;
                    const contactNumber = fc.args['contactNumber'] as string;

                    const dateObj = new Date(date);
                    const isFriday = dateObj.getDay() === 5;
                    
                    if (isFriday) {
                        result = { error: 'Friday is closed. Please choose another date.' };
                    } else {
                        try {
                            const q = query(collection(db, 'bookings'), where('date', '==', date));
                            const snapshot = await getDocs(q);
                            const count = snapshot.size;
                            
                            if (count >= 30) {
                                result = { error: 'Maximum capacity (30) reached for this day.' };
                            } else {
                                const serialNumber = count + 1;
                                const newBooking = { 
                                    date, 
                                    time, 
                                    name, 
                                    contactNumber, 
                                    serialNumber,
                                    status: 'confirmed', 
                                    confirmationId: 'SMILE-' + Math.floor(Math.random() * 10000) 
                                };
                                result = newBooking;
                                setBookingStatus(newBooking);
                                setTranscription(`(Booking: Serial-${serialNumber} for ${name}...)`);
                                
                                // Save to Firestore
                                addDoc(collection(db, 'bookings'), {
                                    ...newBooking,
                                    createdAt: serverTimestamp()
                                });
                            }
                        } catch (e) {
                            console.error("Error during booking:", e);
                            result = { error: 'Internal system error during booking.' };
                        }
                    }
                }

                // Send response back
                if (sessionPromiseRef.current) {
                  sessionPromiseRef.current.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result },
                      }
                    });
                  });
                }
              }
            }
          },
          onclose: (event) => {
            console.log('Session closed', event);
            setIsConnected(false);
            setStatus('idle');
            cleanupAudio();
          },
          onerror: (err: any) => {
            console.error('Session error', err);
            setError(`Connection error: ${err?.message || JSON.stringify(err)}`);
            setIsConnected(false);
            setStatus('idle');
            cleanupAudio();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initialize.");
      setStatus('idle');
      cleanupAudio();
    }
  };

  const handleDisconnect = async () => {
    if (sessionPromiseRef.current) {
       // There isn't a direct "close" method exposed easily on the promise wrapper in the snippets,
       // but typically we stop sending audio and the session might timeout or we can try to close if the API supports it.
       // Based on the example, we just stop the local audio and let the connection drop or rely on the object if available.
       // However, the example code uses `session.close()` in the "Rules" section.
       try {
           const session = await sessionPromiseRef.current;
           // session.close() is mentioned in the rules section of the prompt.
           // Assuming the type definition allows it or it's dynamic.
           // If strict types block it, we might need a workaround, but `any` cast is safe for now given the doc.
           (session as any).close(); 
       } catch (e) {
           console.warn("Error closing session explicitly:", e);
       }
    }
    setIsConnected(false);
    setStatus('idle');
    cleanupAudio();
    setTranscription('');
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-6 bg-gradient-to-r from-teal-500 to-emerald-500">
          <h2 className="text-2xl font-bold text-white mb-2">SmileSync Agent</h2>
          <p className="text-teal-50 text-sm">Voice-activated appointment booking</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Indicator */}
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                  <span className={`relative flex h-3 w-3`}>
                    {status !== 'idle' && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'speaking' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      status === 'idle' ? 'bg-slate-300' :
                      status === 'connecting' ? 'bg-amber-400' :
                      status === 'connected' ? 'bg-blue-500' :
                      'bg-emerald-500'
                    }`}></span>
                  </span>
                  <span className="text-sm font-medium text-slate-600 capitalize">
                      {status === 'speaking' ? 'Agent Speaking' : status}
                  </span>
              </div>
              {transcription && <span className="text-xs text-slate-400 italic truncate max-w-[150px]">{transcription}</span>}
          </div>

          <div className="flex gap-4 items-center">
            {/* Visualizer Area */}
            <div className="relative w-32 h-20 bg-slate-50 flex-shrink-0 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                 <Visualizer isActive={isConnected} analyzer={analyzer} />
                 {!isConnected && !error && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <p className="text-slate-400 text-xs font-light text-center px-2">Click Start</p>
                     </div>
                 )}
            </div>
            
            {/* Controls */}
            <div className="flex-1 flex gap-4">
              {!isConnected ? (
                <button
                  onClick={connectToLiveAPI}
                  disabled={status === 'connecting'}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white shadow-md transition-all
                    ${status === 'connecting' 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg active:scale-95'
                    }`}
                >
                  {status === 'connecting' ? 'Connecting...' : 'Start Conversation'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  End Call
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {error}
              </div>
          )}

          {/* Chat Transcript Area */}
          <div className="mt-6 border border-slate-200 rounded-xl bg-slate-50 overflow-hidden flex flex-col h-64">
             <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
               Live Transcript
             </div>
             <div className="flex-1 p-4 overflow-y-auto space-y-4">
               {chatLog.length === 0 ? (
                 <p className="text-center text-slate-400 text-sm italic mt-8">Conversation will appear here...</p>
               ) : (
                 chatLog.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                       msg.role === 'user' 
                         ? 'bg-emerald-600 text-white rounded-br-none' 
                         : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                     }`}>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                     </div>
                   </div>
                 ))
               )}
               <div ref={chatEndRef} />
             </div>
          </div>
        </div>
      </div>
      
      {/* Booking Form Visualizer */}
      {bookingStatus && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Appointment Confirmed</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <span className="block text-xs font-semibold text-slate-400 uppercase">Serial Number</span>
               <span className="block text-emerald-600 font-bold mt-1">Serial-{bookingStatus.serialNumber}</span>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <span className="block text-xs font-semibold text-slate-400 uppercase">Patient Name</span>
               <span className="block text-slate-800 font-medium mt-1">{bookingStatus.name}</span>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <span className="block text-xs font-semibold text-slate-400 uppercase">Contact Number</span>
               <span className="block text-slate-800 font-medium mt-1">{bookingStatus.contactNumber}</span>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <span className="block text-xs font-semibold text-slate-400 uppercase">Date</span>
               <span className="block text-slate-800 font-medium mt-1">{bookingStatus.date}</span>
             </div>
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <span className="block text-xs font-semibold text-slate-400 uppercase">Time</span>
               <span className="block text-slate-800 font-medium mt-1">{bookingStatus.time}</span>
             </div>
          </div>
          
          <div className="mt-6 flex justify-between items-center text-sm">
             <span className="text-slate-500">Confirmation ID: <strong className="text-slate-800">{bookingStatus.confirmationId}</strong></span>
             <button 
               onClick={() => downloadPDF(bookingStatus)}
               className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 transition-colors rounded-xl font-medium flex items-center gap-2 shadow-sm"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
               PDF Format
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveAgent;