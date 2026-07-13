import { GoogleGenAI, Type } from "@google/genai";
import { StyleAnalysis, UploadedImage, AspectRatio, PostFormat, CarouselCount, GeneratedPost, LayoutSuggestion, PostContent, LogoPosition, LogoOpacity, LogoSize } from "../types";

// Initialize Gemini Client
// (Moved inside functions to ensure latest API key is used)

/**
 * Helper function to retry API calls with exponential backoff.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isTransient = error?.status === "INTERNAL" || error?.code === 500 || error?.status === "UNAVAILABLE" || error?.code === 503;
      if (!isTransient || i === maxRetries - 1) break;
      
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      console.warn(`Transient error detected (attempt ${i + 1}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

/**
 * Analyzes the uploaded images to extract visual identity style.
 * Uses Gemini 3 Pro (Preview) for superior multimodal reasoning and template identification.
 */
export const analyzeBrandStyle = async (images: UploadedImage[]): Promise<StyleAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  if (images.length === 0) throw new Error("No images provided for analysis");

  const imageParts = images.map((img) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64,
    },
  }));

  const prompt = `
    You are an expert Art Director and Brand Designer.
    Analyze these Instagram posts to identify the strict visual identity "DNA" and the recurring "Template" used by this brand.
    
    Return a JSON object with the following fields:
    - colorPalette: Array of dominant hex color codes found in the images.
    - typography: Description of fonts used (serif/sans, bold/light, uppercase/lowercase).
    - visualStyle: Description of the graphic style (minimalist, grunge, corporate, vibrant, collage, etc.).
    - mood: The emotional tone (energetic, calm, luxury, playful).
    - layoutStructure: An object containing detailed layout analysis:
        - composition: Overall grid/layout (e.g., "Split screen 50/50", "Full bleed image", "Central focus").
        - positioning: Where key elements like logo and headlines are placed (e.g., "Logo top-right, Headline centered bottom").
        - overlayStyles: Details on overlays (e.g., "Dark gradient at bottom 30%", "White translucent card in center").
        - spacing: Use of negative space and margins (e.g., "Wide white borders", "Tight padding").
  `;

  try {
    // Upgraded to Gemini 3 Pro for deeper visual understanding
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [...imageParts, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
            typography: { type: Type.STRING },
            visualStyle: { type: Type.STRING },
            mood: { type: Type.STRING },
            layoutStructure: {
              type: Type.OBJECT,
              properties: {
                composition: { type: Type.STRING },
                positioning: { type: Type.STRING },
                overlayStyles: { type: Type.STRING },
                spacing: { type: Type.STRING },
              },
              required: ["composition", "positioning", "overlayStyles", "spacing"],
            },
          },
          required: ["colorPalette", "typography", "visualStyle", "mood", "layoutStructure"],
        },
      },
    }));

    const text = response.text;
    if (!text) throw new Error("No analysis returned");
    return JSON.parse(text) as StyleAnalysis;
  } catch (error) {
    console.error("Style analysis failed:", error);
    throw error;
  }
};

/**
 * Suggests 2 different layouts and generates initial text content based on style and caption.
 */
