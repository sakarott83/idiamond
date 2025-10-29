/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  Modality,
  Video,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
} from '@google/genai';
import {
  GenerateAudioParams,
  GenerateVideoParams,
  GenerationMode,
} from '../types';

export const enhancePrompt = async (prompt: string): Promise<string> => {
  if (!prompt.trim()) {
    throw new Error('Prompt cannot be empty.');
  }
  console.log('Enhancing prompt:', prompt);
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User prompt: "${prompt}"`,
      config: {
        systemInstruction:
          "You are an expert prompt writer for a text-to-video AI model. Your task is to take a user's simple prompt and expand it into a rich, detailed, and cinematic description. Focus on visual details, camera angles, lighting, mood, and specific actions. The enhanced prompt should be a single, coherent paragraph. Do not add any conversational text, explanations, or quotes around the output. Just output the enhanced prompt text directly.",
        temperature: 0.8,
      },
    });

    const enhancedPrompt = response.text.trim();
    console.log('Enhanced prompt received:', enhancedPrompt);
    if (!enhancedPrompt) {
      throw new Error('The model returned an empty enhancement.');
    }
    return enhancedPrompt;
  } catch (error) {
    console.error('Failed to enhance prompt:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Failed to enhance prompt: ${errorMessage}`);
  }
};

export const generateAudio = async (
  params: GenerateAudioParams,
): Promise<{objectUrl: string}> => {
  console.log('Starting audio generation with params:', params);

  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{parts: [{text: params.prompt}]}],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: params.voice},
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const base64Audio = inlineData?.data;
    const mimeType = inlineData?.mimeType;

    if (!base64Audio || !mimeType) {
      throw new Error('Audio data not found in the API response.');
    }

    const objectUrl = `data:${mimeType};base64,${base64Audio}`;
    return {objectUrl};
  } catch (error) {
    console.error('Failed to generate audio:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Failed to generate audio: ${errorMessage}`);
  }
};

// Fix: API key is now handled by process.env.API_KEY, so it's removed from parameters.
export const generateVideo = async (
  params: GenerateVideoParams,
): Promise<{objectUrl: string; blob: Blob; uri: string; video: Video}> => {
  console.log('Starting video generation with params:', params);

  // Fix: API key must be obtained from process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const config: any = {
    numberOfVideos: 1,
    resolution: params.resolution,
  };

  // Conditionally add aspect ratio. It's not used for extending videos.
  if (params.mode !== GenerationMode.EXTEND_VIDEO) {
    config.aspectRatio = params.aspectRatio;
  }

  const generateVideoPayload: any = {
    model: params.model,
    config: config,
  };

  // Only add the prompt if it's not empty, as an empty prompt might interfere with other parameters.
  if (params.prompt) {
    generateVideoPayload.prompt = params.prompt;
  }

  if (params.mode === GenerationMode.FRAMES_TO_VIDEO) {
    if (params.startFrame) {
      generateVideoPayload.image = {
        imageBytes: params.startFrame.base64,
        mimeType: params.startFrame.file.type,
      };
      console.log(
        `Generating with start frame: ${params.startFrame.file.name}`,
      );
    }

    const finalEndFrame = params.isLooping
      ? params.startFrame
      : params.endFrame;
    if (finalEndFrame) {
      generateVideoPayload.config.lastFrame = {
        imageBytes: finalEndFrame.base64,
        mimeType: finalEndFrame.file.type,
      };
      if (params.isLooping) {
        console.log(
          `Generating a looping video using start frame as end frame: ${finalEndFrame.file.name}`,
        );
      } else {
        console.log(`Generating with end frame: ${finalEndFrame.file.name}`);
      }
    }
  } else if (params.mode === GenerationMode.REFERENCES_TO_VIDEO) {
    const referenceImagesPayload: VideoGenerationReferenceImage[] = [];

    if (params.referenceImages) {
      for (const img of params.referenceImages) {
        console.log(`Adding reference image: ${img.file.name}`);
        referenceImagesPayload.push({
          image: {
            imageBytes: img.base64,
            mimeType: img.file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }
    }

    if (params.styleImage) {
      console.log(
        `Adding style image as a reference: ${params.styleImage.file.name}`,
      );
      referenceImagesPayload.push({
        image: {
          imageBytes: params.styleImage.base64,
          mimeType: params.styleImage.file.type,
        },
        referenceType: VideoGenerationReferenceType.STYLE,
      });
    }

    if (referenceImagesPayload.length > 0) {
      generateVideoPayload.config.referenceImages = referenceImagesPayload;
    }
  } else if (params.mode === GenerationMode.EXTEND_VIDEO) {
    if (params.inputVideoObject) {
      generateVideoPayload.video = params.inputVideoObject;
      console.log(`Generating extension from input video object.`);
    } else {
      throw new Error('An input video object is required to extend a video.');
    }
  }

  console.log('Submitting video generation request...', generateVideoPayload);
  let operation = await ai.models.generateVideos(generateVideoPayload);
  console.log('Video generation operation started:', operation);

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log('...Generating...');
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation?.response) {
    const videos = operation.response.generatedVideos;

    if (!videos || videos.length === 0) {
      throw new Error('No videos were generated.');
    }

    const firstVideo = videos[0];
    if (!firstVideo?.video?.uri) {
      throw new Error('Generated video is missing a URI.');
    }
    const videoObject = firstVideo.video;

    const url = decodeURIComponent(videoObject.uri);
    console.log('Fetching video from:', url);

    // Fix: The API key for fetching the video must also come from process.env.API_KEY.
    const res = await fetch(`${url}&key=${process.env.API_KEY}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);
    }

    const videoBlob = await res.blob();
    const objectUrl = URL.createObjectURL(videoBlob);

    return {objectUrl, blob: videoBlob, uri: url, video: videoObject};
  } else {
    console.error('Operation failed:', operation);
    throw new Error('No videos generated.');
  }
};
