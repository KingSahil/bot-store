import { jidNormalizedUser, proto, generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys'
import { resolveLidToPn } from './resolveLid.js'

export const messageStore = new Map()

export function storeMessage(id, message) {
  if (!id || !message) return
  messageStore.set(id, message)
  if (messageStore.size > 1000) {
    const firstKey = messageStore.keys().next().value
    messageStore.delete(firstKey)
  }
}

export const botSentMessageIds = new Set()

export function wrapSendMessageGlobally(sock) {
  const originalSendMessage = sock.sendMessage.bind(sock)

  sock.sendMessage = async (jid, content, options = {}) => {
    // Always resolve target to the actual phone number JID
    const targetJid = resolveLidToPn(jid)
    try {
      await sock.sendPresenceUpdate('composing', targetJid).catch(() => {})
      await new Promise(r => setTimeout(r, 400))

      // Check if this is an interactive message (nativeFlow buttons or legacy buttons)
      const hasInteractiveButtons = Array.isArray(content?.interactiveButtons) && content.interactiveButtons.length > 0
      const hasLegacyButtons = Array.isArray(content?.buttons) && content.buttons.length > 0

      if (hasInteractiveButtons || hasLegacyButtons) {
        try {
          const buttons = hasInteractiveButtons
            ? content.interactiveButtons
            : content.buttons.map(b => ({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: b.buttonText?.displayText || 'Select',
                  id: b.buttonId || 'btn',
                }),
              }))

          let mediaAttachment = null
          if (content.image) {
            mediaAttachment = await prepareWAMessageMedia(
              { image: content.image },
              { upload: sock.waUploadToServer }
            )
          } else if (content.video) {
            mediaAttachment = await prepareWAMessageMedia(
              { video: content.video },
              { upload: sock.waUploadToServer }
            )
          }

          const header = {
            title: content.title || '',
            hasMediaAttachment: !!mediaAttachment?.imageMessage || !!mediaAttachment?.videoMessage,
            ...(mediaAttachment?.imageMessage ? { imageMessage: mediaAttachment.imageMessage } : {}),
            ...(mediaAttachment?.videoMessage ? { videoMessage: mediaAttachment.videoMessage } : {}),
          }

          const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
            header,
            body: { text: content.caption || content.text || '' },
            footer: { text: content.footer || '' },
            nativeFlowMessage: {
              buttons,
            },
          })

          const messagePayload = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2,
                },
                interactiveMessage,
              },
            },
          }

          const msg = generateWAMessageFromContent(targetJid, messagePayload, {
            userJid: sock.user?.id,
            quoted: options?.quoted,
          })

          // Crucial: WhatsApp MD protocol requires the biz native_flow node for interactive buttons
          const additionalNodes = [
            {
              tag: 'biz',
              attrs: {},
              content: [
                {
                  tag: 'interactive',
                  attrs: {
                    type: 'native_flow',
                    v: '1',
                  },
                  content: [
                    {
                      tag: 'native_flow',
                      attrs: { v: '9', name: 'mixed' },
                    },
                  ],
                },
              ],
            },
          ]

          await sock.relayMessage(targetJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes,
          })

          if (msg.key?.id) {
            botSentMessageIds.add(msg.key.id)
            storeMessage(msg.key.id, msg.message)
          }

          await sock.sendPresenceUpdate('paused', targetJid).catch(() => {})
          return msg
        } catch (interactiveErr) {
          console.warn('[Interactive Send Warning] Falling back to standard message:', interactiveErr.message)
          // Fall through to originalSendMessage
        }
      }

      const result = await originalSendMessage(targetJid, content, options)

      if (result?.key?.id) {
        botSentMessageIds.add(result.key.id)
        if (result?.message) {
          storeMessage(result.key.id, result.message)
        }
        if (botSentMessageIds.size > 500) {
          const first = botSentMessageIds.values().next().value
          botSentMessageIds.delete(first)
        }
      }

      await sock.sendPresenceUpdate('paused', targetJid).catch(() => {})
      return result
    } catch (err) {
      console.error('[Global Typing Error]', err)
      const fallbackResult = await originalSendMessage(targetJid, content, options)
      if (fallbackResult?.key?.id) {
        botSentMessageIds.add(fallbackResult.key.id)
        if (fallbackResult?.message) {
          storeMessage(fallbackResult.key.id, fallbackResult.message)
        }
      }
      return fallbackResult
    }
  }
}
