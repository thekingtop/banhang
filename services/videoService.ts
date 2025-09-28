interface GenerateVideoOptions {
    imageSrc: string;
    voiceOverSrc: string | null;
    musicSrc: string;
    effect: string;
    transition: string;
    duration: number; // in seconds
    onProgress: (progress: number) => void;
}

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;

/**
 * Generates a video in the browser by combining an image, audio, and effects.
 * @returns A promise that resolves with a Blob of the generated video.
 */
export const generateVideo = async ({
    imageSrc,
    voiceOverSrc,
    musicSrc,
    effect,
    transition,
    duration,
    onProgress,
}: GenerateVideoOptions): Promise<Blob> => {
    onProgress(5);

    // 1. Setup Canvas for video frames
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // 2. Setup Audio mixing
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();
    let voiceOverDuration = 0;

    const [image, voiceOverBuffer, musicBuffer] = await Promise.all([
        loadImage(imageSrc),
        voiceOverSrc ? loadAudio(voiceOverSrc, audioContext) : Promise.resolve(null),
        musicSrc ? loadAudio(musicSrc, audioContext) : Promise.resolve(null),
    ]);
    onProgress(25);
    
    if (voiceOverBuffer) {
        voiceOverDuration = voiceOverBuffer.duration;
        const voiceOverSource = audioContext.createBufferSource();
        voiceOverSource.buffer = voiceOverBuffer;
        voiceOverSource.connect(audioDestination);
        voiceOverSource.start();
    }
    if (musicBuffer) {
        const musicSource = audioContext.createBufferSource();
        musicSource.buffer = musicBuffer;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.3; // Lower music volume
        musicSource.connect(gainNode);
        gainNode.connect(audioDestination);
        musicSource.loop = true;
        musicSource.start();
    }

    // Use voice-over duration if it's longer
    const finalDuration = Math.max(duration, voiceOverDuration);

    // 3. Setup MediaRecorder to capture the output
    const videoStream = (canvas as any).captureStream(FPS);
    const audioStream = audioDestination.stream;
    const combinedStream = new MediaStream([...videoStream.getTracks(), ...audioStream.getTracks()]);
    
    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };
    
    const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
            const videoBlob = new Blob(chunks, { type: 'video/webm' });
            resolve(videoBlob);
        };
    });
    
    recorder.start();
    onProgress(30);

    // 4. Render frames with animation
    let frame = 0;
    const totalFrames = finalDuration * FPS;

    function renderFrame() {
        if (frame >= totalFrames) {
            recorder.stop();
            onProgress(100);
            return;
        }

        draw(ctx!, image, frame / totalFrames, effect, transition);
        requestAnimationFrame(renderFrame);
        frame++;
        onProgress(30 + (frame / totalFrames) * 65);
    }
    
    renderFrame();

    return recordPromise;
};

// --- Helper Functions ---

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

const loadAudio = (src: string, context: AudioContext): Promise<AudioBuffer> => {
    return fetch(src)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => context.decodeAudioData(arrayBuffer));
};

const draw = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    progress: number,
    effect: string,
    transition: string
) => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // --- Transition Logic ---
    const transitionDuration = 0.1; // First 10% of video is for intro transition
    let inTransition = progress < transitionDuration;
    
    if (inTransition) {
        const transitionProgress = progress / transitionDuration;
        if (transition === 'fade-in') {
            ctx.globalAlpha = transitionProgress;
        }
    } else {
        ctx.globalAlpha = 1.0;
    }

    // --- Main Animation (Ken Burns) Logic ---
    // This animation starts after the transition is complete.
    const mainProgress = inTransition ? 0 : (progress - transitionDuration) / (1 - transitionDuration);
    let scale = 1.0;
    let dx = 0;
    let dy = 0;
    
    const easing = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const easedMainProgress = easing(mainProgress);

    switch (effect) {
        case 'zoom-in':
            scale = 1.0 + easedMainProgress * 0.1;
            break;
        case 'zoom-out':
            scale = 1.1 - easedMainProgress * 0.1;
            break;
        case 'pan-left':
            dx = -easedMainProgress * (WIDTH * 0.1);
            scale = 1.1;
            break;
        case 'pan-right':
            dx = easedMainProgress * (WIDTH * 0.1);
            scale = 1.1;
            break;
    }

    // --- Apply Slide-In Transition Offset ---
    if (transition === 'slide-in-left' && inTransition) {
        const transitionProgress = progress / transitionDuration;
        const easedTransitionProgress = 1 - Math.pow(1 - transitionProgress, 3); // Ease out cubic
        dx += -WIDTH * (1 - easedTransitionProgress);
    }


    // --- Drawing Logic ---
    const imgAspectRatio = image.width / image.height;
    const canvasAspectRatio = WIDTH / HEIGHT;

    let renderWidth, renderHeight, x, y;

    if (imgAspectRatio > canvasAspectRatio) {
        renderHeight = HEIGHT * scale;
        renderWidth = renderHeight * imgAspectRatio;
    } else {
        renderWidth = WIDTH * scale;
        renderHeight = renderWidth / imgAspectRatio;
    }

    x = (WIDTH - renderWidth) / 2 + dx;
    y = (HEIGHT - renderHeight) / 2 + dy;

    ctx.drawImage(image, x, y, renderWidth, renderHeight);
    ctx.globalAlpha = 1.0; // Reset for next frame
};