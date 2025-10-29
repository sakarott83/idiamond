/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {PlusIcon} from './icons';

interface AudioResultProps {
  audioUrl: string;
  onNewAudio: () => void;
}

const AudioResult: React.FC<AudioResultProps> = ({audioUrl, onNewAudio}) => {
  return (
    <div className="w-full flex flex-col items-center gap-8 p-8 bg-gray-800/50 rounded-lg border border-gray-700 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-200">
        Your Audio is Ready!
      </h2>
      <div className="w-full max-w-2xl">
        <audio src={audioUrl} controls autoPlay className="w-full" />
      </div>
      <button
        onClick={onNewAudio}
        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
        <PlusIcon className="w-5 h-5" />
        New Audio
      </button>
    </div>
  );
};

export default AudioResult;