export const suggestLayoutsAndContent = async (
  caption: string,
  styleAnalysis: StyleAnalysis,
  images: UploadedImage[]
): Promise<{ suggestions: LayoutSuggestion[]; content: PostContent }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageParts = images.map((img) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64,
    },
  }));

  const prompt = `
    You are an expert Social Media Strategist and Designer.
    Based on the provided reference images (the "models") and the brand style analysis, suggest 2 distinct layout variations for a new post and generate a punchy headline and subtitle.
    
    TOPIC: "${caption}"
    BRAND STYLE ANALYSIS:
    - Visual Style: ${styleAnalysis.visualStyle}
    - Mood: ${styleAnalysis.mood}
    - Layout DNA: ${styleAnalysis.layoutStructure.composition}
    
    INSTRUCTIONS:
    1. Analyze the layouts in the provided images.
    2. Suggest 2 variations that are consistent with these models but offer different compositions (e.g., one focusing on a person, another on a product or text-heavy).
    3. Generate a Headline (2-5 words) and a Subtitle (4-8 words) in Portuguese that fits the topic.
    
    Return a JSON object with:
    - suggestions: Array of exactly 2 objects (id, name, description, composition, positioning).
    - content: Object (headline, subtitle, headlineStyle, subtitleStyle).
    - headlineStyle and subtitleStyle: Objects with (font, color, size) based on the brand analysis.
    
    The names and descriptions of the layouts should be in Portuguese.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [...imageParts, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  composition: { type: Type.STRING },
                  positioning: { type: Type.STRING },
                },
                required: ["id", "name", "description", "composition", "positioning"],
              },
            },
            content: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                headlineStyle: {
                  type: Type.OBJECT,
                  properties: {
                    font: { type: Type.STRING },
                    color: { type: Type.STRING },
                    size: { type: Type.STRING },
                  },
                  required: ["font", "color", "size"],
                },
                subtitle: { type: Type.STRING },
                subtitleStyle: {
                  type: Type.OBJECT,
                  properties: {
                    font: { type: Type.STRING },
                    color: { type: Type.STRING },
                    size: { type: Type.STRING },
                  },
                  required: ["font", "color", "size"],
                },
              },
              required: ["headline", "headlineStyle", "subtitle", "subtitleStyle"],
            },
          },
          required: ["suggestions", "content"],
        },
      },
    }));

    const text = response.text;
    if (!text) throw new Error("No suggestions returned");
    return JSON.parse(text);
  } catch (error) {
    console.error("Suggestion failed:", error);
    throw error;
  }
};

/**
 * Generates a new creative based on the style analysis, selected layout, and edited content.
 */
export const generateCreativePost = async (
  caption: string,
  styleAnalysis: StyleAnalysis,
  referenceImages: UploadedImage[],
  format: PostFormat,
  carouselCount: CarouselCount = 4,
  logo?: UploadedImage,
  logoPosition?: LogoPosition,
  logoOpacity?: LogoOpacity,
  logoSize?: LogoSize,
  selectedLayout?: LayoutSuggestion,
  customContent?: PostContent,
  characterImage?: UploadedImage,
  characterDescription?: string
): Promise<GeneratedPost> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const aspectRatio: AspectRatio = format === PostFormat.STORY ? "9:16" : format === PostFormat.LANDSCAPE ? "16:9" : "4:5";
  const isCarousel = format === PostFormat.FEED_CAROUSEL;
  const numImages = isCarousel ? carouselCount : 1;
  const generatedImages: string[] = [];

  // Prepare reference parts
  const referenceParts = referenceImages.map((img) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64,
    },
  }));

  if (characterImage) {
    referenceParts.push({
      inlineData: {
        mimeType: characterImage.mimeType,
        data: characterImage.base64,
      },
    });
  }

  if (logo) {
    referenceParts.push({
      inlineData: {
        mimeType: logo.mimeType,
        data: logo.base64,
      },
    });
  }

  const generateSlide = async (i: number): Promise<string> => {
    let specificPrompt = "";
    if (isCarousel) {
      if (i === 0) {
        specificPrompt = "This is the COVER image of a carousel. It should be high-impact, featuring the main headline and a strong visual that sets the tone for the rest of the post.";
      } else if (i === numImages - 1) {
        specificPrompt = `This is the LAST image of a carousel. It MUST contain a clear Call to Action (CTA) connected to the theme: "${caption}". The visual style must remain consistent with the previous images.`;
      } else {
        specificPrompt = `This is an INTERMEDIATE image (slide ${i + 1}) of a carousel. It should follow a pattern of images that are complementary to the cover, with a focus on continuing the narrative. Change only the text to provide more value or details about the topic.`;
      }
    }

    const prompt = `
      Create a high-quality, professional Instagram post image.
      
      CONTEXT & TEXT CONTENT:
      The user provided the following context/topic for the post: "${caption}".
      ${specificPrompt}
      
      CHARACTER CONSISTENCY (CRITICAL):
      ${characterImage ? `
      - You MUST use the person from the provided character reference image as the main subject of this post.
      - Maintain the person's identity (face, hair, features) and EXACT BODY SHAPE/FORMAT.
      - DO NOT CHANGE THE PERSON'S BODY WEIGHT OR BUILD. If the person is overweight, they MUST remain overweight in the generated image.
      - Respect the person's physical build as much as possible.
      - Change ONLY their clothing, position/pose, and facial expression to fit the context.
      - Facial expressions MUST be natural and NOT exaggerated.
      ${characterDescription ? `- ADDITIONAL CHARACTER DESCRIPTION: ${characterDescription}` : ""}
      - The person should look natural and integrated into the scene.
      ` : `
      - You MUST include people in this image.
      ${characterDescription ? `- CHARACTER DESCRIPTION: ${characterDescription}` : ""}
      - The people must be HIGHLY REALISTIC and look like real photographs, not AI-generated or digital art.
      - Ensure VARIETY in the people shown (different ethnicities, ages, genders) across different generations if this is a carousel.
      `}
      
      LOGO INTEGRATION:
      ${logo ? `
      - You MUST include the provided logo image in the generated image.
      - The logo MUST be placed in the ${logoPosition || 'bottom-right'} position.
      - The logo MUST be ${logoOpacity === 'translucent' ? 'translucent/semi-transparent' : 'solid/opaque'}.
      - The logo MUST be ${logoSize || 'medium'} in size relative to the image.
      - Do NOT alter the logo's design, colors, or shape. Just place it as an overlay.
      ` : ""}
      
      LAYOUT VARIABILITY:
      - If the brand style analysis suggests multiple possible layouts or if you are generating a carousel, you MUST VARY the layout between images to ensure visual interest and variability.
      - Do not use the exact same composition for every slide; adapt the layout while maintaining brand consistency.
      ${selectedLayout ? `- SELECTED LAYOUT: ${selectedLayout.name}. Composition: ${selectedLayout.composition}. Positioning: ${selectedLayout.positioning}.` : ""}

      TEXT RENDERING INSTRUCTIONS (CRITICAL):
      You must generate and render text directly onto the image.
      1. HEADLINE: "${customContent?.headline || "Generate a short, punchy title (2-6 words)."}"
         - FONT: ${customContent?.headlineStyle.font || styleAnalysis.typography}
         - COLOR: ${customContent?.headlineStyle.color || styleAnalysis.colorPalette[0]}
         - SIZE: ${customContent?.headlineStyle.size || "Large"}
      2. SUBTITLE: "${customContent?.subtitle || "Generate a brief supporting sentence (4-10 words)."}"
         - FONT: ${customContent?.subtitleStyle.font || styleAnalysis.typography}
         - COLOR: ${customContent?.subtitleStyle.color || styleAnalysis.colorPalette[1]}
         - SIZE: ${customContent?.subtitleStyle.size || "Medium"}
      3. RENDER ONLY THESE TWO TEXT ELEMENTS. Do NOT render the full context paragraph or any body copy.
      
      The text MUST be clearly legible.
      Position the text according to: ${selectedLayout?.positioning || styleAnalysis.layoutStructure.positioning}.

      STRICT VISUAL STYLE GUIDE (Must Follow):
      - Color Palette: ${styleAnalysis.colorPalette.join(", ")}.
      - Mood: ${styleAnalysis.mood}.
      - Visual Style: ${styleAnalysis.visualStyle}.
      - Typography Style: ${styleAnalysis.typography}.
      
      LAYOUT TEMPLATE DETAILS:
      - Composition: ${selectedLayout?.composition || styleAnalysis.layoutStructure.composition}
      - Elements Positioning: ${selectedLayout?.positioning || styleAnalysis.layoutStructure.positioning}
      - Overlays & Effects: ${styleAnalysis.layoutStructure.overlayStyles}
      - Spacing & Margins: ${styleAnalysis.layoutStructure.spacing}
      
      INSTRUCTION:
      Use the provided reference images as 'few-shot' ground truth. 
      You must REPLICATE the exact visual style and layout template of the reference images.
      The generated image should look like it was created using the same Photoshop file/template as the references, but with the new Headline and Subtitle.
      Ensure high resolution and professional composition.
    `;

    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: {
          parts: [...referenceParts, { text: prompt }],
        },
        config: {
          imageConfig: {
              aspectRatio: aspectRatio,
              imageSize: "1K"
          }
        },
      });

      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
        throw new Error(`No image data found for slide ${i + 1}`);
      } else {
        throw new Error(`No candidates returned for slide ${i + 1}`);
      }
    });
  };

  try {
    const slidePromises = Array.from({ length: numImages }, (_, i) => generateSlide(i));
    const results = await Promise.all(slidePromises);
    generatedImages.push(...results);
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }

  return {
    images: generatedImages,
    format: format
  };
};
