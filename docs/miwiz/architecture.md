# xiaozhi-esp32-server Architecture

## System Architecture Diagram

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart TB
    subgraph Client["Client Devices"]
        ESP32["ESP32 Device<br/>Smart Hardware"]
        Browser["Browser/Mobile<br/>Admin Interface"]
    end

    subgraph Network["Network Layer"]
        Router["Router<br/>WiFi/4G"]
    end

    subgraph Gateway["MQTT Gateway (Optional)"]
        MQTT_GW["xiaozhi-mqtt-gateway"]
        MQTT_SVC["MQTT Service<br/>:1583"]
        UDP_SVC["UDP Service<br/>:8864"]
        MQTT_API["MQTT Command API<br/>:8007"]
    end

    subgraph Core["xiaozhi-server :8000/:8003"]
        direction TB
        WS_Server["WebSocket Server<br/>:8000"]
        HTTP_Server["HTTP Server<br/>:8003 (OTA/Vision)"]

        subgraph AI_Providers["AI Provider Modules"]
            VAD["VAD<br/>Voice Activity Detection<br/>(SileroVAD)"]
            ASR["ASR<br/>Speech Recognition"]
            LLM["LLM<br/>Large Language Model"]
            TTS["TTS<br/>Text to Speech"]
            VLLM["VLLM<br/>Vision Language Model"]
            Memory["Memory<br/>Conversation History"]
            Intent["Intent<br/>Intent Recognition"]
        end

        subgraph Plugins["Plugin System"]
            PluginReg["Plugin Registry"]
            Functions["Custom Functions<br/>Weather/Music/Smart Home"]
        end
    end

    subgraph External_APIs["External AI Services (Cloud APIs)"]
        direction TB
        ASR_API["ASR APIs<br/>Doubao/Aliyun/Tencent<br/>Baidu/OpenAI/Groq/Xunfei"]
        LLM_API["LLM APIs<br/>Zhipu/Doubao/DeepSeek<br/>Aliyun/Gemini/Coze/Dify"]
        TTS_API["TTS APIs<br/>EdgeTTS/Doubao/Aliyun<br/>Tencent/OpenAI/Minimax"]
        VLLM_API["VLLM APIs<br/>Zhipu/Aliyun"]
    end

    subgraph Management["Management Layer"]
        direction TB
        Web["manager-web<br/>:8001<br/>Vue.js Dashboard"]
        API["manager-api<br/>:8002<br/>Spring Boot REST API"]
    end

    subgraph Storage["Data Storage"]
        MySQL[("MySQL<br/>Persistent Storage<br/>Users/Devices/Config")]
        Redis[("Redis<br/>Hot Cache<br/>Sessions/Tokens")]
    end

    subgraph Extensions["Extension Services"]
        MCP_Endpoint["mcp-endpoint-server<br/>:8054<br/>MCP Protocol"]
        Voiceprint["voiceprint-api<br/>:8001<br/>3DSpeaker Voice Print"]
    end

    %% Client connections
    ESP32 <-->|"Audio Stream<br/>WebSocket"| Router
    Browser -->|"HTTP/HTTPS"| Router

    %% Router to services
    Router <-->|"WebSocket :8000"| WS_Server
    Router -->|"HTTP :8003"| HTTP_Server
    Router -->|"HTTP :8001"| Web
    Router -->|"MQTT :1583"| MQTT_GW

    %% Gateway internal
    MQTT_GW --- MQTT_SVC
    MQTT_GW --- UDP_SVC
    MQTT_GW --- MQTT_API

    %% Core AI flow
    WS_Server --> VAD
    VAD --> ASR
    ASR --> Intent
    Intent --> LLM
    LLM --> Memory
    LLM --> TTS
    HTTP_Server --> VLLM

    %% External API calls
    ASR -.->|"API Call"| ASR_API
    LLM -.->|"API Call"| LLM_API
    TTS -.->|"API Call"| TTS_API
    VLLM -.->|"API Call"| VLLM_API

    %% Plugin system
    LLM <--> PluginReg
    PluginReg <--> Functions

    %% Management connections
    Web <-->|"REST API"| API
    API <-->|"Config Sync"| WS_Server
    API <--> MySQL
    API <--> Redis

    %% Extensions
    WS_Server <-.->|"WebSocket"| MCP_Endpoint
    WS_Server <-.->|"HTTP"| Voiceprint
