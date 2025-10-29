/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';
import React, {useCallback, useEffect, useState} from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import AudioPromptForm from './components/AudioPromptForm';
import AudioResult from './components/AudioResult';
import {
  AudioIcon,
  CurvedArrowDownIcon,
  VideoIcon,
} from './components/icons';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import VideoResult from './components/VideoResult';
import {generateAudio, generateVideo} from './services/geminiService';
import {
  AppState,
  GenerateAudioParams,
  GenerateVideoParams,
  GenerationMode,
  Resolution,
  VideoFile,
} from './types';

const App: React.FC = () => {
  // Video States
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<GenerateVideoParams | null>(
    null,
  );
  const [lastVideoObject, setLastVideoObject] = useState<Video | null>(null);
  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);
  const [initialFormValues, setInitialFormValues] =
    useState<GenerateVideoParams | null>(null);

  // Audio States
  const [audioAppState, setAudioAppState] = useState<AppState>(AppState.IDLE);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(
    null,
  );
  const [lastAudioConfig, setLastAudioConfig] =
    useState<GenerateAudioParams | null>(null);

  // Global States
  const [activeTool, setActiveTool] = useState<'video' | 'audio'>('video');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  // Check for API key on initial load
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
          }
        } catch (error) {
          console.warn(
            'aistudio.hasSelectedApiKey check failed, assuming no key selected.',
            error,
          );
          setShowApiKeyDialog(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleGenerateVideo = useCallback(
    async (params: GenerateVideoParams) => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
            return;
          }
        } catch (error) {
          console.warn(
            'aistudio.hasSelectedApiKey check failed, assuming no key selected.',
            error,
          );
          setShowApiKeyDialog(true);
          return;
        }
      }

      setAppState(AppState.LOADING);
      setErrorMessage(null);
      setLastConfig(params);
      setInitialFormValues(null);

      try {
        const {objectUrl, blob, video} = await generateVideo(params);
        setVideoUrl(objectUrl);
        setLastVideoBlob(blob);
        setLastVideoObject(video);
        setAppState(AppState.SUCCESS);
      } catch (error) {
        console.error('Video generation failed:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred.';

        let userFriendlyMessage = `Video generation failed: ${errorMessage}`;
        let shouldOpenDialog = false;

        if (typeof errorMessage === 'string') {
          if (errorMessage.includes('Requested entity was not found.')) {
            userFriendlyMessage =
              'Model not found. This can be caused by an invalid API key or permission issues. Please check your API key.';
            shouldOpenDialog = true;
          } else if (
            errorMessage.includes('API_KEY_INVALID') ||
            errorMessage.includes('API key not valid') ||
            errorMessage.toLowerCase().includes('permission denied')
          ) {
            userFriendlyMessage =
              'Your API key is invalid or lacks permissions. Please select a valid, billing-enabled API key.';
            shouldOpenDialog = true;
          }
        }

        setErrorMessage(userFriendlyMessage);
        setAppState(AppState.ERROR);

        if (shouldOpenDialog) {
          setShowApiKeyDialog(true);
        }
      }
    },
    [],
  );

  const handleGenerateAudio = useCallback(
    async (params: GenerateAudioParams) => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
            return;
          }
        } catch (error) {
          console.warn(
            'aistudio.hasSelectedApiKey check failed, assuming no key selected.',
            error,
          );
          setShowApiKeyDialog(true);
          return;
        }
      }

      setAudioAppState(AppState.LOADING);
      setAudioErrorMessage(null);
      setLastAudioConfig(params);

      try {
        const {objectUrl} = await generateAudio(params);
        setAudioUrl(objectUrl);
        setAudioAppState(AppState.SUCCESS);
      } catch (error) {
        console.error('Audio generation failed:', error);
        const errorMessageContent =
          error instanceof Error ? error.message : 'An unknown error occurred.';
        setAudioErrorMessage(`Audio generation failed: ${errorMessageContent}`);
        setAudioAppState(AppState.ERROR);
      }
    },
    [],
  );

  const handleRetryVideo = useCallback(() => {
    if (lastConfig) {
      handleGenerateVideo(lastConfig);
    }
  }, [lastConfig, handleGenerateVideo]);

  const handleApiKeyDialogContinue = async () => {
    setShowApiKeyDialog(false);
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
    if (appState === AppState.ERROR && lastConfig) {
      handleRetryVideo();
    }
    if (audioAppState === AppState.ERROR && lastAudioConfig) {
      handleGenerateAudio(lastAudioConfig);
    }
  };

  const handleNewVideo = useCallback(() => {
    setAppState(AppState.IDLE);
    setVideoUrl(null);
    setErrorMessage(null);
    setLastConfig(null);
    setLastVideoObject(null);
    setLastVideoBlob(null);
    setInitialFormValues(null); // Clear the form state
  }, []);

  const handleNewAudio = useCallback(() => {
    setAudioAppState(AppState.IDLE);
    setAudioUrl(null);
    setAudioErrorMessage(null);
    setLastAudioConfig(null);
  }, []);

  const handleTryAgainFromVideoError = useCallback(() => {
    if (lastConfig) {
      setInitialFormValues(lastConfig);
      setAppState(AppState.IDLE);
      setErrorMessage(null);
    } else {
      handleNewVideo();
    }
  }, [lastConfig, handleNewVideo]);

  const handleTryAgainFromAudioError = useCallback(() => {
    setAudioAppState(AppState.IDLE);
    setAudioErrorMessage(null);
  }, []);

  const handleExtend = useCallback(async () => {
    if (lastConfig && lastVideoBlob && lastVideoObject) {
      try {
        const file = new File([lastVideoBlob], 'last_video.mp4', {
          type: lastVideoBlob.type,
        });
        const videoFile: VideoFile = {file, base64: ''};

        setInitialFormValues({
          ...lastConfig,
          mode: GenerationMode.EXTEND_VIDEO,
          prompt: '',
          inputVideo: videoFile,
          inputVideoObject: lastVideoObject,
          resolution: Resolution.P720,
          startFrame: null,
          endFrame: null,
          referenceImages: [],
          styleImage: null,
          isLooping: false,
        });

        setAppState(AppState.IDLE);
        setVideoUrl(null);
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to process video for extension:', error);
        const message =
          error instanceof Error ? error.message : 'An unknown error occurred.';
        setErrorMessage(
          `Failed to prepare video for extension: ${message}`,
        );
        setAppState(AppState.ERROR);
      }
    }
  }, [lastConfig, lastVideoBlob, lastVideoObject]);

  const renderError = (message: string, onTryAgain: () => void) => (
    <div className="text-center bg-red-900/20 border border-red-500 p-8 rounded-lg">
      <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
      <p className="text-red-300">{message}</p>
      <button
        onClick={onTryAgain}
        className="mt-6 px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
        Try Again
      </button>
    </div>
  );

  const renderVideoWorkflow = () => {
    if (appState === AppState.IDLE) {
      return (
        <>
          <div className="flex-grow flex items-center justify-center">
            <div className="relative text-center">
              <h2 className="text-3xl text-gray-600">
                Type in the prompt box to start
              </h2>
              <CurvedArrowDownIcon className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-24 h-24 text-gray-700 opacity-60" />
            </div>
          </div>
          <div className="pb-4">
            <PromptForm
              onGenerate={handleGenerateVideo}
              initialValues={initialFormValues}
            />
          </div>
        </>
      );
    }
    return (
      <div className="flex-grow flex items-center justify-center">
        {appState === AppState.LOADING && <LoadingIndicator />}
        {appState === AppState.SUCCESS && videoUrl && (
          <VideoResult
            videoUrl={videoUrl}
            onRetry={handleRetryVideo}
            onNewVideo={handleNewVideo}
            onExtend={handleExtend}
            canExtend={lastConfig?.resolution === Resolution.P720}
          />
        )}
        {appState === AppState.SUCCESS &&
          !videoUrl &&
          renderError(
            'Video generated, but URL is missing. Please try again.',
            handleTryAgainFromVideoError,
          )}
        {appState === AppState.ERROR &&
          errorMessage &&
          renderError(errorMessage, handleTryAgainFromVideoError)}
      </div>
    );
  };

  const renderAudioWorkflow = () => {
    if (audioAppState === AppState.IDLE) {
      return (
        <div className="flex-grow flex items-center justify-center">
          <AudioPromptForm onGenerate={handleGenerateAudio} />
        </div>
      );
    }
    return (
      <div className="flex-grow flex items-center justify-center">
        {audioAppState === AppState.LOADING && (
          <LoadingIndicator />
        )}
        {audioAppState === AppState.SUCCESS && audioUrl && (
          <AudioResult audioUrl={audioUrl} onNewAudio={handleNewAudio} />
        )}
        {audioAppState === AppState.ERROR &&
          audioErrorMessage &&
          renderError(audioErrorMessage, handleTryAgainFromAudioError)}
      </div>
    );
  };

  return (
    <div className="h-screen bg-black text-gray-200 flex flex-col font-sans overflow-hidden">
      {showApiKeyDialog && (
        <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />
      )}
      <header className="py-6 flex justify-center items-center px-8 relative z-10">
        <h1 className="text-5xl font-semibold tracking-wide text-center bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Veo Studio
        </h1>
      </header>
      <main className="w-full max-w-4xl mx-auto flex-grow flex flex-col p-4">
        <div className="flex justify-center items-center gap-2 sm:gap-4 mb-6">
          <button
            onClick={() => setActiveTool('video')}
            className={`flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-300 ${
              activeTool === 'video'
                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}>
            <VideoIcon className="w-6 h-6" />
            <span>Video Generation</span>
          </button>
          <button
            onClick={() => setActiveTool('audio')}
            className={`flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-300 ${
              activeTool === 'audio'
                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}>
            <AudioIcon className="w-6 h-6" />
            <span>Audio Generation</span>
          </button>
        </div>

        {activeTool === 'video' ? renderVideoWorkflow() : renderAudioWorkflow()}
      </main>
    </div>
  );
};

export default App;
