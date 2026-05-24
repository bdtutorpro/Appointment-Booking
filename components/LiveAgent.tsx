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
import { 
  Phone, 
  Calendar, 
  Clock, 
  User, 
  Download, 
  CheckCircle2, 
  Volume2, 
  Mic, 
  Sparkles, 
  AlertTriangle,
  MapPin,
  ClipboardCheck,
  FileCheck2,
  Activity,
  Loader2,
  CalendarCheck2
} from 'lucide-react';

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
      doctorName: { type: Type.STRING, description: 'Name of the doctor (e.g. Prof. Dr. Wahida Khan, Dr. Kamal, or general skin specialist if not specified).' },
      treatment: { type: Type.STRING, description: 'Name of treatment or reason for appointment (e.g. Hydra Facial, CO2 Laser, Acne treatment, PRP, etc.).' },
    },
    required: ['date', 'time', 'name', 'contactNumber'],
  },
};

type ChatMessage = { role: 'user' | 'agent'; text: string };

const getDoctorsForDate = (dateString: string) => {
  const dateObj = new Date(dateString);
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (day) {
    case 0: // Sunday
      return [{ name: "Dr. Arifur Rahman", time: "3:00 PM - 8:00 PM" }];
    case 1: // Monday
      return [
        { name: "Dr. Asma Sharmin", time: "3:00 PM - 8:00 PM" },
        { name: "Dr. Ismat Ara Juthi", time: "3:00 PM - 8:00 PM" }
      ];
    case 2: // Tuesday
      return [
        { name: "Dr. Silveeya Chowdhury", time: "3:00 PM - 8:00 PM" },
        { name: "Dr. Farzana Rahman Shathi", time: "2:00 PM - 8:00 PM" }
      ];
    case 3: // Wednesday
      return []; // Holiday
    case 4: // Thursday
      return [
        { name: "Dr. Silveeya Chowdhury", time: "Alternative Thursday, 3:00 PM - 8:00 PM" },
        { name: "Dr. Farzana Rahman Shathi", time: "2:00 PM - 8:00 PM" },
        { name: "Dr. Manna Salwa Bulbul", time: "3:00 PM - 8:00 PM" }
      ];
    case 5: // Friday
      return [{ name: "Dr. Silveeya Chowdhury", time: "3:00 PM - 8:00 PM" }];
    case 6: // Saturday
      return [
        { name: "Dr. Silveeya Chowdhury", time: "3:00 PM - 8:00 PM" },
        { name: "Dr. Asma Sharmin", time: "3:00 PM - 8:00 PM" }
      ];
    default:
      return [];
  }
};

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
    doc.setTextColor(107, 33, 168); // Regal Purple (purple-700)
    doc.text('Sparkle Skin, Laser & Aesthetic Centre', 105, 20, { align: 'center' });
    
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
    doc.text('Doctor Name:', 20, y);
    doc.setTextColor(217, 119, 6); // Amber 600 (Gold)
    doc.setFont('helvetica', 'bold');
    doc.text(`${booking.doctorName || 'Prof. Dr. Wahida Khan'}`, 70, y);
    
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
    
    y += 10;
    doc.setTextColor(100, 116, 139);
    doc.text('Appointment For:', 20, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`${booking.treatment || 'General Skin Consultation'}`, 70, y);
    
    y += 20;
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Confirmation ID:', 20, y);
    doc.setTextColor(107, 33, 168);
    doc.text(`${booking.confirmationId}`, 70, y);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Thank you for choosing Sparkle Skin, Laser & Aesthetic Centre.', 105, 275, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Developed by RR IT - 0171976897', 105, 285, { align: 'center' });
    
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

  // In-order audio sample queue to ensure gapless, crash-free chronological voice playback
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);

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
      inputAudioContextRef.current.close().catch(() => {});
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().catch(() => {});
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    sourcesRef.current.clear();
    audioQueueRef.current = [];
    isProcessingQueueRef.current = false;
    setAnalyzer(undefined);
  }, []);

  const processAudioQueue = async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const data = audioQueueRef.current.shift();
      if (!data) continue;

      const outputCtx = outputAudioContextRef.current;
      if (outputCtx) {
        try {
          if (outputCtx.state === 'suspended') {
            await outputCtx.resume();
          }

          const audioBuffer = await decodeAudioData(
            data,
            outputCtx,
            24000, 
            1
          );

          // Standard Live API logic: schedule audio buffer tightly
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);

          const source = outputCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputCtx.destination);
          
          source.onended = () => {
            sourcesRef.current.delete(source);
            if (sourcesRef.current.size === 0 && audioQueueRef.current.length === 0) {
              setStatus('connected');
            }
          };
          
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          sourcesRef.current.add(source);
        } catch (err) {
          console.error("Error playing audio chunk from queue:", err);
        }
      }
    }

    isProcessingQueueRef.current = false;
  };

  const connectToLiveAPI = async () => {
    setStatus('connecting');
    setError(null);

    try {
      // 1. Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Force resume the audio contexts to satisfy security requirements on modern browsers
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }

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
      
      const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        // Enable premium server-side transcription for maximum accuracy, bilingual support, and no mic resource conflicts
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: `You are Shoma, a highly realistic, natural, professional, and friendly 24/7 AI Voice Assistant and beauty receptionist for "Sparkle Skin, Laser & Aesthetic Centre" based in Dhaka, Bangladesh.
            Address: 145/1, Crescent Plaza, Green Road, Dhaka.
            Website: sparkleskinbd.com.
            Phones: 096 3929 7137, 013 1051 9250.
            
            Today is ${new Date().toLocaleDateString()}.
            Doctors' Weekly Schedule (Highly Critical to check before responding or booking):
            - Friday: Dr. Silveeya Chowdhury (3:00 PM - 8:00 PM)
            - Saturday: Dr. Silveeya Chowdhury (3:00 PM - 8:00 PM) & Dr. Asma Sharmin (3:00 PM - 8:00 PM)
            - Sunday: Dr. Arifur Rahman (3:00 PM - 8:00 PM)
            - Monday: Dr. Asma Sharmin (3:00 PM - 8:00 PM) & Dr. Ismat Ara Juthi (3:00 PM - 8:00 PM)
            - Tuesday: Dr. Silveeya Chowdhury (3:00 PM - 8:00 PM) & Dr. Farzana Rahman Shathi (2:00 PM - 8:00 PM)
            - Wednesday: Weekly Holiday (No doctors available, Closed)
            - Thursday: Dr. Silveeya Chowdhury (Alternative Thursday, 3:00 PM - 8:00 PM), Dr. Farzana Rahman Shathi (2:00 PM - 8:00 PM), & Dr. Manna Salwa Bulbul (3:00 PM - 8:00 PM)
            
            Capacity: Maximum 30 patients per day. No appointments on Wednesdays.
            
            Your personality:
            - Polite, soft-spoken, confident, natural, and caring.
            - Sound like a trained premium front-desk executive. Speak with a natural Bangladesh-friendly accent. Never sound robotic or formal.
            - Speak in Bengali, English, or mixed Bangla-English (Code-switching/Spanglish) based on how the user communicates.
            
            Opening Greetings (Start with one of these depending on the language of the conversation):
            - Bengali: “আসসালামু আলাইকুম, Sparkle Skin, Laser & Aesthetic Centre-এ আপনাকে স্বাগতম। আমি আপনার ২৪/৭ AI Assistant, Shoma। আপনি কি appointment book করতে চান, নাকি আমাদের skin, laser বা aesthetic treatment সম্পর্কে জানতে চান?”
            - English: “Welcome to Sparkle Skin, Laser & Aesthetic Centre. I am Shoma, your 24/7 AI assistant. Would you like to book an appointment or know about our skin, laser and aesthetic treatments?”
            - Bangla-English Mixed: “Welcome to Sparkle Skin. আপনি কি appointment নিতে চান, নাকি skin, laser বা aesthetic treatment সম্পর্কে জানতে চান?”
            
            Services Knowledge Base:
            - Diagnosis & Biopsy: Skin Analysis (800 - 1,200 BDT), Skin Biopsy with Histopathology (8,500 BDT), Skin Biopsy with DIF (12,000 BDT), Excisional Biopsy (15,000 - 20,000 BDT), Woods Lamp Examination (1,500 BDT).
            - Laser Treatments: CO2 Laser (8,000 BDT), FRX Laser (8,000 BDT), Diode Laser (8,000 - 10,000 BDT).
            - Injectables & Regenerative: PRP Scalp (6,000 - 8,050 BDT), PRP Face (8,000 BDT), Microneedling PRP Face & Scalp (10,000 BDT), Glutathione IV Drip (15,000 BDT), Exosome (12,000 - 15,000 BDT), PN / Polynucleotide (7,500 BDT), PDRN (12,000 BDT).
            - Facials & Peels: Chemical Peel (4,000 BDT), Hydra Facial (Basic: 4,000 BDT, Premium: 6,000 BDT, Advanced: 8,000 BDT), BB Glow (12,000 BDT).
            - Contouring & Aesthetics: Lip Brightening Combo (8,000 - 10,000 BDT), P-Shot / O-Shot (8,000 BDT), Lipolytic Injection - Face (5,000 BDT), Lipolytic Injection - Abdomen (30,000 BDT), Monothread (1,000 BDT per thread).
            - Intralesional Therapy: I/L (4,000 BDT), I/L - Wart + Bleomycin (5,000 BDT), I/L - Keloid (5,000 BDT), I/L - LSC / HLP (3,500 - 5,500 BDT).
            
            Price Disclaimer:
            Always say: "এটি একটি estimated price. আপনার skin condition, doctor consultation এবং procedure plan অনুযায়ী final cost confirm করা হবে।"
            
            Appointment Booking Flow:
            1. Ask doctor or treatment need: "আপনি কোন treatment বা skin concern নিয়ে appointment নিতে চান?"
            2. Collect patient information (Do NOT ask everything in one breath, ask one question at a time):
            - Full Name
            - Contact Number (Save as contactNumber tool argument)
            - Preferred Date & Time
            3. When you have all details, call the 'bookAppointment' tool. Be sure to supply 'doctorName' and 'treatment' arguments too. If the patient highlights a specific day of the week, inform them of the doctors available on that day. If they have not explicitly selected a doctor, automatically assign a suitable one based on the schedule for their preferred day, or offer them the choices. Assign the appropriate treatment or concern to the 'treatment' parameter.
            4. After booking is successfully confirmed, you must say: "আমাদের একজন প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন। আপনার Secure Booking ID হলো [confirmationId from tool result]." Note: Do NOT mention any "Serial Number" or "Serial", as serial numbers are not used. Instead, confirm the Doctor's name and the Treatment name they booked for.
            CRITICAL PRICE RULE: After the booking is confirmed, do NOT say or mention any service price or cost of the treatment. Under no circumstances should you state the price automatically after booking. You should ONLY say the price of the treatment/service if the patient explicitly asks you about the price.
            
            Medical Safety Rules (CRITICAL):
            - Never diagnose disease, prescribe medicine, or guarantee results.
            - Never say any treatment is 100% safe for everyone.
            - Always recommend doctor consultation for medical skin problems.
            - If customer mentions emergency/severe symptoms (severe swelling, infections, burn after laser, allergic reactions, bleeding, severe pain), say: "আপনার symptoms শুনে মনে হচ্ছে সরাসরি doctor consultation জরুরি। দয়া করে দ্রুত clinic-এ যোগাযোগ করুন অথবা নিকটস্থ hospital/doctor-এর পরামর্শ নিন। আমি চাইলে আপনার contact number note করে team-কে urgent follow-up এর জন্য পাঠাতে পারি।"
            
            FAQs:
            - Location: "আমাদের ঠিকানা: Sparkle Skin, Laser & Aesthetic Centre, 145/1, Crescent Plaza, Green Road, Dhaka."
            - Phones: "096 3929 7137, 013 1051 9250"
            - Hydra Facial explanation: Hydra Facial is popular for deep cleansing, hydration, skin glowing. Standard rates are Basic 4,000 Tk, Premium 6,000 Tk, and Advanced 8,000 Tk.
            - PRP Scalp: Hair fall reduction treatment using platelet-rich plasma from your own blood.
            - Chemical Peel: Pigmentation, acne mark clearing.
            - CO2 Laser: Scar, mole, wart, skin tag removal.
            - Medicine Availability: If any client asks "আপনাদের এখানে কি প্রয়োজনীয় ওষুধ পাওয়া যায়" or any question about medicines being available or sold on-site, the question-answering must always be:
              "প্রশ্ন: আপনাদের এখানে কি প্রয়োজনীয় ওষুধ পাওয়া যায়। 
              উত্তর: জ্বী আমাদের এখানে প্রয়োজনীয় ডার্মাটোলজিক্যাল সকল ওষুধ পাওয়া যায়।"`,
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
                session.sendRealtimeInput({ text: "Hello! Please greet me immediately in Bengali as Shoma, using the exact opening greeting: 'আসসালামু আলাইকুম, Sparkle Skin, Laser & Aesthetic Centre-এ আপনাকে স্বাগতম। আমি আপনার ২৪/৭ AI Assistant, Shoma। আপনি কি appointment book করতে চান, নাকি আমাদের skin, laser বা aesthetic treatment সম্পর্কে জানতে চান?'" });
              }).catch(err => {
                console.error("Error sending initial kickstart:", err);
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
                 }).catch(err => {
                   console.error("Error sending input audio:", err);
                 });
               }
            };
            
            // Connect the audio processing graph
            analyzerNode.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle native user voice transcription
            if (message.serverContent?.userTurn?.parts) {
              const textParts = message.serverContent.userTurn.parts.filter(p => p.text).map(p => p.text).join('');
              if (textParts) {
                setChatLog(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.role === 'user') {
                    const newLog = [...prev];
                    newLog[newLog.length - 1] = { ...lastMsg, text: lastMsg.text + " " + textParts };
                    return newLog;
                  }
                  return [...prev, { role: 'user', text: textParts }];
                });
              }
            }

            // Handle native model voice transcription
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

            // Extract and queue output audio data chunks
            const audioParts = message.serverContent?.modelTurn?.parts?.filter(p => p.inlineData && p.inlineData.data) || [];
            if (audioParts.length > 0) {
              setStatus('speaking');
              for (const part of audioParts) {
                if (part.inlineData?.data) {
                  audioQueueRef.current.push(decode(part.inlineData.data));
                }
              }
              processAudioQueue();
            }

            // Handle Interruptions from either user speaking or system commands
            if (message.serverContent?.interrupted) {
              console.log('Interrupted by user');
              audioQueueRef.current = [];
              sourcesRef.current.forEach(source => {
                try {
                  source.stop();
                } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus('connected');
            }

            // Handle Tool Calls
            if (message.toolCall) {
              console.log('Tool call received', message.toolCall);
              for (const fc of message.toolCall.functionCalls) {
                let result = {};
                
                if (fc.name === 'checkAvailability') {
                    const date = fc.args['date'] as string;
                    const dateObj = new Date(date);
                    const isWednesday = dateObj.getDay() === 3; // Wednesday is 3 in JS (Sun=0, Mon=1, Tue=2, Wed=3)
                    
                    if (isWednesday) {
                        result = { available: false, message: 'Wednesday is our weekly holiday.' };
                    } else {
                        try {
                            const q = query(collection(db, 'bookings'), where('date', '==', date));
                            const snapshot = await getDocs(q);
                            const count = snapshot.size;
                            if (count >= 30) {
                                result = { available: false, message: 'Appointments for this day are full (30/30).' };
                            } else {
                                const dayDocList = getDoctorsForDate(date);
                                const docListStr = dayDocList.map(d => `${d.name} (${d.time})`).join(', ');
                                result = { 
                                    available: true, 
                                    message: `Available. Current bookings: ${count}/30 on this day.`, 
                                    availableDoctors: docListStr || 'Consultant Specialist'
                                };
                            }
                        } catch (e) {
                            console.error("Error checking availability:", e);
                            const dayDocList = getDoctorsForDate(date);
                            const docListStr = dayDocList.map(d => `${d.name} (${d.time})`).join(', ');
                            result = { available: true, message: 'Available.', availableDoctors: docListStr };
                        }
                    }
                    setTranscription(`(Checking availability for ${date}...)`);
                } else if (fc.name === 'bookAppointment') {
                    const date = fc.args['date'] as string;
                    const time = fc.args['time'] as string;
                    const name = fc.args['name'] as string;
                    const contactNumber = fc.args['contactNumber'] as string;
                    
                    const dateObj = new Date(date);
                    const isWednesday = dateObj.getDay() === 3;
                    
                    if (isWednesday) {
                        result = { error: 'Wednesday is our Weekly Holiday. Please choose another date.' };
                    } else {
                        try {
                            const q = query(collection(db, 'bookings'), where('date', '==', date));
                            const snapshot = await getDocs(q);
                            const count = snapshot.size;
                            
                            if (count >= 30) {
                                result = { error: 'Maximum capacity (30) reached for this day.' };
                            } else {
                                const dayDocList = getDoctorsForDate(date);
                                let doctorName = fc.args['doctorName'] as string;
                                if (!doctorName && dayDocList.length > 0) {
                                    doctorName = dayDocList[0].name;
                                } else if (!doctorName) {
                                    doctorName = "Prof. Dr. Wahida Khan (Skin Specialist)";
                                }
                                const treatment = (fc.args['treatment'] as string) || "Skin Consultation";
                                
                                const newBooking = { 
                                    date, 
                                    time, 
                                    name, 
                                    contactNumber, 
                                    doctorName,
                                    treatment,
                                    status: 'confirmed', 
                                    confirmationId: 'SMILE-' + Math.floor(Math.random() * 10000) 
                                };
                                result = newBooking;
                                setBookingStatus(newBooking);
                                setTranscription(`(Booking for ${name}: ${treatment} with ${doctorName}...)`);
                                
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
                  }).catch(err => {
                    console.error("Error sending tool response:", err);
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
       try {
           const session = await sessionPromiseRef.current;
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
      <div className="bg-purple-950/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-amber-500/30">
        <div className="p-6 bg-gradient-to-r from-purple-900 via-purple-950 to-indigo-950 border-b border-amber-500/20">
          <h2 className="text-2xl font-bold text-amber-400 font-serif mb-1">Shoma — 24/7 Assistant</h2>
          <p className="text-purple-200 text-xs font-medium">Sparkle Skin, Laser & Aesthetic Centre</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Indicator */}
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                  <span className={`relative flex h-3 w-3`}>
                    {status !== 'idle' && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'speaking' ? 'bg-amber-400' : 'bg-purple-400'}`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      status === 'idle' ? 'bg-purple-800' :
                      status === 'connecting' ? 'bg-amber-400' :
                      status === 'connected' ? 'bg-purple-400' :
                      'bg-amber-500'
                    }`}></span>
                  </span>
                  <span className="text-sm font-semibold text-purple-200 capitalize">
                      {status === 'speaking' ? 'Shoma is Speaking' : status === 'connected' ? 'Agent Live (Muted)' : status}
                  </span>
              </div>
              {transcription && <span className="text-xs text-amber-300 font-mono italic truncate max-w-[200px]">{transcription}</span>}
          </div>

          <div className="flex gap-4 items-center">
            {/* Visualizer Area */}
            <div className="relative w-32 h-20 bg-purple-900/40 flex-shrink-0 rounded-xl overflow-hidden border border-purple-800/40 flex items-center justify-center">
                 <Visualizer isActive={isConnected} analyzer={analyzer} />
                 {!isConnected && !error && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-purple-300/60 text-xs font-light text-center px-2">Ready</p>
                      </div>
                 )}
            </div>
            
            {/* Controls */}
            <div className="flex-1 flex gap-4">
              {!isConnected ? (
                <button
                  onClick={connectToLiveAPI}
                  disabled={status === 'connecting'}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold shadow-md transition-all
                    ${status === 'connecting' 
                      ? 'bg-purple-900/40 text-purple-300 cursor-not-allowed border border-purple-800/30' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-purple-950 hover:shadow-lg active:scale-95 border border-amber-400/50'
                    }`}
                >
                  {status === 'connecting' ? 'Connecting to Shoma...' : 'Start Talking'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 shadow-md hover:shadow-lg active:scale-95 transition-all border border-rose-500/30"
                >
                  End Session
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
              <div className="p-3 bg-red-950/40 text-red-300 text-sm rounded-lg border border-red-500/30">
                  {error}
              </div>
          )}

          {/* Chat Transcript Area */}
          <div className="mt-6 border border-purple-800/30 rounded-xl bg-purple-950/40 overflow-hidden flex flex-col h-64">
             <div className="flex items-center justify-between px-4 py-2.5 bg-purple-900/40 border-b border-purple-800/20 text-xs font-semibold text-amber-400/80 uppercase tracking-wider">
               <div className="flex items-center gap-2">
                 <Activity className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                 <span>Voice Call Transcript</span>
               </div>
               <div className="flex items-center gap-1.5 text-[10px] text-purple-300">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <span>Live Sync</span>
               </div>
             </div>
             <div className="flex-1 p-4 overflow-y-auto space-y-4">
               {chatLog.length === 0 ? null : (
                 chatLog.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                     <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm text-left ${
                       msg.role === 'user' 
                         ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-purple-950 font-medium rounded-br-none shadow-md' 
                         : 'bg-purple-900/60 border border-purple-800/40 text-purple-100 rounded-bl-none shadow-sm'
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
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950 rounded-2xl border border-amber-500/45 p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-400 font-serif">Appointment Secured!</h3>
              <p className="text-xs text-purple-200">Secure Clinic Digital Pass — PDF Auto-Downloaded</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-850/40 flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg flex-shrink-0">
                   <User className="h-5 w-5 text-amber-400" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[10px] font-semibold text-purple-300 uppercase">Name of Doctor</span>
                  <span className="block text-amber-300 font-bold mt-0.5 text-xs truncate" title={bookingStatus.doctorName}>{bookingStatus.doctorName || 'Prof. Dr. Wahida Khan'}</span>
                </div>
             </div>
             <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-850/40 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-300 rounded-lg flex-shrink-0">
                   <User className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-semibold text-purple-300 uppercase">Patient Name</span>
                  <span className="block text-purple-100 font-semibold mt-0.5 truncate max-w-[120px]">{bookingStatus.name}</span>
                </div>
             </div>
             <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-850/40 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-300 rounded-lg flex-shrink-0">
                   <Phone className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-semibold text-purple-300 uppercase">Contact Phone</span>
                  <span className="block text-purple-100 font-semibold mt-0.5">{bookingStatus.contactNumber}</span>
                </div>
             </div>
             <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-850/40 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-300 rounded-lg flex-shrink-0">
                   <Calendar className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-semibold text-purple-300 uppercase">Scheduled Date</span>
                  <span className="block text-purple-100 font-semibold mt-0.5">{bookingStatus.date}</span>
                </div>
             </div>
             <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-850/40 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-300 rounded-lg flex-shrink-0">
                   <Clock className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-semibold text-purple-300 uppercase">Scheduled Time</span>
                  <span className="block text-purple-100 font-semibold mt-0.5">{bookingStatus.time}</span>
                </div>
             </div>
             <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-850/40 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-300 rounded-lg flex-shrink-0">
                   <Sparkles className="h-5 w-5 text-amber-400" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[10px] font-semibold text-purple-300 uppercase">Appointment For</span>
                  <span className="block text-purple-100 font-semibold mt-0.5 text-xs truncate" title={bookingStatus.treatment}>{bookingStatus.treatment || 'General Skin Consultation'}</span>
                </div>
             </div>
          </div>
          
          <div className="mt-6 flex justify-between items-center text-sm">
             <span className="text-purple-300 font-medium">Secured Booking ID: <strong className="text-amber-400">{bookingStatus.confirmationId}</strong></span>
             <button 
               onClick={() => downloadPDF(bookingStatus)}
               className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-purple-950 hover:shadow-lg transition-all rounded-xl font-bold flex items-center gap-2 border border-amber-400/40"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
               Download PDF Ticket
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveAgent;