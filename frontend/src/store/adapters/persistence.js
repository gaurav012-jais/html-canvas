import * as localStorageAdapter from './localStorageAdapter'

export const persistence = {
  listProjects: () => localStorageAdapter.listProjects(),
  saveProjects: (projects, immediate) => localStorageAdapter.saveProjects(projects, immediate),
  loadTheme: () => localStorageAdapter.loadTheme(),
  saveTheme: (theme) => localStorageAdapter.saveTheme(theme),
}

const SETTINGS_KEY = 'templatecraft_settings'

export function setupSettingsPersistence(store) {
  store.subscribe((state, prevState) => {
    if (state.dateFormat !== prevState.dateFormat || state.timezone !== prevState.timezone) {
      try {
        const data = localStorage.getItem(SETTINGS_KEY)
        const settings = data ? JSON.parse(data) : {}
        settings.dateFormat = state.dateFormat
        settings.timezone = state.timezone
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      } catch (err) {
        console.warn('Failed to save settings to localStorage:', err)
      }
    }
  })
}
