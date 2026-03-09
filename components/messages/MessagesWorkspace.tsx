'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useUi } from '@/components/providers/UiProvider'

type Role = 'ADMIN' | 'SUPPLIER' | 'TRADER'
type RoleFilter = 'ALL' | Role

type CurrentUser = {
  id: string
  name: string
  role: Role
}

type ChatUser = {
  id: string
  name: string
  email?: string
  role: Role
  avatar?: string | null
}

type Conversation = {
  id: string
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  order: {
    id: string
    orderNumber: string
    status: string
  } | null
  participants: ChatUser[]
}

type ChatMessage = {
  id: string
  content: string
  attachments: string[]
  read: boolean
  createdAt: string
  sender: ChatUser
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

type MessagesWorkspaceProps = {
  currentUser: CurrentUser
}

function sortConversations(items: Conversation[]) {
  return [...items].sort((a, b) => {
    const aTs = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const bTs = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return bTs - aTs
  })
}

function roleLabel(role: Role, language: 'ar' | 'en') {
  if (role === 'ADMIN') return language === 'ar' ? 'مدير' : 'Admin'
  if (role === 'SUPPLIER') return language === 'ar' ? 'مورد' : 'Supplier'
  return language === 'ar' ? 'تاجر' : 'Trader'
}

function roleIcon(role: Role) {
  if (role === 'ADMIN') return ShieldCheckIcon
  if (role === 'SUPPLIER') return BuildingStorefrontIcon
  return ShoppingBagIcon
}

function roleBadgeClass(role: Role) {
  if (role === 'ADMIN') return 'bg-emerald-500/15 text-emerald-500'
  if (role === 'SUPPLIER') return 'bg-sky-500/15 text-sky-500'
  return 'bg-amber-500/15 text-amber-500'
}

function formatDateTime(value: string | null, language: 'ar' | 'en') {
  if (!value) return language === 'ar' ? 'بدون رسائل بعد' : 'No messages yet'
  return new Date(value).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  })
}

function conversationPeer(conversation: Conversation, currentUserId: string) {
  return conversation.participants.find((item) => item.id !== currentUserId) ?? conversation.participants[0] ?? null
}