```

## Data Flow: Voice Interaction with External Models

```mermaid
%%{init: {'theme': 'dark'}}%%
sequenceDiagram
    participant ESP32 as ESP32 Device
    participant WS as WebSocket Server
    participant VAD as VAD (Local)
    participant ASR as ASR Provider
    participant LLM as LLM Provider
    participant TTS as TTS Provider
    participant Cloud as Cloud APIs

    Note over ESP32,Cloud: Voice Input Flow
    ESP32->>WS: Audio Stream (Opus/PCM)
    WS->>VAD: Audio Chunks
    VAD->>VAD: Detect Speech Activity
    VAD->>ASR: Valid Speech Segment

    alt Local ASR (FunASR)
        ASR->>ASR: Local Recognition
    else External ASR (Doubao/Aliyun/etc)
        ASR->>Cloud: Audio Data
        Note right of Cloud: ~200-800ms latency
        Cloud-->>ASR: Transcribed Text
    end

    ASR->>LLM: User Text + Context

    alt External LLM (Zhipu/Doubao/etc)
        LLM->>Cloud: Prompt + History
        Note right of Cloud: First Token: ~300-1500ms
        Cloud-->>LLM: Streaming Response
    end

    LLM->>TTS: Response Text

    alt Free TTS (EdgeTTS)
        TTS->>Cloud: Text
        Note right of Cloud: ~100-300ms latency
        Cloud-->>TTS: Audio Stream
    else Streaming TTS (Doubao/Huoshan)
        TTS->>Cloud: Text (Streaming)
        Note right of Cloud: ~50-150ms first chunk
        Cloud-->>TTS: Audio Chunks
    end

    TTS->>WS: Audio Response
    WS->>ESP32: Audio Stream (Opus)

    Note over ESP32,Cloud: Total Latency: 1-4 seconds (depending on providers)
```

## Provider Selection: Local vs External

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart LR
    subgraph Decision["Provider Selection"]
        Start([Start]) --> Q1{High Performance<br/>Required?}

        Q1 -->|Yes| Q2{Budget<br/>Available?}
        Q1 -->|No| Free["Free Tier<br/>Configuration"]

        Q2 -->|Yes| Streaming["Streaming<br/>Configuration"]
        Q2 -->|No| Hybrid["Hybrid<br/>Configuration"]
    end

    subgraph Free["Free Configuration"]
        F_ASR["ASR: FunASR (Local)<br/>Requires 2GB+ RAM"]
        F_LLM["LLM: Zhipu glm-4-flash<br/>Free API"]
        F_TTS["TTS: EdgeTTS<br/>Free Microsoft"]
        F_VLLM["VLLM: Zhipu glm-4v-flash<br/>Free API"]
    end

    subgraph Streaming["Streaming Configuration"]
        S_ASR["ASR: XunfeiStreamASR<br/>Pay per use"]
        S_LLM["LLM: Aliyun qwen-flash<br/>Pay per token"]
        S_TTS["TTS: HuoshanDoubleStreamTTS<br/>Pay per character"]
        S_VLLM["VLLM: Aliyun qwen2.5-vl<br/>Pay per token"]
    end

    subgraph Hybrid["Hybrid Configuration"]
        H_ASR["ASR: GroqASR (Free tier)<br/>whisper-large-v3"]
        H_LLM["LLM: Zhipu glm-4-flash<br/>Free API"]
        H_TTS["TTS: LinkeraiTTS<br/>Free streaming"]
        H_VLLM["VLLM: Zhipu glm-4v-flash<br/>Free API"]
    end

    Free --> F_ASR & F_LLM & F_TTS & F_VLLM
    Streaming --> S_ASR & S_LLM & S_TTS & S_VLLM
    Hybrid --> H_ASR & H_LLM & H_TTS & H_VLLM
```

## Latency Breakdown by Component

```mermaid
%%{init: {'theme': 'dark'}}%%
gantt
    title Voice Interaction Latency (External APIs)
    dateFormat X
    axisFormat %L ms

    section Non-Streaming
    VAD Processing      :a1, 0, 50
    ASR (Doubao)        :a2, after a1, 750
    LLM First Token     :a3, after a2, 1000
    LLM Full Response   :a4, after a3, 700
    TTS Generation      :a5, after a4, 700
    Audio Playback Start:a6, after a5, 100

    section Streaming
    VAD Processing      :b1, 0, 50
    ASR Stream (Xunfei) :b2, after b1, 350
    LLM First Token     :b3, after b2, 300
    TTS First Chunk     :b4, after b3, 150
    Audio Playback Start:b5, after b4, 50
```

