import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Send, X } from 'lucide-react'
import { searchKnowledge } from '@/features/chatbot/lib/chatbotKnowledge'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  suggestions?: string[]
}

const INITIAL_SUGGESTIONS = [
  '¿Cómo escaneo una factura?',
  '¿Cómo funciona la fiscalidad?',
  '¿Cómo exportar a PDF?',
]

function formatMessageText(text: string) {
  return text.split('\n').map((line, i) => {
    let cleanLine = line

    // Parse list bullets (* or -)
    let isBullet = false
    if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      cleanLine = cleanLine.slice(2)
      isBullet = true
    }

    // Parse headers ### or ##
    if (cleanLine.startsWith('### ')) {
      return (
        <h4
          key={i}
          className="mt-2.5 mb-1 text-xs font-black tracking-wide text-accent-blue uppercase"
        >
          {cleanLine.slice(4)}
        </h4>
      )
    }
    if (cleanLine.startsWith('## ')) {
      return (
        <h4
          key={i}
          className="mt-2.5 mb-1 text-xs font-black tracking-wide text-accent-blue uppercase"
        >
          {cleanLine.slice(3)}
        </h4>
      )
    }

    // Parse bold text **abc** -> <strong>abc</strong>
    const parts = cleanLine.split(/\*\*([^*]+)\*\*/g)
    const content = parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return (
          <strong key={idx} className="font-extrabold text-white">
            {part}
          </strong>
        )
      }
      return part
    })

    if (isBullet) {
      return (
        <div key={i} className="mt-1 flex items-start gap-1.5 pl-1.5">
          <span className="mt-1 shrink-0 select-none text-[8px] text-accent-blue">•</span>
          <span className="text-xs leading-relaxed text-slate-300">{content}</span>
        </div>
      )
    }

    return (
      <p key={i} className="mt-1 min-h-[4px] text-xs leading-relaxed text-slate-300">
        {content}
      </p>
    )
  })
}

export function Chatbot() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: '¡Hola! Soy tu asistente de GFarma. ¿En qué módulo o funcionalidad tienes dudas hoy? Puedo ayudarte con las facturas, el escáner OCR, los gráficos de análisis, la fiscalidad o los trabajadores.',
      suggestions: INITIAL_SUGGESTIONS,
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  // Context-aware suggestion addition depending on current route
  useEffect(() => {
    if (!isOpen) return
    const path = location.pathname
    // Proactive help suggestion based on where the user is
    let prompt = ''
    let suggestion = ''
    if (path.includes('fiscalidad')) {
      prompt = 'Detecto que estás en Fiscalidad. '
      suggestion = '¿Cómo añado un impuesto personalizado?'
    } else if (path.includes('analisis')) {
      prompt = 'Detecto que estás en Análisis. '
      suggestion = '¿Cómo exporto los análisis a PDF?'
    } else if (path.includes('facturas')) {
      prompt = 'Detecto que estás en Facturas. '
      suggestion = '¿Cómo funciona el escaneo OCR?'
    } else if (path.includes('abonos')) {
      prompt = 'Detecto que estás en Abonos. '
      suggestion = '¿Qué es el balance neto?'
    } else if (path.includes('trabajadores')) {
      prompt = 'Detecto que estás en Trabajadores. '
      suggestion = '¿Dónde se ven los costes de personal?'
    }

    if (suggestion) {
      // Add proactive suggestion if not already present in last message suggestions
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (
          last &&
          last.sender === 'bot' &&
          last.suggestions &&
          !last.suggestions.includes(suggestion)
        ) {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              text: last.text.includes('Detecto que')
                ? last.text
                : `${prompt}${last.text}`,
              suggestions: [
                suggestion,
                ...last.suggestions.filter((s) => s !== suggestion),
              ],
            },
          ]
        }
        return prev
      })
    }
  }, [isOpen, location.pathname])

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return

    const userMessage: Message = {
      // eslint-disable-next-line react-hooks/purity
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate typing delay for AI feel
    setTimeout(() => {
      const searchResult = searchKnowledge(textToSend, location.pathname)
      const botResponse: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: searchResult.response,
        suggestions: searchResult.suggestions,
      }
      setMessages((prev) => [...prev, botResponse])
      setIsTyping(false)
    }, 800)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(input)
  }

  return (
    <>
      {/* Botón Flotante */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] border border-blue-400/20 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
        aria-label="Ayuda"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-300 rotate-0 group-hover:rotate-90" />
        ) : (
          <Bot className="h-6 w-6 transition-transform duration-300 hover:rotate-6" />
        )}
        {/* Pulsing indicator ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full border border-blue-500/40 animate-ping opacity-70 pointer-events-none" />
        )}
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[340px] sm:w-[380px] h-[480px] max-h-[calc(100vh-120px)] flex flex-col rounded-2xl border border-white/10 bg-[#090d16]/95 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 overflow-hidden glass-card transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Cabecera */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-500/20 to-indigo-600/10 px-4 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 text-accent-blue shadow-inner">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wide text-white uppercase">
                  Asistente GFarma
                </h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Soporte técnico online
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
              aria-label="Cerrar chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((m) => {
              const isUser = m.sender === 'user'
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[85%] shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none border border-blue-400/20'
                        : 'bg-white/5 border border-white/5 text-slate-300 rounded-bl-none'
                    }`}
                  >
                    {!isUser ? (
                      <div className="space-y-1">{formatMessageText(m.text)}</div>
                    ) : (
                      <p className="text-xs leading-relaxed">{m.text}</p>
                    )}
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/5 border border-white/5 px-4 py-3 rounded-bl-none text-slate-400">
                  <div className="flex gap-1.5 items-center h-3">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias de Conversación */}
          {messages.length > 0 && messages[messages.length - 1].suggestions && (
            <div className="flex gap-1.5 overflow-x-auto py-2 px-4 scrollbar-none shrink-0 border-t border-white/5 bg-slate-950/20">
              {messages[messages.length - 1].suggestions?.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSendMessage(s)}
                  className="shrink-0 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-blue-400/20 active:scale-95 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Formulario de Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-white/5 bg-slate-950/40 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu duda sobre GFarma..."
              className="flex-1 bg-transparent border-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0 px-2 py-2"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="rounded-xl p-2 text-accent-blue transition-all hover:bg-white/5 disabled:opacity-40 cursor-pointer shrink-0"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