export default function MessagesWorkspace({ currentUser }: MessagesWorkspaceProps) {
  const { language } = useUi()
  const isArabic = language === 'ar'

  const [sidebarTab, setSidebarTab] = useState<'conversations' | 'new'>('conversations')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [draftAttachments, setDraftAttachments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const [contactQuery, setContactQuery] = useState('')
  const [contactRole, setContactRole] = useState<RoleFilter>('ALL')
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contacts, setContacts] = useState<ChatUser[]>([])
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [initialMessage, setInitialMessage] = useState('')

  const endRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const selectedPeer = useMemo(
    () => (selectedConversation ? conversationPeer(selectedConversation, currentUser.id) : null),
    [selectedConversation, currentUser.id],
  )

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations],
  )

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/conversations', {
        cache: 'no-store',
        headers: { 'x-app-language': language },
      })
      const result = (await response.json()) as ApiResponse<Conversation[]>
      if (!response.ok || !result.success) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(result.error ?? (isArabic ? 'تعذر تحميل المحادثات' : 'Failed to load conversations'))
      }

      const items = sortConversations(result.data ?? [])
      setConversations(items)
      setSelectedConversationId((prev) => {
        if (items.length === 0) return null
        if (!prev) return items[0].id
        return items.some((item) => item.id === prev) ? prev : items[0].id
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isArabic ? 'فشل تحميل المحادثات' : 'Failed to load conversations')
    } finally {
      setConversationsLoading(false)
    }
  }, [isArabic, language])

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setMessagesLoading(true)
      try {
        const response = await fetch(`/api/messages/conversations/${conversationId}/messages?limit=200`, {
          cache: 'no-store',
          headers: { 'x-app-language': language },
        })
        const result = (await response.json()) as ApiResponse<ChatMessage[]>
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? (isArabic ? 'تعذر تحميل الرسائل' : 'Failed to load messages'))
        }

        setMessages(result.data ?? [])
        setConversations((prev) =>
          prev.map((item) => (item.id === conversationId ? { ...item, unreadCount: 0 } : item)),
        )
      } catch (error) {
        toast.error(error instanceof Error ? error.message : isArabic ? 'فشل تحميل الرسائل' : 'Failed to load messages')
      } finally {
        setMessagesLoading(false)
      }
    },
    [isArabic, language],
  )

  const loadContacts = useCallback(async () => {
    setContactsLoading(true)
    try {
      const queryParam = encodeURIComponent(contactQuery.trim())
      const roleParam = contactRole === 'ALL' ? '' : `&role=${contactRole}`
      const response = await fetch(`/api/messages/users?query=${queryParam}${roleParam}&limit=60`, {
        cache: 'no-store',
        headers: { 'x-app-language': language },
      })
      const result = (await response.json()) as ApiResponse<ChatUser[]>
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? (isArabic ? 'تعذر تحميل المستخدمين' : 'Failed to load users'))
      }
      setContacts(result.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isArabic ? 'فشل تحميل المستخدمين' : 'Failed to load users')
    } finally {
      setContactsLoading(false)
    }
  }, [contactQuery, contactRole, isArabic, language])

  useEffect(() => {
    void loadConversations()
    const interval = setInterval(loadConversations, 15000)
    return () => clearInterval(interval)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      return
    }
    void loadMessages(selectedConversationId)
    const interval = setInterval(() => {
      void loadMessages(selectedConversationId)
    }, 6000)
    return () => clearInterval(interval)
  }, [selectedConversationId, loadMessages])

  useEffect(() => {
    if (sidebarTab !== 'new') return
    const timer = setTimeout(() => {
      void loadContacts()
    }, 250)
    return () => clearTimeout(timer)
  }, [sidebarTab, loadContacts])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const createConversation = async (participantUserId: string) => {
    setCreatingConversation(true)
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({
          participantUserId,
          initialMessage: initialMessage.trim() || undefined,
        }),
      })
      const result = (await response.json()) as ApiResponse<{ id: string }>
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error ?? (isArabic ? 'تعذر إنشاء المحادثة' : 'Failed to create conversation'))
      }

      setInitialMessage('')
      setSidebarTab('conversations')
      await loadConversations()
      setSelectedConversationId(result.data.id)
      toast.success(isArabic ? 'تم إنشاء المحادثة' : 'Conversation created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isArabic ? 'فشل إنشاء المحادثة' : 'Failed to create conversation')
    } finally {
      setCreatingConversation(false)
    }
  }

  const sendMessage = async () => {
    if (!selectedConversationId) {
      toast.error(isArabic ? 'اختر محادثة أولاً' : 'Select a conversation first')
      return
    }

    const content = composerText.trim()
    if (!content) {
      toast.error(isArabic ? 'اكتب رسالة قبل الإرسال' : 'Type a message before sending')
      return
    }

    setSending(true)
    try {
      const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': language,
        },
        body: JSON.stringify({
          content,
          attachments: draftAttachments,
        }),
      })
      const result = (await response.json()) as ApiResponse<ChatMessage>
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error ?? (isArabic ? 'تعذر إرسال الرسالة' : 'Failed to send message'))
      }

      const created = result.data
      setComposerText('')
      setDraftAttachments([])
      setMessages((prev) => [...prev, created])
      setConversations((prev) =>
        sortConversations(
          prev.map((item) =>
            item.id === selectedConversationId
              ? { ...item, lastMessage: created.content, lastMessageAt: created.createdAt }
              : item,
          ),
        ),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isArabic ? 'فشل إرسال الرسالة' : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.set('file', file)
    const response = await fetch('/api/uploads/chat', {
      method: 'POST',
      headers: { 'x-app-language': language },
      body: formData,
    })
    const result = (await response.json()) as ApiResponse<{ url: string }>
    if (!response.ok || !result.success || !result.data?.url) {
      throw new Error(result.error ?? (isArabic ? 'فشل رفع الملف' : 'Upload failed'))
    }
    return result.data.url
  }

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    event.target.value = ''
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadFile(file)
        uploaded.push(url)
      }
      setDraftAttachments((prev) => [...prev, ...uploaded].slice(0, 10))
      toast.success(isArabic ? 'تم رفع المرفقات' : 'Attachments uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isArabic ? 'فشل رفع المرفقات' : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-app bg-surface p-5 shadow-sm">
        <div className="pointer-events-none absolute -top-16 end-0 h-44 w-44 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_18%,transparent)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 start-0 h-44 w-44 rounded-full bg-[color-mix(in_oklab,var(--app-primary)_12%,transparent)] blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-app px-3 py-1 text-xs text-muted">
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              {isArabic ? 'مركز المراسلات الموحد' : 'Unified Message Center'}
            </p>
            <h1 className="mt-3 text-2xl font-bold text-app md:text-3xl">
              {isArabic ? 'تواصل مباشر بين الأدمن والتاجر والمورد' : 'Direct communication across admins, traders, and suppliers'}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isArabic
                ? 'محادثات فورية مع إشعارات وتنظيم حسب الأدوار لسهولة متابعة أي عملية.'
                : 'Real-time style conversations with role-aware context and quick follow-up.'}
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-2">
            <div className="rounded-2xl border border-app bg-[color-mix(in_oklab,var(--app-primary)_10%,transparent)] px-3 py-2">
              <p className="text-xs text-muted">{isArabic ? 'المحادثات' : 'Conversations'}</p>
              <p className="text-xl font-semibold text-app">{conversations.length}</p>
            </div>
            <div className="rounded-2xl border border-app bg-[color-mix(in_oklab,var(--app-primary)_10%,transparent)] px-3 py-2">
              <p className="text-xs text-muted">{isArabic ? 'غير المقروء' : 'Unread'}</p>
              <p className="text-xl font-semibold text-app">{unreadTotal}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="card-pro rounded-2xl p-3">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl px-3 py-2 text-sm transition ${
                sidebarTab === 'conversations'
                  ? 'bg-[color-mix(in_oklab,var(--app-primary)_16%,transparent)] text-app'
                  : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
              }`}
              onClick={() => setSidebarTab('conversations')}
            >
              {isArabic ? 'المحادثات' : 'Conversations'}
            </button>
            <button
              className={`rounded-xl px-3 py-2 text-sm transition ${
                sidebarTab === 'new'
                  ? 'bg-[color-mix(in_oklab,var(--app-primary)_16%,transparent)] text-app'
                  : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
              }`}
              onClick={() => setSidebarTab('new')}
            >
              {isArabic ? 'محادثة جديدة' : 'New chat'}
            </button>
          </div>

          {sidebarTab === 'conversations' ? (
            <div className="space-y-2">
              {conversationsLoading ? (
                <p className="px-2 py-4 text-sm text-muted">{isArabic ? 'جاري تحميل المحادثات...' : 'Loading conversations...'}</p>
              ) : conversations.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted">{isArabic ? 'لا توجد محادثات بعد' : 'No conversations yet'}</p>
              ) : (
                conversations.map((item) => {
                  const peer = conversationPeer(item, currentUser.id)
                  const Icon = roleIcon(peer?.role ?? 'TRADER')
                  const active = selectedConversationId === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedConversationId(item.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-start transition ${
                        active
                          ? 'border-[color:var(--app-primary)] bg-[color-mix(in_oklab,var(--app-primary)_12%,transparent)]'
                          : 'border-app hover:bg-[color-mix(in_oklab,var(--app-primary)_6%,transparent)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-app">
                            {peer?.name ?? (isArabic ? 'محادثة' : 'Conversation')}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">{formatDateTime(item.lastMessageAt, language)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.unreadCount > 0 ? (
                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                              {item.unreadCount}
                            </span>
                          ) : null}
                          <Icon className="h-4 w-4 text-muted" />
                        </div>
                      </div>
                      <p className="mt-2 truncate text-xs text-muted">
                        {item.lastMessage ?? (isArabic ? 'ابدأ المحادثة الآن' : 'Start the conversation now')}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {peer ? (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${roleBadgeClass(peer.role)}`}>
                            {roleLabel(peer.role, language)}
                          </span>
                        ) : null}
                        {item.order ? (
                          <span className="rounded-full bg-[color-mix(in_oklab,var(--app-primary)_10%,transparent)] px-2 py-0.5 text-[11px] text-app">
                            {isArabic ? 'طلب' : 'Order'} #{item.order.orderNumber}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-muted" />
                <input
                  value={contactQuery}
                  onChange={(event) => setContactQuery(event.target.value)}
                  className="input-pro !ps-9"
                  placeholder={isArabic ? 'ابحث بالاسم أو البريد' : 'Search by name or email'}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['ALL', 'ADMIN', 'SUPPLIER', 'TRADER'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setContactRole(role)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      contactRole === role
                        ? 'bg-[color-mix(in_oklab,var(--app-primary)_16%,transparent)] text-app'
                        : 'border border-app text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)]'
                    }`}
                  >
                    {role === 'ALL' ? (isArabic ? 'الكل' : 'All') : roleLabel(role, language)}
                  </button>
                ))}
              </div>
              <textarea
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                rows={2}
                maxLength={4000}
                className="input-pro resize-none"
                placeholder={isArabic ? 'رسالة أولى اختيارية...' : 'Optional first message...'}
              />
              <div className="max-h-[420px] space-y-2 overflow-auto">
                {contactsLoading ? (
                  <p className="px-2 py-4 text-sm text-muted">{isArabic ? 'جاري تحميل المستخدمين...' : 'Loading users...'}</p>
                ) : contacts.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted">{isArabic ? 'لا يوجد نتائج' : 'No users found'}</p>
                ) : (
                  contacts.map((contact) => {
                    const Icon = roleIcon(contact.role)
                    return (
                      <div key={contact.id} className="rounded-xl border border-app p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-app">{contact.name}</p>
                            <p className="truncate text-xs text-muted" dir="ltr">{contact.email}</p>
                          </div>
                          <Icon className="h-4 w-4 text-muted" />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${roleBadgeClass(contact.role)}`}>
                            {roleLabel(contact.role, language)}
                          </span>
                          <button
                            onClick={() => void createConversation(contact.id)}
                            disabled={creatingConversation}
                            className="btn-primary !rounded-lg !px-2.5 !py-1.5 text-xs disabled:opacity-60"
                          >
                            {isArabic ? 'بدء محادثة' : 'Start chat'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </aside>

        <div className="card-pro flex min-h-[620px] flex-col rounded-2xl p-3">
          {selectedConversation ? (
            <>
              <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app bg-[color-mix(in_oklab,var(--app-primary)_7%,transparent)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="h-8 w-8 text-muted" />
                  <div>
                    <p className="font-semibold text-app">
                      {selectedPeer?.name ?? (isArabic ? 'محادثة' : 'Conversation')}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      {selectedPeer ? (
                        <span className={`rounded-full px-2 py-0.5 ${roleBadgeClass(selectedPeer.role)}`}>
                          {roleLabel(selectedPeer.role, language)}
                        </span>
                      ) : null}
                      {selectedConversation.order ? (
                        <span className="rounded-full bg-[color-mix(in_oklab,var(--app-primary)_12%,transparent)] px-2 py-0.5 text-app">
                          {isArabic ? 'مرتبط بطلب' : 'Linked to order'} #{selectedConversation.order.orderNumber}
                        </span>
                      ) : (
                        <span className="text-muted">{isArabic ? 'محادثة عامة' : 'General conversation'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  {isArabic ? 'آخر تحديث:' : 'Last update:'} {formatDateTime(selectedConversation.lastMessageAt, language)}
                </p>
              </header>

              <div className="message-scroll flex-1 space-y-3 overflow-auto rounded-xl border border-app bg-[color-mix(in_oklab,var(--app-surface)_92%,transparent)] p-3">
                {messagesLoading ? (
                  <p className="text-sm text-muted">{isArabic ? 'جاري تحميل الرسائل...' : 'Loading messages...'}</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted">{isArabic ? 'ابدأ الرسالة الأولى الآن.' : 'Send the first message now.'}</p>
                ) : (
                  messages.map((message) => {
                    const own = message.sender.id === currentUser.id
                    return (
                      <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                            own
                              ? 'bg-[linear-gradient(135deg,var(--app-primary),var(--app-primary-strong))] text-white'
                              : 'border border-app bg-surface text-app'
                          }`}
                        >
                          {!own ? (
                            <p className="mb-1 text-[11px] font-semibold text-muted">
                              {message.sender.name} | {roleLabel(message.sender.role, language)}
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                          {message.attachments.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`rounded-lg px-2 py-1 text-xs underline ${
                                    own ? 'bg-white/15 text-white' : 'bg-[color-mix(in_oklab,var(--app-primary)_10%,transparent)] text-app'
                                  }`}
                                >
                                  {isArabic ? 'مرفق' : 'Attachment'}
                                </a>
                              ))}
                            </div>
                          ) : null}
                          <p className={`mt-1 text-[10px] ${own ? 'text-white/80' : 'text-muted'}`}>
                            {formatDateTime(message.createdAt, language)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={endRef} />
              </div>

              <footer className="mt-3 space-y-2">
                {draftAttachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {draftAttachments.map((url) => (
                      <span
                        key={url}
                        className="inline-flex items-center gap-1 rounded-full border border-app bg-surface px-2 py-1 text-xs text-app"
                      >
                        {isArabic ? 'مرفق جاهز' : 'Attachment ready'}
                        <button
                          onClick={() => setDraftAttachments((prev) => prev.filter((item) => item !== url))}
                          className="text-muted hover:text-app"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <textarea
                    value={composerText}
                    onChange={(event) => setComposerText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                    rows={2}
                    maxLength={4000}
                    className="input-pro min-h-[72px] resize-none"
                    placeholder={isArabic ? 'اكتب رسالتك هنا...' : 'Write your message...'}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="btn-secondary !h-10 !w-10 !rounded-xl !p-0 disabled:opacity-60"
                      aria-label={isArabic ? 'رفع ملف' : 'Upload file'}
                    >
                      <PaperClipIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void sendMessage()}
                      disabled={sending || uploading}
                      className="btn-primary !h-10 !w-10 !rounded-xl !p-0 disabled:opacity-60"
                      aria-label={isArabic ? 'إرسال' : 'Send'}
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleFileInput(event)}
                />
                <p className="text-xs text-muted">
                  {uploading
                    ? isArabic
                      ? 'يتم رفع الملفات...'
                      : 'Uploading files...'
                    : isArabic
                      ? 'Enter للإرسال و Shift+Enter لسطر جديد. يمكنك رفع صور/ملفات حتى 10MB.'
                      : 'Press Enter to send and Shift+Enter for a new line. Uploads support up to 10MB.'}
                </p>
              </footer>
            </>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-app text-center">
              <ChatBubbleLeftRightIcon className="h-10 w-10 text-muted" />
              <p className="mt-3 text-base font-semibold text-app">
                {isArabic ? 'لا توجد محادثة محددة' : 'No conversation selected'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {isArabic ? 'اختر محادثة من القائمة أو ابدأ محادثة جديدة.' : 'Pick a conversation from the list or start a new one.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}


