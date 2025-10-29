/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useRef, useState} from 'react';
import {GenerateAudioParams, PrebuiltVoice} from '../types';
import {ArrowRightIcon, AudioIcon, ChevronDownIcon} from './icons';

const CustomSelect: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({label, value, onChange, icon, children}) => (
  <div>
    <label className="text-xs block mb-1.5 font-medium text-gray-400">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {icon}
      </div>
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-[#1f1f1f] border border-gray-600 rounded-lg pl-10 pr-8 py-2.5 appearance-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
        {children}
      </select>
      <ChevronDownIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
    </div>
  </div>
);

interface AudioPromptFormProps {
  onGenerate: (params: GenerateAudioParams) => void;
}

const AudioPromptForm: React.FC<AudioPromptFormProps> = ({onGenerate}) => {
  const [prompt, setPrompt] = useState('');
  const [voice, setVoice] = useState<PrebuiltVoice>(PrebuiltVoice.ZEPHYR);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate({prompt, voice});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col gap-4 items-center">
      <div className="w-full max-w-2xl bg-[#1f1f1f] border border-gray-600 rounded-2xl p-4 shadow-lg focus-within:ring-2 focus-within:ring-indigo-500">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter text to generate speech..."
          className="w-full bg-transparent focus:outline-none resize-y text-base text-gray-200 placeholder-gray-500 min-h-24"
        />
      </div>
      <div className="w-full max-w-2xl flex items-end gap-4">
        <div className="flex-grow">
          <CustomSelect
            label="Voice"
            value={voice}
            onChange={(e) => setVoice(e.target.value as PrebuiltVoice)}
            icon={<AudioIcon className="w-5 h-5 text-gray-400" />}>
            {Object.values(PrebuiltVoice).map((voiceName) => (
              <option key={voiceName} value={voiceName}>
                {voiceName}
              </option>
            ))}
          </CustomSelect>
        </div>

        <button
          type="submit"
          disabled={!prompt.trim()}
          className="px-6 py-2.5 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2 text-white font-semibold">
          Generate Audio
          <ArrowRightIcon className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

export default AudioPromptForm;
