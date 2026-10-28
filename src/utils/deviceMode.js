import { getDevice } from '@whiskeysockets/baileys'

export function applyDeviceMode(state, message) {
  const device = message.key?.id ? getDevice(message.key.id) : 'unknown'
  state.lastPredictedDevice = device
  if (['desktop','mobile'].includes(state.uiPreference)) {
    state.uiMode = state.uiPreference
  } else if (device === 'desktop' || device === 'web') {
    state.uiMode = 'desktop'
  } else if (device === 'android' || device === 'ios') {
    state.uiMode = 'mobile'
  }
  // Unknown IDs retain the last mode; initial unknown messages use the default native card.
  return state
}
