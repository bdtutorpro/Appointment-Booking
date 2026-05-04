import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  analyzer?: AnalyserNode;
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, analyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let dataArray: Uint8Array;
    let bufferLength: number;

    if (analyzer) {
      bufferLength = analyzer.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const draw = () => {
      if (!isActive) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Draw idle state (pulsing circle)
        const time = Date.now() / 1000;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radius = 30 + Math.sin(time * 2) * 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(203, 213, 225, 0.3)'; // Slate-300
        ctx.fill();
        return;
      }

      animationRef.current = requestAnimationFrame(draw);

      if (analyzer) {
        analyzer.getByteFrequencyData(dataArray);
      } else {
        return; // Wait for analyzer
      }

      ctx.clearRect(0, 0, rect.width, rect.height);
      const barWidth = (rect.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Draw a circular visualizer
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(i * (Math.PI * 2) / 60); // Simplified rotation for visual effect
        
        const gradient = ctx.createLinearGradient(0, 0, 0, barHeight + 20);
        gradient.addColorStop(0, '#0ea5e9'); // Sky 500
        gradient.addColorStop(1, '#6366f1'); // Indigo 500

        ctx.fillStyle = gradient;
        ctx.fillRect(-2, 10, 4, barHeight + 10);
        ctx.restore();

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyzer]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-64 rounded-xl bg-slate-50 border border-slate-100 shadow-inner"
    />
  );
};

export default Visualizer;