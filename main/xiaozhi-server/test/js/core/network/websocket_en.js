// WebSocket message handling module
import { getConfig, saveConnectionUrls } from '../../config/manager.js?v=0127';
import { uiController } from '../../ui/controller_en.js?v=0127';
import { log } from '../../utils/logger.js?v=0127';
import { getAudioPlayer } from '../audio/player_en.js?v=0127';
import { getAudioRecorder } from '../audio/recorder_en.js?v=0127';
import { executeMcpTool, getMcpTools, setWebSocket as setMcpWebSocket } from '../mcp/tools_en.js?v=0127';
import { webSocketConnect } from './ota-connector_en.js?v=0127';

// WebSocket handler class
export class WebSocketHandler {
    constructor() {
        this.websocket = null;
        this.onConnectionStateChange = null;
        this.onRecordButtonStateChange = null;
        this.onSessionStateChange = null;
        this.onSessionEmotionChange = null;
        this.onChatMessage = null; // Chat message callback
        this.currentSessionId = null;
        this.isRemoteSpeaking = false;
    }

    // Send hello handshake message
    async sendHelloMessage() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return false;

        try {
            const config = getConfig();

            const helloMessage = {
                type: 'hello',
                device_id: config.deviceId,
                device_name: config.deviceName,
                device_mac: config.deviceMac,
                token: config.token,
                features: {
                    mcp: true
                }
            };

            log('Sending hello handshake message', 'info');
            this.websocket.send(JSON.stringify(helloMessage));

            return new Promise(resolve => {
                const timeout = setTimeout(() => {
                    log('Hello response timeout', 'error');
                    log('Tip: Try clicking "Test Auth" button to troubleshoot connection', 'info');
                    resolve(false);
                }, 5000);

                const onMessageHandler = (event) => {
                    try {
                        const response = JSON.parse(event.data);
                        if (response.type === 'hello' && response.session_id) {
                            log(`Server handshake successful, session ID: ${response.session_id}`, 'success');
                            clearTimeout(timeout);
                            this.websocket.removeEventListener('message', onMessageHandler);
                            resolve(true);
                        }
                    } catch (e) {
                        // Ignore non-JSON messages
                    }
                };

                this.websocket.addEventListener('message', onMessageHandler);
            });
        } catch (error) {
            log(`Hello message error: ${error.message}`, 'error');
            return false;
        }
    }

    // Handle text message
    handleTextMessage(message) {
        if (message.type === 'hello') {
            log(`Server response: ${JSON.stringify(message, null, 2)}`, 'success');
            uiController.startAIChatSession();
        } else if (message.type === 'tts') {
            this.handleTTSMessage(message);
        } else if (message.type === 'audio') {
            log(`Received audio control message: ${JSON.stringify(message)}`, 'info');
        } else if (message.type === 'stt') {
            log(`Recognition result: ${message.text}`, 'info');
            // Use chat message callback to display STT message
            if (this.onChatMessage && message.text) {
                this.onChatMessage(message.text, true);
            }
        } else if (message.type === 'llm') {
            log(`LLM response: ${message.text}`, 'info');
            // Use chat message callback to display LLM response
            if (this.onChatMessage && message.text) {
                this.onChatMessage(message.text, false);
            }

            // If contains emoji, update sessionStatus emoji and trigger Live2D action
            if (message.text && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(message.text)) {
                // Extract emoji
                const emojiMatch = message.text.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
                if (emojiMatch && this.onSessionEmotionChange) {
                    this.onSessionEmotionChange(emojiMatch[0]);
                }

                // Trigger Live2D emotion action
                if (message.emotion) {
                    console.log(`Received emotion message: emotion=${message.emotion}, text=${message.text}`);
                    this.triggerLive2DEmotionAction(message.emotion);
                }
            }

            // Only add to conversation if text is not just emoji
            // Check if content remains after removing emoji
            const textWithoutEmoji = message.text ? message.text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : '';
            if (textWithoutEmoji && this.onChatMessage) {
                this.onChatMessage(message.text, false);
            }
        } else if (message.type === 'mcp') {
            this.handleMCPMessage(message);
        } else {
            log(`Unknown message type: ${message.type}`, 'info');
            if (this.onChatMessage) {
                this.onChatMessage(`Unknown message type: ${message.type}\n${JSON.stringify(message, null, 2)}`, false);
            }
        }
    }

    // Handle TTS message
    handleTTSMessage(message) {
        if (message.state === 'start') {
            log('Server started sending audio', 'info');
            this.currentSessionId = message.session_id;
            this.isRemoteSpeaking = true;
            if (this.onSessionStateChange) {
                this.onSessionStateChange(true);
            }

            // Start Live2D talking animation
            this.startLive2DTalking();
        } else if (message.state === 'sentence_start') {
            log(`Server sending audio segment: ${message.text}`, 'info');
            this.ttsSentenceCount = (this.ttsSentenceCount || 0) + 1;

            if (message.text && this.onChatMessage) {
                this.onChatMessage(message.text, false);
            }

            // Ensure animation runs when sentence starts
            const live2dManager = window.chatApp?.live2dManager;
            if (live2dManager && !live2dManager.isTalking) {
                this.startLive2DTalking();
            }
        } else if (message.state === 'sentence_end') {
            log(`Audio segment ended: ${message.text}`, 'info');

            // Don't clear animation on sentence end, wait for next sentence or final stop
        } else if (message.state === 'stop') {
            log('Server audio transmission ended, clearing all audio buffers', 'info');

            // Clear all audio buffers and stop playback
            const audioPlayer = getAudioPlayer();
            audioPlayer.clearAllAudio();

            this.isRemoteSpeaking = false;
            if (this.onRecordButtonStateChange) {
                this.onRecordButtonStateChange(false);
            }
            if (this.onSessionStateChange) {
                this.onSessionStateChange(false);
            }

            // Delay stopping Live2D talking animation to ensure all sentences finish playing
            setTimeout(() => {
                this.stopLive2DTalking();
                this.ttsSentenceCount = 0; // Reset counter
            }, 1000); // 1 second delay to ensure all sentences complete
        }
    }

    // Start Live2D talking animation
    startLive2DTalking() {
        try {
            // Get Live2D manager instance
            const live2dManager = window.chatApp?.live2dManager;
            if (live2dManager && live2dManager.live2dModel) {
                // Use audio player's analyzer node
                live2dManager.startTalking();
                log('Live2D talking animation started', 'info');
            }
        } catch (error) {
            log(`Failed to start Live2D talking animation: ${error.message}`, 'error');
        }
    }

    // Stop Live2D talking animation
    stopLive2DTalking() {
        try {
            const live2dManager = window.chatApp?.live2dManager;
            if (live2dManager) {
                live2dManager.stopTalking();
                log('Live2D talking animation stopped', 'info');
            }
        } catch (error) {
            log(`Failed to stop Live2D talking animation: ${error.message}`, 'error');
        }
    }

    // Initialize Live2D audio analyzer
    initializeLive2DAudioAnalyzer() {
        try {
            const live2dManager = window.chatApp?.live2dManager;
            if (live2dManager) {
                // Initialize audio analyzer (using audio player's context)
                if (live2dManager.initializeAudioAnalyzer()) {
                    log('Live2D audio analyzer initialized, connected to audio player', 'success');
                } else {
                    log('Live2D audio analyzer initialization failed, will use simulated animation', 'warning');
                }
            }
        } catch (error) {
            log(`Failed to initialize Live2D audio analyzer: ${error.message}`, 'error');
        }
    }

    // Handle MCP message
    handleMCPMessage(message) {
        const payload = message.payload || {};
        log(`Server sent: ${JSON.stringify(message)}`, 'info');

        if (payload.method === 'tools/list') {
            const tools = getMcpTools();

            const replyMessage = JSON.stringify({
                "session_id": message.session_id || "",
                "type": "mcp",
                "payload": {
                    "jsonrpc": "2.0",
                    "id": payload.id,
                    "result": {
                        "tools": tools
                    }
                }
            });
            log(`Client reports: ${replyMessage}`, 'info');
            this.websocket.send(replyMessage);
            log(`Replied with MCP tools list: ${tools.length} tools`, 'info');

        } else if (payload.method === 'tools/call') {
            const toolName = payload.params?.name;
            const toolArgs = payload.params?.arguments;

            log(`Calling tool: ${toolName} args: ${JSON.stringify(toolArgs)}`, 'info');

            const result = executeMcpTool(toolName, toolArgs);

            const replyMessage = JSON.stringify({
                "session_id": message.session_id || "",
                "type": "mcp",
                "payload": {
                    "jsonrpc": "2.0",
                    "id": payload.id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": JSON.stringify(result)
                            }
                        ],
                        "isError": false
                    }
                }
            });

            log(`Client reports: ${replyMessage}`, 'info');
            this.websocket.send(replyMessage);
        } else if (payload.method === 'initialize') {
            log(`Received tool initialization request: ${JSON.stringify(payload.params)}`, 'info');
            const replyMessage = JSON.stringify({
                "session_id": message.session_id || "",
                "type": "mcp",
                "payload": {
                    "jsonrpc": "2.0",
                    "id": payload.id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "xiaozhi-web-test",
                            "version": "2.1.0"
                        }
                    }
                }
            });
            log(`Replied with initialization response`, 'info');
            this.websocket.send(replyMessage);
        } else {
            log(`Unknown MCP method: ${payload.method}`, 'warning');
        }
    }

    // Handle binary message
    async handleBinaryMessage(data) {
        try {
            let arrayBuffer;
            if (data instanceof ArrayBuffer) {
                arrayBuffer = data;
            } else if (data instanceof Blob) {
                arrayBuffer = await data.arrayBuffer();
                log(`Received Blob audio data, size: ${arrayBuffer.byteLength} bytes`, 'debug');
            } else {
                log(`Received unknown binary data type: ${typeof data}`, 'warning');
                return;
            }

            const opusData = new Uint8Array(arrayBuffer);
            const audioPlayer = getAudioPlayer();
            audioPlayer.enqueueAudioData(opusData);
        } catch (error) {
            log(`Error processing binary message: ${error.message}`, 'error');
        }
    }

    // Connect to WebSocket server
    async connect() {
        const config = getConfig();
        log('Checking OTA status...', 'info');
        saveConnectionUrls();

        try {
            const otaUrl = document.getElementById('otaUrl').value.trim();
            const ws = await webSocketConnect(otaUrl, config);
            if (ws === undefined) {
                return false;
            }
            this.websocket = ws;

            // Set binary data type to ArrayBuffer
            this.websocket.binaryType = 'arraybuffer';

            // Set MCP module's WebSocket instance
            setMcpWebSocket(this.websocket);

            // Set recorder's WebSocket
            const audioRecorder = getAudioRecorder();
            audioRecorder.setWebSocket(this.websocket);

            this.setupEventHandlers();

            return true;
        } catch (error) {
            log(`Connection error: ${error.message}`, 'error');
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(false);
            }
            return false;
        }
    }

    // Setup event handlers
    setupEventHandlers() {
        this.websocket.onopen = async () => {
            const url = document.getElementById('serverUrl').value;
            log(`Connected to server: ${url}`, 'success');

            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(true);
            }

            // After connection, default state is listening
            this.isRemoteSpeaking = false;
            if (this.onSessionStateChange) {
                this.onSessionStateChange(false);
            }

            // Initialize Live2D audio analyzer on WebSocket connection
            this.initializeLive2DAudioAnalyzer();

            await this.sendHelloMessage();
        };

        this.websocket.onclose = () => {
            log('Disconnected', 'info');

            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(false);
            }

            const audioRecorder = getAudioRecorder();
            audioRecorder.stop();
        };

        this.websocket.onerror = (error) => {
            log(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');
            uiController.addChatMessage(`⚠️ WebSocket error: ${error.message || 'Unknown error'}`, false);
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(false);
            }
        };

        this.websocket.onmessage = (event) => {
            try {
                if (typeof event.data === 'string') {
                    const message = JSON.parse(event.data);
                    this.handleTextMessage(message);
                } else {
                    this.handleBinaryMessage(event.data);
                }
            } catch (error) {
                log(`WebSocket message processing error: ${error.message}`, 'error');
                // Don't use old addMessage function as conversationDiv element doesn't exist
                // Error messages will be displayed through other means
            }
        };
    }

    // Disconnect
    disconnect() {
        if (!this.websocket) return;

        this.websocket.close();
        const audioRecorder = getAudioRecorder();
        audioRecorder.stop();
    }

    // Send text message
    sendTextMessage(text) {
        if (text === '' || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            // If remote is speaking, send abort message first
            if (this.isRemoteSpeaking && this.currentSessionId) {
                const abortMessage = {
                    session_id: this.currentSessionId,
                    type: 'abort',
                    reason: 'wake_word_detected'
                };
                this.websocket.send(JSON.stringify(abortMessage));
                log('Sent abort message', 'info');
            }

            const listenMessage = {
                type: 'listen',
                state: 'detect',
                text: text
            };

            this.websocket.send(JSON.stringify(listenMessage));
            log(`Sent text message: ${text}`, 'info');

            return true;
        } catch (error) {
            log(`Send message error: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Trigger Live2D emotion action
     * @param {string} emotion - Emotion name
     */
    triggerLive2DEmotionAction(emotion) {
        try {
            const live2dManager = window.chatApp?.live2dManager;
            if (live2dManager && typeof live2dManager.triggerEmotionAction === 'function') {
                live2dManager.triggerEmotionAction(emotion);
                log(`Triggered Live2D emotion action: ${emotion}`, 'info');
            } else {
                log(`Cannot trigger Live2D emotion action: Live2D manager not found or method unavailable`, 'warning');
            }
        } catch (error) {
            log(`Failed to trigger Live2D emotion action: ${error.message}`, 'error');
        }
    }

    // Get WebSocket instance
    getWebSocket() {
        return this.websocket;
    }

    // Check if connected
    isConnected() {
        return this.websocket && this.websocket.readyState === WebSocket.OPEN;
    }
}

// Create singleton
let wsHandlerInstance = null;

export function getWebSocketHandler() {
    if (!wsHandlerInstance) {
        wsHandlerInstance = new WebSocketHandler();
    }
    return wsHandlerInstance;
}