## Simplified Architecture (External APIs Only)

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart LR
    subgraph Device["ESP32 Device"]
        MIC["Microphone"]
        SPK["Speaker"]
    end

    subgraph Server["xiaozhi-server (Lightweight)"]
        WS["WebSocket<br/>:8000"]
        VAD["VAD<br/>(Local SileroVAD)<br/>~100MB RAM"]
    end

    subgraph CloudASR["Cloud ASR"]
        GASR["GroqASR<br/>or DoubaoASR"]
    end

    subgraph CloudLLM["Cloud LLM"]
        GLLM["Zhipu glm-4-flash<br/>or DoubaoLLM"]
    end

    subgraph CloudTTS["Cloud TTS"]
        GTTS["EdgeTTS<br/>or DoubaoTTS"]
    end

    MIC -->|"Audio"| WS
    WS --> VAD
    VAD -->|"Speech Segment"| GASR
    GASR -->|"Text"| GLLM
    GLLM -->|"Response"| GTTS
    GTTS -->|"Audio"| WS
    WS -->|"Audio"| SPK

    style Server fill:#2d3748,stroke:#4a5568
    style CloudASR fill:#553c9a,stroke:#6b46c1
    style CloudLLM fill:#2c5282,stroke:#3182ce
    style CloudTTS fill:#285e61,stroke:#319795
```

## Resource Requirements

| Deployment Mode | RAM | CPU | GPU | Network | Notes |
|----------------|-----|-----|-----|---------|-------|
| **Full Local** (FunASR + Local LLM) | 8GB+ | 4 cores | Optional | Not required | Slower but private |
| **Hybrid** (Local VAD + External APIs) | 2GB | 2 cores | None | Required | Recommended for low-end servers |
| **Full External** (All Cloud APIs) | 512MB | 1 core | None | Required | Fastest, lowest resource |

## External API Endpoints

| Provider | Service | Endpoint | Free Tier |
|----------|---------|----------|-----------|
| **Zhipu** | LLM | `https://open.bigmodel.cn/api/paas/v4/` | Yes (glm-4-flash) |
| **Zhipu** | VLLM | `https://open.bigmodel.cn/api/paas/v4/` | Yes (glm-4v-flash) |
| **Microsoft** | TTS | Edge TTS (local library) | Yes (Unlimited) |
| **Groq** | ASR | `https://api.groq.com/openai/v1/audio/transcriptions` | Yes (Limited) |
| **Aliyun** | LLM | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Limited |
| **Doubao** | LLM | `https://ark.cn-beijing.volces.com/api/v3` | 500K tokens |
| **Doubao** | TTS | `https://openspeech.bytedance.com/api/v1/tts` | Paid only |
| **Doubao** | ASR | Volcengine API | Paid only |

## Latency Comparison Table

| Configuration | ASR | LLM (TTFT) | TTS | Total to First Audio |
|--------------|-----|------------|-----|---------------------|
| **Free (Non-streaming)** | ~800ms | ~1000ms | ~500ms | ~2.5-3.5s |
| **Free (Streaming)** | ~400ms | ~500ms | ~200ms | ~1.2-1.5s |
| **Paid (Streaming)** | ~200ms | ~300ms | ~100ms | ~0.7-1.0s |
| **Local FunASR + Free** | ~300ms | ~500ms | ~200ms | ~1.2-1.5s |

> TTFT = Time To First Token

## Configuration Example (Lightweight External APIs)

```yaml
# Minimal resource deployment - all external APIs
# Server requirements: 512MB RAM, 1 CPU core

selected_module:
  VAD: SileroVAD          # Local, lightweight (~100MB)
  ASR: GroqASR            # External, free tier available
  LLM: ChatGLMLLM         # External, free (Zhipu glm-4-flash)
  TTS: EdgeTTS            # External, free (Microsoft)
  VLLM: ChatGLMVLLM       # External, free (Zhipu glm-4v-flash)
  Memory: nomem           # No memory for simplicity
  Intent: function_call   # Uses LLM for intent recognition

ASR:
  GroqASR:
    type: openai
    api_key: your_groq_api_key
    base_url: https://api.groq.com/openai/v1/audio/transcriptions
    model_name: whisper-large-v3-turbo
    output_dir: tmp/

LLM:
  ChatGLMLLM:
    type: openai
    model_name: glm-4-flash
    url: https://open.bigmodel.cn/api/paas/v4/
    api_key: your_zhipu_api_key

TTS:
  EdgeTTS:
    type: edge
    voice: zh-CN-XiaoxiaoNeural  # or en-US-JennyNeural for English
    output_dir: tmp/

VLLM:
  ChatGLMVLLM:
    type: openai
    model_name: glm-4v-flash
    url: https://open.bigmodel.cn/api/paas/v4/
    api_key: your_zhipu_api_key
```

## References

- [Performance Testing Guide](./performance_tester.md)
- [Performance Benchmarks](https://github.com/xinnan-tech/xiaozhi-performance-research)
- [FAQ - Improving Response Speed](./FAQ.md#5)
- [Deployment Guide](./Deployment.md)
- [Communication Protocol](https://ccnphfhqs21z.feishu.cn/wiki/M0XiwldO9iJwHikpXD5cEx71nKh)
