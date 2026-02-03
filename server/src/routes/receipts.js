import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { authMiddleware } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// OpenAI Vision API (GPT-4o)
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeReceiptWithOpenAI = async (imageBuffer) => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Missing OPENAI_API_KEY, cannot use Vision API');
    return null;
  }

  try {
    console.log('Sending image to OpenAI Vision API...');
    const startTime = Date.now();
    
    const base64Image = imageBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a specialized receipt scanner for Czech gas stations. Extract data strictly in JSON format."
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this fuel receipt and extract the following fields in JSON format: stationName (string, use clean brand name like 'Tank ONO', 'Shell', 'Benzina'), date (YYYY-MM-DD), time (HH:MM), pricePerLiter (number), totalLiters (number), totalCost (number). \n\nToday is ${new Date().toISOString().split('T')[0]}. If the year is missing or ambiguous, assume the receipt is recent (from this year ${new Date().getFullYear()}). \n\nIf totalCost is missing, calculate it from liters * price. If station name contains 'ONO', simplify to 'Tank ONO'. Return ONLY the JSON object, no markdown formatting.` },
            {
              type: "image_url",
              image_url: {
                "url": `data:image/jpeg;base64,${base64Image}`,
                "detail": "high"
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    
    console.log(`OpenAI analysis completed in ${Date.now() - startTime}ms`);
    
    const content = response.choices[0].message.content;
    console.log('OpenAI Response:', content);
    
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI JSON response:', e);
      return null;
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return null;
  }
};

// All routes require authentication
router.use(authMiddleware);

// POST /api/receipts/scan - Upload and scan a receipt image
router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    let imageUrl = null;
    let extractedText = '';
    let parsedData = {};

    // Upload to Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const base64Image = req.file.buffer.toString('base64');
        const dataUri = `data:${req.file.mimetype};base64,${base64Image}`;
        
        const uploadResult = await cloudinary.uploader.upload(dataUri, {
          folder: 'tankuy/receipts',
          resource_type: 'image',
        });
        
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        console.error('Cloudinary upload failed:', error);
      }
    }

    // OpenAI Analysis
    try {
      parsedData = await analyzeReceiptWithOpenAI(req.file.buffer);
      console.log('OpenAI parsed data:', parsedData);
    } catch (error) {
      console.error('OCR processing error:', error);
    }

    res.json({
      imageUrl,
      rawText: JSON.stringify(parsedData), // For backward compatibility/debug
      parsed: parsedData || {},
    });
  } catch (error) {
    console.error('Receipt scan error:', error);
    res.status(500).json({ error: 'Failed to scan receipt' });
  }
});

// Endpoint /parse removed as we now use direct image analysis via OpenAI

export default router;
