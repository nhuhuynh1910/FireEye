/* hooks/useCanvasSim.js */
import { useEffect } from 'react';

export const useCanvasSim = (canvasRef, cameraName) => {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId;
        const width = canvas.width = 640;
        const height = canvas.height = 360;
        
        let lines = [];
        let objects = [];
        let noiseOffset = 0;
        let simulatedSystemTemp = 42.5;

        // Initialize simulation variables based on camera name
        if (cameraName === "Front Gate") {
            lines = [
                { x1: 0, y1: 300, x2: 640, y2: 300 },
                { x1: 200, y1: 0, x2: 200, y2: 360 },
                { x1: 200, y1: 180, x2: 440, y2: 180 }
            ];
            objects = [
                { type: "car", x: -100, y: 220, speed: 2, color: "#1e88e5", size: 40 }
            ];
        } else if (cameraName === "Parking Lot") {
            for (let i = 80; i < 600; i += 100) {
                lines.push({ x1: i, y1: 120, x2: i - 40, y2: 240 });
            }
            lines.push({ x1: 40, y1: 120, x2: 600, y2: 120 });
            lines.push({ x1: 0, y1: 240, x2: 640, y2: 240 });
            
            objects = [
                { type: "parked", x: 120, y: 150, color: "#757575" },
                { type: "parked", x: 320, y: 150, color: "#00f0ff" },
                { type: "parked", x: 420, y: 150, color: "#e53935" },
                { type: "patrol", x: 0, y: 260, speed: 1.5, color: "#43a047" }
            ];
        } else if (cameraName === "Lobby") {
            lines = [
                { x1: 150, y1: 200, x2: 490, y2: 200 },
                { x1: 150, y1: 200, x2: 150, y2: 280 },
                { x1: 490, y1: 200, x2: 490, y2: 280 }
            ];
            objects = [
                { type: "walker", x: 100, y: 240, targetX: 540, speed: 0.8, radius: 10, label: "Person" },
                { type: "walker", x: 320, y: 150, targetX: 320, speed: 0, radius: 10, label: "Staff" }
            ];
        } else if (cameraName === "Back Door") {
            lines = [
                { x1: 120, y1: 0, x2: 120, y2: 360 },
                { x1: 520, y1: 0, x2: 520, y2: 360 }
            ];
            objects = [
                { type: "shadow", x: 320, y: 380, targetY: 160, speed: 0.5, radius: 12, label: "Unknown Object" }
            ];
        }

        const updateSim = () => {
            objects.forEach(obj => {
                if (obj.type === "car") {
                    obj.x += obj.speed;
                    if (obj.x > 680) {
                        obj.x = -100;
                        obj.color = ["#455a64", "#1565c0", "#2e7d32", "#c62828"][Math.floor(Math.random() * 4)];
                    }
                } else if (obj.type === "patrol") {
                    obj.x += obj.speed;
                    if (obj.x > 680) obj.x = -100;
                } else if (obj.type === "walker") {
                    if (obj.speed > 0) {
                        if (Math.abs(obj.x - obj.targetX) < 5) {
                            obj.targetX = obj.targetX === 540 ? 100 : 540;
                        }
                        obj.x += (obj.x < obj.targetX ? 1 : -1) * obj.speed;
                    }
                } else if (obj.type === "shadow") {
                    obj.y -= obj.speed;
                    if (obj.y < 120) {
                        obj.y = 380;
                        obj.speed = Math.random() * 0.4 + 0.3;
                    }
                }
            });
            noiseOffset = (noiseOffset + 0.1) % 10;
        };

        const drawSim = () => {
            ctx.fillStyle = "#101216";
            ctx.fillRect(0, 0, width, height);
            
            // Draw grid lines
            ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
            ctx.lineWidth = 1;
            for (let i = 0; i < width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
                ctx.stroke();
            }
            for (let j = 0; j < height; j += 40) {
                ctx.beginPath();
                ctx.moveTo(0, j);
                ctx.lineTo(width, j);
                ctx.stroke();
            }
            
            // Scene lines
            ctx.strokeStyle = "#252b36";
            ctx.lineWidth = 2;
            lines.forEach(line => {
                ctx.beginPath();
                ctx.moveTo(line.x1, line.y1);
                ctx.lineTo(line.x2, line.y2);
                ctx.stroke();
            });
            
            // Draw objects
            objects.forEach(obj => {
                ctx.fillStyle = obj.color || "#ffffff";
                if (obj.type === "car") {
                    ctx.fillRect(obj.x, obj.y, obj.size, obj.size * 0.5);
                    ctx.fillStyle = "rgba(0, 240, 255, 0.6)";
                    ctx.fillRect(obj.x + obj.size - 10, obj.y + 2, 8, 4);
                    
                    // AI Box
                    ctx.strokeStyle = "#39ff14";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(obj.x - 4, obj.y - 4, obj.size + 8, (obj.size * 0.5) + 8);
                    ctx.fillStyle = "#39ff14";
                    ctx.font = "9px monospace";
                    ctx.fillText("VEHICLE: 98%", obj.x - 4, obj.y - 8);
                } else if (obj.type === "parked") {
                    ctx.fillRect(obj.x, obj.y, 35, 18);
                } else if (obj.type === "patrol") {
                    ctx.fillRect(obj.x, obj.y, 40, 20);
                    ctx.strokeStyle = "#00f0ff";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(obj.x - 2, obj.y - 2, 44, 24);
                } else if (obj.type === "walker") {
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.strokeStyle = "#00f0ff";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(obj.x - obj.radius - 4, obj.y - obj.radius - 4, (obj.radius * 2) + 8, (obj.radius * 2) + 8);
                    ctx.fillStyle = "#00f0ff";
                    ctx.font = "9px monospace";
                    ctx.fillText(`${obj.label}: 94%`, obj.x - obj.radius - 4, obj.y - obj.radius - 8);
                } else if (obj.type === "shadow") {
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
                    ctx.fillStyle = "rgba(255, 59, 48, 0.4)";
                    ctx.fill();
                    
                    ctx.strokeStyle = "#ff3b30";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(obj.x - 20, obj.y - 20, 40, 40);
                    ctx.fillStyle = "#ff3b30";
                    ctx.font = "9px monospace";
                    ctx.fillText("INTRUDER: 89%", obj.x - 20, obj.y - 25);
                }
            });
            
            // Text overlays
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            ctx.font = "10px monospace";
            ctx.fillText(`FPS: 30.0 | RES: 1080p | AGC: ON`, 20, 30);
            
            // Noise static
            ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
            for (let idx = 0; idx < 10; idx++) {
                const noiseX = Math.random() * width;
                const noiseY = Math.random() * height;
                ctx.fillRect(noiseX, noiseY, 3, 3);
            }
        };

        const renderLoop = () => {
            updateSim();
            drawSim();
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        renderLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [canvasRef, cameraName]);
};
