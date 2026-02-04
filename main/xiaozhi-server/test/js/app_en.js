// Main application entry (English version)
import { checkOpusLoaded, initOpusEncoder } from './core/audio/opus-codec_en.js?v=0127';
import { getAudioPlayer } from './core/audio/player_en.js?v=0127';
import { checkMicrophoneAvailability, isHttpNonLocalhost } from './core/audio/recorder_en.js?v=0127';
import { initMcpTools } from './core/mcp/tools_en.js?v=0127';
import { uiController } from './ui/controller_en.js?v=0127';
import { log } from './utils/logger.js?v=0127';

// Application class
class App {
    constructor() {
        this.uiController = null;
        this.audioPlayer = null;
        this.live2dManager = null;
    }

    // Initialize application
    async init() {
        log('Initializing application...', 'info');
        // Initialize UI controller
        this.uiController = uiController;
        this.uiController.init();
        // Check Opus library
        checkOpusLoaded();
        // Initialize Opus encoder
        initOpusEncoder();
        // Initialize audio player
        this.audioPlayer = getAudioPlayer();
        await this.audioPlayer.start();
        // Initialize MCP tools
        initMcpTools();
        // Check microphone availability
        await this.checkMicrophoneAvailability();
        // Initialize Live2D
        await this.initLive2D();
        // Hide loading indicator
        this.setModelLoadingStatus(false);
        log('Application initialized', 'success');
    }

    // Initialize Live2D
    async initLive2D() {
        try {
            // Check if Live2DManager is loaded
            if (typeof window.Live2DManager === 'undefined') {
                throw new Error('Live2DManager not loaded, please check script import order');
            }
            this.live2dManager = new window.Live2DManager();
            await this.live2dManager.initializeLive2D();
            // Update UI status
            const live2dStatus = document.getElementById('live2dStatus');
            if (live2dStatus) {
                live2dStatus.textContent = '● Loaded';
                live2dStatus.className = 'status loaded';
            }
            log('Live2D initialized', 'success');
        } catch (error) {
            log(`Live2D initialization failed: ${error.message}`, 'error');
            // Update UI status
            const live2dStatus = document.getElementById('live2dStatus');
            if (live2dStatus) {
                live2dStatus.textContent = '● Load failed';
                live2dStatus.className = 'status error';
            }
        }
    }

    // Set model loading status
    setModelLoadingStatus(isLoading) {
        const modelLoading = document.getElementById('modelLoading');
        if (modelLoading) {
            modelLoading.style.display = isLoading ? 'flex' : 'none';
        }
    }

    /**
     * Check microphone availability
     * Called during application initialization to check if microphone is available and update UI status
     */
    async checkMicrophoneAvailability() {
        try {
            const isAvailable = await checkMicrophoneAvailability();
            const isHttp = isHttpNonLocalhost();
            // Save availability status to global variable
            window.microphoneAvailable = isAvailable;
            window.isHttpNonLocalhost = isHttp;
            // Update UI
            if (this.uiController) {
                this.uiController.updateMicrophoneAvailability(isAvailable, isHttp);
            }
            log(`Microphone availability check: ${isAvailable ? 'available' : 'unavailable'}`, isAvailable ? 'success' : 'warning');
        } catch (error) {
            log(`Failed to check microphone availability: ${error.message}`, 'error');
            // Default to unavailable
            window.microphoneAvailable = false;
            window.isHttpNonLocalhost = isHttpNonLocalhost();
            if (this.uiController) {
                this.uiController.updateMicrophoneAvailability(false, window.isHttpNonLocalhost);
            }
        }
    }
}

// Create and start application
const app = new App();
// Expose app instance to global scope for other modules to access
window.chatApp = app;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize application
    app.init();
});
export default app;
