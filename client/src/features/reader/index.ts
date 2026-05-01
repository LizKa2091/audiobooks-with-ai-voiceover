export type {
  ReaderAudioSource,
  ReaderBundle,
  ReaderSyncDocument,
  SentenceBlock,
  WordToken,
} from '@/features/reader/types'
export { AudioDock } from '@/features/reader/components/AudioDock'
export { ReaderShell } from '@/features/reader/components/ReaderShell'
export { TranscriptView } from '@/features/reader/components/TranscriptView'
export { useReaderPlaybackState } from '@/features/reader/hooks/useReaderPlaybackState'
export { fetchReaderContentStub } from '@/features/reader/stubs/fetchReaderContentStub'
export { findActiveWordId } from '@/features/reader/lib/activeWordAt'
