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
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (!isActive) {
        // Draw idle state: smooth golden gradient wave line that pulses gently
        const time = Date.now() / 800;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)'; // Golden amber
        ctx.lineWidth = 3;
        
        ctx.moveTo(0, rect.height / 2);
        for (let x = 0; x < rect.width; x++) {
          const y = rect.height / 2 + Math.sin(x * 0.05 + time) * 8 * Math.sin(time / 2);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      animationRef.current = requestAnimationFrame(draw);

      if (analyzer) {
        analyzer.getByteFrequencyData(dataArray);
      } else {
        return;
      }

      // Draw landscape spectrum bars (16 bars looks beautiful on w-32 size)
      const barCount = 16;
      const barWidth = rect.width / barCount;
      const spacing = 3;

      for (let i = 0; i < barCount; i++) {
        // Match frequency bins to spectrum bar
        const binIndex = Math.floor(i * (bufferLength / barCount));
        const val = dataArray[binIndex] || 0;
        const norm = val / 255;
        // Calculate height
        const barHeight = norm * (rect.height - 12) + 4; // minimum 4px height for beautiful feel
        const x = i * barWidth + spacing / 2;
        const y = rect.height - barHeight;

        const gradient = ctx.createLinearGradient(0, rect.height, 0, y);
        gradient.addColorStop(0, '#d97706'); // Deep Amber / Gold
        gradient.addColorStop(0.5, '#ec4899'); // Pink
        gradient.addColorStop(1, '#a855f7'); // Purple

        ctx.fillStyle = gradient;

        // Draw a path with rounded top corners for each bar
        const width = barWidth - spacing;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, width, barHeight, [4, 4, 0, 0]);
        } else {
          ctx.rect(x, y, width, barHeight);
        }
        ctx.fill();
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
      className="w-full h-full rounded-xl bg-purple-950/20"
    />
  );
};

export default Visualizer;