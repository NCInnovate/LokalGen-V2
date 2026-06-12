const express = require('express');
const router = express.Router();
const GoogleTTSService = require('../services/GoogleTTSService');
const ElevenLabsTTSService = require('../services/ElevenLabsTTSService');

const googleTTS = new GoogleTTSService();

/**
 * POST /api/tts/generate
 * Generate voiceover from story text using Google Cloud TTS
 */
router.post('/generate', async (req, res) => {
    try {
        const {
            storyText,
            title,
            voiceGender = 'MALE',
            voiceName = 'en-US-Neural2-C',
            speakingRate = 0.95,
            provider = 'google'
        } = req.body;

        // Validation
        if (!storyText || storyText.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'storyText is required and cannot be empty'
            });
        }

        if (storyText.length > 100000) {
            return res.status(400).json({
                success: false,
                error: 'Story text exceeds maximum length (100,000 characters)'
            });
        }

        console.log(`\n🎬 TTS Generation Request`);
        console.log(`Provider: ${provider}`);
        console.log(`Story: ${title || 'Untitled'}`);
        console.log(`Length: ${storyText.length} characters`);

        let result;

        if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
            const elevenLabsTTS = new ElevenLabsTTSService(process.env.ELEVENLABS_API_KEY);
            result = await elevenLabsTTS.convertStoryToSpeech(storyText, {
                stability: req.body.stability || 0.75,
                similarity_boost: req.body.similarity_boost || 0.75
            });
        } else {
            // Default to Google Cloud TTS
            result = await googleTTS.convertStoryToSpeech(storyText, {
                voiceGender,
                voiceName,
                speakingRate
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                ...result,
                downloadUrl: `/api/tts/download/${result.filename}`
            },
            message: '✅ Voiceover generated successfully'
        });

    } catch (error) {
        console.error('❌ TTS Generation Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate voiceover'
        });
    }
});

/**
 * GET /api/tts/voices
 * Get available voices for TTS
 */
router.get('/voices', async (req, res) => {
    try {
        const { provider = 'google' } = req.query;

        if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
            const elevenLabsTTS = new ElevenLabsTTSService(process.env.ELEVENLABS_API_KEY);
            const voices = await elevenLabsTTS.listVoices();
            return res.status(200).json({
                success: true,
                provider: 'elevenlabs',
                voices
            });
        } else {
            // Google Cloud voices (static list for now)
            const googleVoices = [
                {
                    name: 'en-US-Neural2-A',
                    gender: 'MALE',
                    description: 'Deep, rich voice (Male)'
                },
                {
                    name: 'en-US-Neural2-C',
                    gender: 'MALE',
                    description: 'Professional voice (Male)'
                },
                {
                    name: 'en-US-Neural2-E',
                    gender: 'FEMALE',
                    description: 'Warm, friendly voice (Female)'
                },
                {
                    name: 'en-US-Neural2-F',
                    gender: 'FEMALE',
                    description: 'Clear, articulate voice (Female)'
                }
            ];

            return res.status(200).json({
                success: true,
                provider: 'google',
                voices: googleVoices
            });
        }
    } catch (error) {
        console.error('❌ Error fetching voices:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch voices'
        });
    }
});

/**
 * GET /api/tts/download/:filename
 * Download generated audio file
 */
router.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;

        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename'
            });
        }

        const filepath = require('path').join(process.env.UPLOAD_DIR || './uploads/audio', filename);

        if (!require('fs').existsSync(filepath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        res.download(filepath);

    } catch (error) {
        console.error('❌ Download Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to download file'
        });
    }
});

/**
 * GET /api/tts/status/:filename
 * Get metadata about a generated audio file
 */
router.get('/status/:filename', (req, res) => {
    try {
        const filename = req.params.filename;

        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename'
            });
        }

        const fs = require('fs');
        const path = require('path');
        const filepath = path.join(process.env.UPLOAD_DIR || './uploads/audio', filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        const stats = fs.statSync(filepath);

        return res.status(200).json({
            success: true,
            data: {
                filename,
                fileSize: stats.size,
                created: stats.birthtimeMs,
                modified: stats.mtimeMs
            }
        });

    } catch (error) {
        console.error('❌ Status Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get file status'
        });
    }
});

module.exports = router;
