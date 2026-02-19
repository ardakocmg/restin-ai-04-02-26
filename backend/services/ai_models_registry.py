"""
AI Models Registry — Multi-Provider Model Catalog
===================================================
All available models across 10 providers with metadata for config panel,
routing, billing, and capability detection.
"""

AVAILABLE_MODELS = {
    # ═══════════════════════════════════════════════════════════════
    # GOOGLE (Gemini, Imagen, Embedding, TTS)
    # ═══════════════════════════════════════════════════════════════
    "gemini-2.5-flash": {
        "provider": "google",
        "category": "text",
        "tier": "standard",
        "name": "Gemini 2.5 Flash",
        "description": "Best reasoning — FREE tier (5 RPM, 100 RPD)",
        "rpm": 5, "tpm": 250000, "rpd": 100,
        "default_tasks": ["analysis", "strategy", "content", "market"],
        "free": True,
    },
    "gemini-2.5-pro": {
        "provider": "google",
        "category": "text",
        "tier": "premium",
        "name": "Gemini 2.5 Pro",
        "description": "Deep analysis & complex reasoning",
        "rpm": 15, "tpm": None, "rpd": 1500,
        "default_tasks": [],
    },
    "gemini-2.0-flash": {
        "provider": "google",
        "category": "text",
        "tier": "standard",
        "name": "Gemini 2.0 Flash",
        "description": "Fast, high-throughput chat — FREE tier",
        "rpm": 15, "tpm": None, "rpd": 1500,
        "default_tasks": ["chat", "voice", "copilot"],
        "free": True,
    },
    "gemini-2.5-flash-lite": {
        "provider": "google",
        "category": "text",
        "tier": "lite",
        "name": "Gemini 2.5 Flash Lite",
        "description": "Ultra-fast, lightweight tasks",
        "rpm": 10, "tpm": 250000, "rpd": 20,
        "default_tasks": [],
    },
    "gemini-2.0-flash-lite": {
        "provider": "google",
        "category": "text",
        "tier": "lite",
        "name": "Gemini 2.0 Flash Lite",
        "description": "Fastest, minimal cost — FREE tier",
        "rpm": 15, "tpm": None, "rpd": 1500,
        "default_tasks": [],
        "free": True,
    },
    "gemini-3-flash": {
        "provider": "google",
        "category": "text",
        "tier": "standard",
        "name": "Gemini 3 Flash",
        "description": "Next-gen fast model",
        "rpm": 5, "tpm": 250000, "rpd": 20,
        "default_tasks": [],
    },
    "gemini-3-pro": {
        "provider": "google",
        "category": "text",
        "tier": "premium",
        "name": "Gemini 3 Pro",
        "description": "Next-gen premium reasoning",
        "rpm": 15, "tpm": None, "rpd": 1500,
        "default_tasks": [],
    },
    "imagen-4": {
        "provider": "google",
        "category": "image",
        "tier": "premium",
        "name": "Imagen 4",
        "description": "Photo-realistic image generation",
        "rpm": 0, "tpm": None, "rpd": 25,
        "default_tasks": ["image"],
    },
    "imagen-4-ultra": {
        "provider": "google",
        "category": "image",
        "tier": "premium",
        "name": "Imagen 4 Ultra",
        "description": "Highest quality images",
        "rpm": 0, "tpm": None, "rpd": 25,
        "default_tasks": [],
    },
    "imagen-4-fast": {
        "provider": "google",
        "category": "image",
        "tier": "standard",
        "name": "Imagen 4 Fast",
        "description": "Quick image generation",
        "rpm": 0, "tpm": None, "rpd": 25,
        "default_tasks": [],
    },
    "gemini-2.5-flash-tts": {
        "provider": "google",
        "category": "tts",
        "tier": "standard",
        "name": "Gemini 2.5 Flash TTS",
        "description": "Text-to-speech generation",
        "rpm": 3, "tpm": 10000, "rpd": 10,
        "default_tasks": ["tts"],
    },
    "gemini-2.5-pro-tts": {
        "provider": "google",
        "category": "tts",
        "tier": "premium",
        "name": "Gemini 2.5 Pro TTS",
        "description": "Premium voice quality",
        "rpm": 15, "tpm": None, "rpd": 1500,
        "default_tasks": [],
    },
    "text-embedding-004": {
        "provider": "google",
        "category": "embedding",
        "tier": "standard",
        "name": "Google Text Embedding",
        "description": "Vector embeddings for RAG/search — FREE tier",
        "rpm": 100, "tpm": 30000, "rpd": 1000,
        "default_tasks": ["embedding"],
        "free": True,
    },

    # ═══════════════════════════════════════════════════════════════
    # GROQ (Ultra-fast inference — ALL FREE)
    # Free Plan: https://console.groq.com/docs/rate-limits
    # ═══════════════════════════════════════════════════════════════
    "llama-3.3-70b-versatile": {
        "provider": "groq",
        "category": "text",
        "tier": "standard",
        "name": "Llama 3.3 70B Versatile (Groq)",
        "description": "70B versatile — 30 RPM, 1K RPD, FREE",
        "rpm": 30, "tpm": 12000, "rpd": 1000,
        "default_tasks": [],
        "free": True,
    },
    "llama-3.1-8b-instant": {
        "provider": "groq",
        "category": "text",
        "tier": "lite",
        "name": "Llama 3.1 8B Instant (Groq)",
        "description": "Ultra-fast small model — 14.4K RPD, FREE",
        "rpm": 30, "tpm": 6000, "rpd": 14400,
        "default_tasks": [],
        "free": True,
    },
    "meta-llama/llama-4-maverick-17b-128e-instruct": {
        "provider": "groq",
        "category": "text",
        "tier": "standard",
        "name": "Llama 4 Maverick 17B (Groq)",
        "description": "Llama 4 flagship — 30 RPM, 1K RPD, FREE",
        "rpm": 30, "tpm": 6000, "rpd": 1000,
        "default_tasks": [],
        "free": True,
    },
    "meta-llama/llama-4-scout-17b-16e-instruct": {
        "provider": "groq",
        "category": "text",
        "tier": "standard",
        "name": "Llama 4 Scout 17B (Groq)",
        "description": "Llama 4 efficient — 30K TPM, FREE",
        "rpm": 30, "tpm": 30000, "rpd": 1000,
        "default_tasks": [],
        "free": True,
    },
    "qwen/qwen3-32b": {
        "provider": "groq",
        "category": "text",
        "tier": "standard",
        "name": "Qwen3 32B (Groq)",
        "description": "Alibaba Qwen3 — 60 RPM, FREE",
        "rpm": 60, "tpm": 6000, "rpd": 1000,
        "default_tasks": [],
        "free": True,
    },
    "moonshotai/kimi-k2-instruct": {
        "provider": "groq",
        "category": "text",
        "tier": "standard",
        "name": "Kimi K2 Instruct (Groq)",
        "description": "Moonshot AI reasoning — 60 RPM, FREE",
        "rpm": 60, "tpm": 10000, "rpd": 1000,
        "default_tasks": [],
        "free": True,
    },
    "openai/gpt-oss-120b": {
        "provider": "groq",
        "category": "text",
        "tier": "premium",
        "name": "GPT-OSS 120B (Groq)",
        "description": "OpenAI open-source 120B — FREE",
        "rpm": 30, "tpm": 8000, "rpd": 1000,
        "default_tasks": [],
        "free": True,
    },
    "openai/gpt-oss-20b": {
        "provider": "groq",
        "category": "text",
        "tier": "standard",
        "name": "GPT-OSS 20B (Groq)",
        "description": "OpenAI open-source 20B — FREE",
        "rpm": 30, "tpm": 8000, "rpd": 1000,
        "default_tasks": [],
        "free": True,
    },
    "groq/compound": {
        "provider": "groq",
        "category": "text",
        "tier": "standard",
        "name": "Compound (Groq Agentic)",
        "description": "Agentic compound AI — 70K TPM, FREE",
        "rpm": 30, "tpm": 70000, "rpd": 250,
        "default_tasks": [],
        "free": True,
    },
    "whisper-large-v3": {
        "provider": "groq",
        "category": "stt",
        "tier": "standard",
        "name": "Whisper Large v3 (Groq)",
        "description": "OpenAI Whisper STT on Groq — FREE",
        "rpm": 20, "tpm": None, "rpd": 2000,
        "default_tasks": [],
        "free": True,
    },
    "whisper-large-v3-turbo": {
        "provider": "groq",
        "category": "stt",
        "tier": "lite",
        "name": "Whisper Large v3 Turbo (Groq)",
        "description": "Fast Whisper STT — FREE",
        "rpm": 20, "tpm": None, "rpd": 2000,
        "default_tasks": [],
        "free": True,
    },

    # ═══════════════════════════════════════════════════════════════
    # OPENAI (GPT-4o, DALL-E, Whisper, Embeddings)
    # ═══════════════════════════════════════════════════════════════
    "gpt-4o": {
        "provider": "openai",
        "category": "text",
        "tier": "premium",
        "name": "GPT-4o",
        "description": "Top-tier reasoning & multimodal",
        "rpm": 500, "tpm": 30000, "rpd": None,
        "default_tasks": [],
    },
    "gpt-4o-mini": {
        "provider": "openai",
        "category": "text",
        "tier": "standard",
        "name": "GPT-4o Mini",
        "description": "Fast, cost-effective alternative",
        "rpm": 500, "tpm": 200000, "rpd": None,
        "default_tasks": [],
    },
    "dall-e-3": {
        "provider": "openai",
        "category": "image",
        "tier": "premium",
        "name": "DALL-E 3",
        "description": "Advanced image generation with prompt revision",
        "rpm": 5, "tpm": None, "rpd": None,
        "default_tasks": [],
    },
    "whisper-1": {
        "provider": "openai",
        "category": "stt",
        "tier": "standard",
        "name": "Whisper",
        "description": "Multilingual speech-to-text",
        "rpm": 50, "tpm": None, "rpd": None,
        "default_tasks": ["stt"],
    },
    "text-embedding-3-small": {
        "provider": "openai",
        "category": "embedding",
        "tier": "standard",
        "name": "OpenAI Embedding Small",
        "description": "1536-dim embeddings, fast & cheap",
        "rpm": 500, "tpm": 1000000, "rpd": None,
        "default_tasks": [],
    },
    "text-embedding-3-large": {
        "provider": "openai",
        "category": "embedding",
        "tier": "premium",
        "name": "OpenAI Embedding Large",
        "description": "3072-dim embeddings, highest accuracy",
        "rpm": 500, "tpm": 1000000, "rpd": None,
        "default_tasks": [],
    },

    # ═══════════════════════════════════════════════════════════════
    # ANTHROPIC (Claude — 200K context, Free Tier: 5 RPM)
    # Verified from: https://console.anthropic.com — Rate Limits page
    # Free Tier limits: 5 RPM, 10K-25K input TPM, 4K-5K output TPM
    # ═══════════════════════════════════════════════════════════════
    "claude-3-5-sonnet-latest": {
        "provider": "anthropic",
        "category": "text",
        "tier": "premium",
        "name": "Claude Sonnet Active",
        "description": "Top reasoning, 200K context — Free: 5 RPM, 10K TPM in",
        "rpm": 5, "tpm": 10000, "rpd": None,
        "default_tasks": ["analysis", "strategy"],
        "free": True,
    },
    "claude-3-5-haiku-latest": {
        "provider": "anthropic",
        "category": "text",
        "tier": "standard",
        "name": "Claude Haiku Active",
        "description": "Fast & affordable — Free: 5 RPM, 10K TPM in",
        "rpm": 5, "tpm": 10000, "rpd": None,
        "default_tasks": [],
        "free": True,
    },
    "claude-3-haiku-20240307": {
        "provider": "anthropic",
        "category": "text",
        "tier": "lite",
        "name": "Claude Haiku 3",
        "description": "Legacy Haiku — Free: 5 RPM, 25K TPM in (highest free quota)",
        "rpm": 5, "tpm": 25000, "rpd": None,
        "default_tasks": [],
        "free": True,
    },

    # ═══════════════════════════════════════════════════════════════
    # MISTRAL (EU/GDPR Compliant)
    # ═══════════════════════════════════════════════════════════════
    "mistral-large-latest": {
        "provider": "mistral",
        "category": "text",
        "tier": "premium",
        "name": "Mistral Large",
        "description": "Top EU model — GDPR compliant",
        "rpm": 30, "tpm": None, "rpd": None,
        "default_tasks": [],
    },
    "mistral-small-latest": {
        "provider": "mistral",
        "category": "text",
        "tier": "standard",
        "name": "Mistral Small",
        "description": "Fast EU model — GDPR compliant",
        "rpm": 30, "tpm": None, "rpd": None,
        "default_tasks": [],
        "free": True,
    },
    "codestral-latest": {
        "provider": "mistral",
        "category": "text",
        "tier": "standard",
        "name": "Codestral",
        "description": "Code-optimized model",
        "rpm": 30, "tpm": None, "rpd": None,
        "default_tasks": [],
    },
    "mistral-embed": {
        "provider": "mistral",
        "category": "embedding",
        "tier": "standard",
        "name": "Mistral Embed",
        "description": "1024-dim embeddings",
        "rpm": 30, "tpm": None, "rpd": None,
        "default_tasks": [],
    },

    # ═══════════════════════════════════════════════════════════════
    # ELEVENLABS (Premium TTS — 10K chars/mo FREE, full access key)
    # Models verified from: GET https://api.elevenlabs.io/v1/models
    # 22 voices available (Roger, Sarah, George, Alice, etc.)
    # ═══════════════════════════════════════════════════════════════
    "eleven_v3": {
        "provider": "elevenlabs",
        "category": "tts",
        "tier": "premium",
        "name": "Eleven v3 (Latest)",
        "description": "Latest gen TTS — highest quality, multilingual",
        "rpm": 10, "tpm": None, "rpd": None,
        "default_tasks": ["voice_ai"],
    },
    "eleven_multilingual_v2": {
        "provider": "elevenlabs",
        "category": "tts",
        "tier": "standard",
        "name": "Eleven Multilingual v2",
        "description": "Premium multi-language TTS (29 languages)",
        "rpm": 10, "tpm": None, "rpd": None,
        "default_tasks": [],
    },
    "eleven_flash_v2_5": {
        "provider": "elevenlabs",
        "category": "tts",
        "tier": "lite",
        "name": "Eleven Flash v2.5",
        "description": "Low-latency TTS — best for real-time voice",
        "rpm": 10, "tpm": None, "rpd": None,
        "default_tasks": ["voice_realtime"],
    },
    "eleven_turbo_v2_5": {
        "provider": "elevenlabs",
        "category": "tts",
        "tier": "lite",
        "name": "Eleven Turbo v2.5",
        "description": "Ultra-fast TTS for streaming/phone",
        "rpm": 10, "tpm": None, "rpd": None,
        "default_tasks": [],
    },
    "eleven_flash_v2": {
        "provider": "elevenlabs",
        "category": "tts",
        "tier": "lite",
        "name": "Eleven Flash v2",
        "description": "Fast TTS — legacy stable model",
        "rpm": 10, "tpm": None, "rpd": None,
        "default_tasks": [],
    },
    "eleven_multilingual_sts_v2": {
        "provider": "elevenlabs",
        "category": "tts",
        "tier": "premium",
        "name": "Eleven STS v2 (Speech-to-Speech)",
        "description": "Voice conversion / cloning — real-time",
        "rpm": 10, "tpm": None, "rpd": None,
        "default_tasks": ["voice_clone"],
    },

    # ═══════════════════════════════════════════════════════════════
    # DEEPGRAM (Speech-to-Text)
    # ═══════════════════════════════════════════════════════════════
    "nova-2": {
        "provider": "deepgram",
        "category": "stt",
        "tier": "standard",
        "name": "Deepgram Nova-2",
        "description": "Highest accuracy STT — $200 free credit",
        "rpm": 100, "tpm": None, "rpd": None,
        "default_tasks": [],
    },

    # ═══════════════════════════════════════════════════════════════
    # CLOUDFLARE WORKERS AI (Edge — FREE)
    # ═══════════════════════════════════════════════════════════════
    "@cf/meta/llama-3.1-8b-instruct": {
        "provider": "cloudflare",
        "category": "text",
        "tier": "lite",
        "name": "Llama 3.1 8B (Edge)",
        "description": "Edge inference — 10K neurons/day free",
        "rpm": 100, "tpm": None, "rpd": None,
        "default_tasks": [],
        "free": True,
    },
    "@cf/mistral/mistral-7b-instruct-v0.2": {
        "provider": "cloudflare",
        "category": "text",
        "tier": "lite",
        "name": "Mistral 7B (Edge)",
        "description": "Mistral on edge — free tier",
        "rpm": 100, "tpm": None, "rpd": None,
        "default_tasks": [],
        "free": True,
    },

    # ═══════════════════════════════════════════════════════════════
    # HUGGINGFACE (NLP Pipelines — FREE)
    # ═══════════════════════════════════════════════════════════════
    "cardiffnlp/twitter-roberta-base-sentiment-latest": {
        "provider": "huggingface",
        "category": "nlp",
        "tier": "free",
        "name": "Sentiment Analysis (RoBERTa)",
        "description": "Review & feedback sentiment scoring",
        "rpm": 30, "tpm": None, "rpd": None,
        "default_tasks": ["sentiment"],
        "free": True,
    },
    "dslim/bert-base-NER": {
        "provider": "huggingface",
        "category": "nlp",
        "tier": "free",
        "name": "Named Entity Recognition (BERT)",
        "description": "Allergen & ingredient detection",
        "rpm": 30, "tpm": None, "rpd": None,
        "default_tasks": ["ner"],
        "free": True,
    },

    # ═══════════════════════════════════════════════════════════════
    # OPENROUTER (Multi-Model Proxy — 26 FREE models)  
    # Verified from: GET https://openrouter.ai/api/v1/models
    # ═══════════════════════════════════════════════════════════════

    # --- Meta Llama ---
    "meta-llama/llama-3.3-70b-instruct:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Llama 3.3 70B (OR Free)", "description": "70B instruct — best free Llama",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "meta-llama/llama-3.2-3b-instruct:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Llama 3.2 3B (OR Free)", "description": "Ultra-light 3B — fast intent",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- Google Gemma ---
    "google/gemma-3-4b-it:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Gemma 3 4B (OR Free)", "description": "Google's efficient 4B",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "google/gemma-3-12b-it:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Gemma 3 12B (OR Free)", "description": "Google Gemma 3 mid-size",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "google/gemma-3-27b-it:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Gemma 3 27B (OR Free)", "description": "Google Gemma 3 large",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "google/gemma-3n-e2b-it:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Gemma 3n E2B (OR Free)", "description": "Google Gemma nano 2B edge",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "google/gemma-3n-e4b-it:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Gemma 3n E4B (OR Free)", "description": "Google Gemma nano 4B edge",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- DeepSeek ---
    "deepseek/deepseek-r1-0528:free": {
        "provider": "openrouter", "category": "text", "tier": "premium",
        "name": "DeepSeek R1-0528 (OR Free)", "description": "Advanced reasoning model",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- NVIDIA ---
    "nvidia/nemotron-nano-12b-v2-vl:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Nemotron Nano 12B VL (OR Free)", "description": "NVIDIA vision-language",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "nvidia/nemotron-nano-9b-v2:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Nemotron Nano 9B (OR Free)", "description": "NVIDIA 9B text",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "nvidia/nemotron-3-nano-30b-a3b:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Nemotron 3 Nano 30B (OR Free)", "description": "NVIDIA 30B MoE",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- OpenAI OSS ---
    "openai/gpt-oss-120b:free": {
        "provider": "openrouter", "category": "text", "tier": "premium",
        "name": "GPT-OSS 120B (OR Free)", "description": "OpenAI open-source 120B",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "openai/gpt-oss-20b:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "GPT-OSS 20B (OR Free)", "description": "OpenAI open-source 20B",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- Qwen ---
    "qwen/qwen3-4b:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Qwen3 4B (OR Free)", "description": "Alibaba small model",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "qwen/qwen3-coder:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Qwen3 Coder (OR Free)", "description": "Code-optimized Qwen3",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "qwen/qwen3-next-80b-a3b-instruct:free": {
        "provider": "openrouter", "category": "text", "tier": "premium",
        "name": "Qwen3 Next 80B (OR Free)", "description": "Alibaba 80B MoE flagship",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- Mistral ---
    "mistralai/mistral-small-3.1-24b-instruct:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Mistral Small 3.1 24B (OR Free)", "description": "EU/GDPR compliant",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- NousResearch ---
    "nousresearch/hermes-3-llama-3.1-405b:free": {
        "provider": "openrouter", "category": "text", "tier": "premium",
        "name": "Hermes 3 405B (OR Free)", "description": "Largest free model! 405B",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- Arcee AI ---
    "arcee-ai/trinity-large-preview:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Trinity Large (OR Free)", "description": "Arcee AI multi-task",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "arcee-ai/trinity-mini:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Trinity Mini (OR Free)", "description": "Arcee AI compact",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },

    # --- Others ---
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Dolphin Mistral 24B (OR Free)", "description": "Uncensored Mistral",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "liquid/lfm-2.5-1.2b-instruct:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Liquid LFM 2.5 1.2B (OR Free)", "description": "Ultra-compact model",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "liquid/lfm-2.5-1.2b-thinking:free": {
        "provider": "openrouter", "category": "text", "tier": "lite",
        "name": "Liquid LFM 2.5 Thinking (OR Free)", "description": "Reasoning compact",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "stepfun/step-3.5-flash:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Step 3.5 Flash (OR Free)", "description": "StepFun fast model",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "upstage/solar-pro-3:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "Solar Pro 3 (OR Free)", "description": "Upstage Korean+English",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
    "z-ai/glm-4.5-air:free": {
        "provider": "openrouter", "category": "text", "tier": "standard",
        "name": "GLM 4.5 Air (OR Free)", "description": "Zhipu AI Chinese+English",
        "rpm": 20, "tpm": None, "rpd": 200, "free": True,
    },
}


# Task types and their categories
TASK_CATEGORIES = {
    "analysis": "text",
    "strategy": "text",
    "market": "text",
    "content": "text",
    "studio": "text",
    "chat": "text",
    "voice": "text",
    "copilot": "text",
    "image": "image",
    "tts": "tts",
    "stt": "stt",
    "embedding": "embedding",
    "sentiment": "nlp",
    "ner": "nlp",
    "default": "text",
}


def get_models_by_category(category: str = None) -> dict:
    """Filter models by category."""
    if not category:
        return AVAILABLE_MODELS
    return {k: v for k, v in AVAILABLE_MODELS.items() if v["category"] == category}


def get_models_by_provider(provider: str = None) -> dict:
    """Filter models by provider."""
    if not provider:
        return AVAILABLE_MODELS
    return {k: v for k, v in AVAILABLE_MODELS.items() if v["provider"] == provider}


def get_free_models() -> dict:
    """Get only free-tier models."""
    return {k: v for k, v in AVAILABLE_MODELS.items() if v.get("free")}


def get_all_providers() -> list:
    """Get unique provider names."""
    return sorted(set(v["provider"] for v in AVAILABLE_MODELS.values()))


def get_default_routing() -> dict:
    """Build default task→model routing, preferring FREE models."""
    routing = {}
    for model_id, meta in AVAILABLE_MODELS.items():
        for task in meta.get("default_tasks", []):
            if task not in routing:
                routing[task] = model_id
            elif meta.get("free") and not AVAILABLE_MODELS.get(routing[task], {}).get("free"):
                # Prefer free models over paid ones
                routing[task] = model_id
    routing.setdefault("default", "gemini-2.0-flash")
    return routing
