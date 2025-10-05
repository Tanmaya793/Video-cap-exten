const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const emotionDiv = document.getElementById('emotion');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

// Add suggestion elements (add these to HTML)
const suggestionDiv = document.createElement('div');
suggestionDiv.id = 'suggestions';
suggestionDiv.style.marginTop = '10px';
suggestionDiv.style.textAlign = 'center';
document.body.appendChild(suggestionDiv);

let mediaStream = null;
let detectionInterval = null;
let emotionHistory = [];

// Emotion-based website suggestions
const emotionWebsites = {
    "happy": [
        "https://relaxandgame.netlify.app/ - Play and relax",
        "https://www.reddit.com/r/MadeMeSmile - Heartwarming stories"
    ],
    "sad": [
        "https://manochikitsa.com - Online counselling",
        "https://asoftmurmur.com - Soothing sounds",
        "https://www.window-swap.com - Calming views",
        "https://buddyhelp.org - Free emotional support"
    ],
    "angry": [
        "https://www.calm.com - Meditation app",
        "https://asoftmurmur.com - Calming sounds",
        "https://bouncyballs.org - Stress relief interaction",
        "https://www.7cups.com - Talk to someone"
    ],
    "fearful": [
        "https://www.headspace.com - Anxiety meditations",
        "https://www.geoguessr.com - Geography game distraction",
        "https://www.7cups.com - Emotional support",
        "https://littlealchemy2.com - Creative game"
    ],
    "disgusted": [
        "https://www.window-swap.com - Beautiful views",
        "https://www.nationalgeographic.com - Nature content",
        "https://asoftmurmur.com - Clean ambient sounds",
        "https://www.ted.com - Educational talks"
    ],
    "surprised": [
        "https://www.ted.com - Surprising ideas",
        "https://www.theuselessweb.com - Random discoveries",
        "https://100000stars.com - Interactive galaxy",
        "https://www.sporcle.com - Fun quizzes"
    ],
    "neutral": [
        "https://www.coursera.org - Learn something new",
        "https://www.duolingo.com - Language learning",
        "https://www.reddit.com - Browse communities",
        "https://news.ycombinator.com - Tech discussions"
    ]
};

async function startVideo() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = mediaStream;
        console.log('Video stream started');
    } catch (error) {
        console.error('Video error:', error);
        emotionDiv.textContent = 'Error: Camera access denied';
    }
}

async function loadModels() {
    try {
        console.log('Loading AI models...');
        await faceapi.nets.faceExpressionNet.loadFromUri('./models');
        await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
        console.log('Models loaded successfully');
    } catch (error) {
        console.error('Model loading error:', error);
        emotionDiv.textContent = 'Error: AI models failed to load';
        throw error;
    }
}

function getMostFrequentEmotion(emotions) {
    if (emotions.length === 0) return null;

    const emotionCounts = {};
    emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    return Object.keys(emotionCounts).reduce((a, b) => 
        emotionCounts[a] > emotionCounts[b] ? a : b
    );
}

function suggestWebsites(emotion) {
    const websites = emotionWebsites[emotion] || emotionWebsites["neutral"];
    const randomSites = websites.sort(() => 0.5 - Math.random()).slice(0, 2);

    suggestionDiv.innerHTML = `
        <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin-top: 10px;">
            <strong>Feeling ${emotion}? Try these:</strong><br>
            ${randomSites.map(site => {
                const [url, description] = site.split(' - ');
                return `<a href="${url}" target="_blank" style="display: block; margin: 5px 0; color: #007bff;">${description}</a>`;
            }).join('')}
        </div>
    `;
}

async function detectEmotion() {
    // Clear any existing interval
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }

    // Detect every 500ms for continuous monitoring
    let detectionCount = 0;
    emotionHistory = [];

    detectionInterval = setInterval(async () => {
        try {
            if (!video.videoWidth || !video.videoHeight) {
                return;
            }

            const result = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();

            if (result && result.expressions) {
                const currentEmotion = Object.keys(result.expressions)
                    .reduce((a, b) => result.expressions[a] > result.expressions[b] ? a : b);

                // Add to emotion history
                emotionHistory.push(currentEmotion);

                // Show current detection (optional - for real-time feedback)
                const confidence = (result.expressions[currentEmotion] * 100).toFixed(1);
                emotionDiv.textContent = `Current: ${currentEmotion} (${confidence}%)`;

                detectionCount++;

                // Every 5 seconds (10 detections at 500ms intervals), analyze and suggest
                if (detectionCount >= 20) {
                    const dominantEmotion = getMostFrequentEmotion(emotionHistory);

                    if (dominantEmotion) {
                        emotionDiv.innerHTML = `
                            <strong>Detected Emotion: ${dominantEmotion}</strong><br>
                            <small>Based on 5-second analysis</small>
                        `;
                        suggestWebsites(dominantEmotion);
                    }

                    // Reset for next 5-second period
                    emotionHistory = [];
                    detectionCount = 0;
                }
            } else {
                emotionDiv.textContent = 'No face detected';
            }
        } catch (error) {
            console.error('Detection error:', error);
            emotionDiv.textContent = 'Detection error - check console';
        }
    }, 500); // Still detect every 500ms for smoothness
}

startBtn.onclick = async () => {
    emotionDiv.textContent = 'Starting...';
    startBtn.disabled = true;

    try {
        await loadModels();
        await startVideo();

        video.onloadedmetadata = () => {
            detectEmotion();
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline';
            emotionDiv.textContent = 'Analyzing emotions...';
        };
    } catch (error) {
        console.error('Startup error:', error);
        emotionDiv.textContent = 'Failed to start - check console';
        startBtn.disabled = false;
    }
};

stopBtn.onclick = () => {
    clearInterval(detectionInterval);
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    emotionDiv.textContent = 'Emotion detection stopped';
    suggestionDiv.innerHTML = '';
    emotionHistory = [];
    startBtn.style.display = 'inline';
    stopBtn.style.display = 'none';
    startBtn.disabled = false;
};

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    emotionDiv.textContent = 'Error occurred - check console';
});