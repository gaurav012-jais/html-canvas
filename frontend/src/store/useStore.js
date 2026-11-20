import { create } from 'zustand'
import { createCampaignSlice } from './slices/campaignSlice'
import { createPartnersSlice } from './slices/partnersSlice'
import { createUiSlice } from './slices/uiSlice'
import { setupSettingsPersistence } from './adapters/persistence'

const METRICS_KEY = 'templatecraft_metrics'
const defaultMetrics = {
  saveCount: 0,
  exports: 0,
  sessionTime: 0,
}

function getInitialMetrics() {
  try {
    const data = localStorage.getItem(METRICS_KEY)
    return data ? { ...defaultMetrics, ...JSON.parse(data) } : { ...defaultMetrics }
  } catch {
    return { ...defaultMetrics }
  }
}

const initialMetrics = getInitialMetrics()

const useStore = create((set, get) => ({
  ...createCampaignSlice(set, get),
  ...createPartnersSlice(set, get),
  ...createUiSlice(set, get),

  saveCount: initialMetrics.saveCount || 0,
  exports: initialMetrics.exports || 0,
  sessionTime: initialMetrics.sessionTime || 0,
}))

setupSettingsPersistence(useStore)

export default useStore
