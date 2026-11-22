import { memo, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ScanSearch, Zap } from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import { firePostback, getPostback, runChecksubNow } from '../services/api/partners'
import useStore from '../store/useStore'
import { PostbackLifecycleCard } from './postbackDetail/components/PostbackLifecycleCard'
import { PostbackAttributionCard } from './postbackDetail/components/PostbackAttributionCard'
import { PostbackUrlResponseCard } from './postbackDetail/components/PostbackUrlResponseCard'
import { PostbackRelatedLogsCard } from './postbackDetail/components/PostbackRelatedLogsCard'

function PostbackDetailPage() {
  const { postbackId } = useParams()
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firing, setFiring] = useState(false)
  const [checksubing, setChecksubing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    return getPostback(postbackId)
      .then((res) => setData(res))
      .catch((err) => {
        setError(err?.message || 'Failed to load postback')
      })
  }, [postbackId])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      getPostback(postbackId)
        .then((res) => {
          if (!cancelled) setData(res)
        })
        .catch((err) => {
          if (!cancelled) setError(err?.message || 'Failed to load postback')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [postbackId])

  const fireVendorPostback = async () => {
    if (!data || firing) return
    const alreadySent = String(data.status || '').toLowerCase() === 'sent'
    const ok = window.confirm(
      alreadySent
        ? 'This postback was already sent to the vendor. Fire it again?'
        : 'Fire this vendor CPA postback now?',
    )
    if (!ok) return
    setFiring(true)
    try {
      const result = await firePostback(postbackId, { force: alreadySent })
      if (result?.skipped || result?.vendorSkipped) {
        addToast(result.reason || 'Postback was not sent', 'error')
      } else if (result?.success === false) {
        addToast(result.error || result.errorMessage || 'Vendor postback failed', 'error')
      } else {
        addToast('Vendor postback fired', 'success')
      }
      await load()
    } catch (err) {
      addToast(err?.message || 'Failed to fire postback', 'error')
    } finally {
      setFiring(false)
    }
  }

  const handleRunChecksub = async () => {
    if (!data || checksubing) return
    setChecksubing(true)
    try {
      const result = await runChecksubNow(postbackId)
      if (result?.error) {
        addToast(result.error || 'Checksub failed', 'error')
      } else {
        const outcome = result?.outcome || result?.delayed_checksub_outcome || '—'
        addToast(`Checksub done: ${outcome}`, 'success')
      }
      await load()
    } catch (err) {
      addToast(err?.message || 'Checksub failed', 'error')
    } finally {
      setChecksubing(false)
    }
  }

  const lastFiredUrl = [...(data?.relatedLogs || [])]
    .reverse()
    .find((l) => l.callType === 'vendor_postback' && l.requestUrl)?.requestUrl

  return (
    <AppShell
      actions={
        <div className="flex items-center gap-2">
          {data ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunChecksub}
                disabled={checksubing || loading}
                title="Run checksub now with partner"
              >
                <ScanSearch className={`w-4 h-4 ${checksubing ? 'animate-pulse text-indigo-500' : ''}`} />
                {checksubing ? 'Checking…' : 'Checksub Now'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={fireVendorPostback}
                disabled={firing || loading}
              >
                <Zap className={`w-4 h-4 ${firing ? 'animate-pulse' : ''}`} />
                {firing ? 'Firing…' : 'Fire postback'}
              </Button>
            </>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => navigate('/postbacks')}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      }
    >
      <div className="page-container space-y-6 max-w-4xl">
        <div className="page-header">
          <h1 className="page-header-title">Postback #{postbackId}</h1>
          <p className="page-header-description">
            Create → billing callback (or manual fire) → vendor CPA
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            {error}
          </div>
        ) : data ? (
          <>
            <PostbackLifecycleCard data={data} />
            <PostbackAttributionCard data={data} />
            <PostbackUrlResponseCard data={data} lastFiredUrl={lastFiredUrl} />
            <PostbackRelatedLogsCard logs={data.relatedLogs} />
          </>
        ) : null}
      </div>
    </AppShell>
  )
}

export default memo(PostbackDetailPage)
