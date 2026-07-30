import { useEffect, useState } from 'react'

const isElectron = typeof window !== 'undefined' && window.api

export default function UpdateNotifier() {
  const [update, setUpdate]     = useState(null)   // { version, releaseNotes }
  const [progress, setProgress] = useState(null)   // { percent }
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError]       = useState(null)
  const [visible, setVisible]   = useState(false)

  useEffect(() => {
    if (!isElectron || !window.api?.updater) return

    window.api.updater.onAvailable((data) => {
      setUpdate(data)
      setVisible(true)
    })

    window.api.updater.onProgress((data) => {
      setProgress(data)
      setVisible(true)
    })

    window.api.updater.onDownloaded((data) => {
      setProgress(null)
      setDownloaded(true)
      setVisible(true)
    })

    window.api.updater.onError((data) => {
      setError(data.message)
      setTimeout(() => setError(null), 5000)
    })
  }, [])

  if (!visible && !error) return null

  return (
    <div className="fixed bottom-4 right-4 z-[999] w-80 space-y-2">
      {/* Update Available */}
      {update && !progress && !downloaded && (
        <div className="bg-[#003c90] text-white rounded-xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-blue-200 shrink-0">system_update</span>
            <div className="flex-1">
              <p className="font-bold text-[13px]">Update Available — v{update.version}</p>
              <p className="text-[11px] text-blue-200 mt-0.5">New version ready to download</p>
            </div>
            <button onClick={() => setVisible(false)} className="text-blue-300 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => window.api.updater.download()}
              className="flex-1 py-1.5 bg-white text-[#003c90] text-[12px] font-bold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Download Now
            </button>
            <button
              onClick={() => setVisible(false)}
              className="px-3 py-1.5 border border-blue-400 text-[12px] rounded-lg hover:bg-blue-800 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Downloading Progress */}
      {progress && (
        <div className="bg-white border border-[#c3c6d5] rounded-xl shadow-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-[22px] text-[#003c90] animate-spin">downloading</span>
            <div>
              <p className="font-bold text-[13px] text-[#191c1e]">Downloading Update...</p>
              <p className="text-[11px] text-[#737784]">{progress.percent}% complete</p>
            </div>
          </div>
          <div className="w-full bg-[#eceef0] rounded-full h-2">
            <div
              className="bg-[#003c90] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-[10px] text-[#737784] mt-1.5">
            {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
            {' '}• {formatBytes(progress.speed)}/s
          </p>
        </div>
      )}

      {/* Download Complete */}
      {downloaded && (
        <div className="bg-green-50 border border-green-200 rounded-xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-green-600 shrink-0">check_circle</span>
            <div className="flex-1">
              <p className="font-bold text-[13px] text-green-800">Update Downloaded!</p>
              <p className="text-[11px] text-green-600 mt-0.5">Restart to apply the update</p>
            </div>
          </div>
          <button
            onClick={() => window.api.updater.install()}
            className="w-full mt-3 py-2 bg-green-600 text-white text-[12px] font-bold rounded-lg hover:bg-green-700 transition-colors"
          >
            Restart & Install
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl shadow-xl p-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">error</span>
          <p className="text-[12px] text-[#ba1a1a] flex-1">Update error: {error}</p>
          <button onClick={() => setError(null)}>
            <span className="material-symbols-outlined text-[16px] text-[#737784]">close</span>
          </button>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
