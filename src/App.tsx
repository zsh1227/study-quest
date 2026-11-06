import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ArrowLeft,
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Square,
  TimerReset,
  Trophy,
} from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

type RentalState = {
  status: 'idle' | 'rented'
  podId: string | null
  location: string | null
  startedAt: number | null
  lastReturnAt: number | null
  lastRentalDuration: number
}

type FocusState = {
  subject: string
  task: string
  goalSec: number
  elapsedBase: number
  runningSince: number | null
  isRunning: boolean
}

type StudyRecord = {
  id: string
  date: string
  createdAt: number
  subject: string
  task: string
  seconds: number
  goalSec: number
  completed: boolean
  rating: number
  xp: number
}

type ReturnRecord = {
  id: string
  podId: string
  returnedAt: number
  rentalSeconds: number
}

type QuestData = {
  rental: RentalState
  focus: FocusState
  records: StudyRecord[]
  returns: ReturnRecord[]
}

type QuestContextValue = {
  data: QuestData
  setData: React.Dispatch<React.SetStateAction<QuestData>>
  patchFocus: (patch: Partial<FocusState>) => void
}

const STORAGE_KEY = 'study-quest:campus-adventure:v1'

const initialData: QuestData = {
  rental: {
    status: 'idle',
    podId: null,
    location: null,
    startedAt: null,
    lastReturnAt: null,
    lastRentalDuration: 0,
  },
  focus: {
    subject: 'English',
    task: '',
    goalSec: 25 * 60,
    elapsedBase: 0,
    runningSince: null,
    isRunning: false,
  },
  records: [],
  returns: [],
}

const QuestContext = createContext<QuestContextValue | null>(null)

function loadData(): QuestData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialData
    const parsed = JSON.parse(saved) as Partial<QuestData>
    return {
      rental: { ...initialData.rental, ...parsed.rental },
      focus: { ...initialData.focus, ...parsed.focus },
      records: Array.isArray(parsed.records) ? parsed.records : [],
      returns: Array.isArray(parsed.returns) ? parsed.returns : [],
    }
  } catch {
    return initialData
  }
}

function QuestProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<QuestData>(loadData)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const patchFocus = (patch: Partial<FocusState>) => {
    setData((current) => ({ ...current, focus: { ...current.focus, ...patch } }))
  }

  return <QuestContext.Provider value={{ data, setData, patchFocus }}>{children}</QuestContext.Provider>
}

function useQuest() {
  const context = useContext(QuestContext)
  if (!context) throw new Error('useQuest must be used inside QuestProvider')
  return context
}

function useClock(interval = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(timer)
  }, [interval])
  return now
}

function localDateKey(timestamp = Date.now()) {
  const value = new Date(timestamp)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function formatStudyTime(seconds: number) {
  if (seconds < 60) return `${Math.max(0, seconds)} sec`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours} hr`
}

function currentFocusElapsed(focus: FocusState, now = Date.now()) {
  const live = focus.isRunning && focus.runningSince ? Math.floor((now - focus.runningSince) / 1000) : 0
  return Math.max(0, focus.elapsedBase + live)
}

type SpriteState = 'open' | 'rented' | 'using' | 'folded'

function PodSprite({ state, size = 'md', label }: { state: SpriteState; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  return (
    <div
      className={`pod-sprite pod-${state} pod-${size}`}
      role="img"
      aria-label={label ?? `便携式学习舱：${state}`}
    />
  )
}

function StatusBar() {
  const now = useClock(30_000)
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  return (
    <div className="status-bar" aria-label="手机状态栏">
      <span>{time}</span>
      <span className="status-icons"><i /><i /><b>▰</b></span>
    </div>
  )
}

function BottomNav() {
  const items = [
    { to: '/', label: '首页', en: 'HOME', icon: Home },
    { to: '/rent', label: '租赁', en: 'RENT', icon: ScanLine },
    { to: '/focus', label: '学习', en: 'FOCUS', icon: TimerReset },
    { to: '/journey', label: '我的', en: 'ME', icon: Trophy },
  ]
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {items.map(({ to, label, en, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={19} strokeWidth={3} aria-hidden="true" />
          <span>{en}</span>
          <small>{label}</small>
        </NavLink>
      ))}
    </nav>
  )
}

function PageShell({ children, pageClass, nav = true }: { children: ReactNode; pageClass: string; nav?: boolean }) {
  return (
    <div className={`phone-screen ${pageClass}`}>
      <StatusBar />
      <main className="screen-content">{children}</main>
      {nav && <BottomNav />}
    </div>
  )
}

function PageTitle({ eyebrow, title, subtitle, back }: { eyebrow?: string; title: string; subtitle?: string; back?: string }) {
  return (
    <header className="page-title">
      {back && (
        <Link to={back} className="icon-button back-button" aria-label="返回">
          <ArrowLeft size={18} strokeWidth={4} />
        </Link>
      )}
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  )
}

function PixelButton({
  children,
  tone = 'yellow',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'yellow' | 'cyan' | 'orange' | 'cream' | 'dark' }) {
  return (
    <button {...props} className={`pixel-button pixel-button-${tone} ${className}`}>
      {children}
    </button>
  )
}

function EmptyState({ title, copy, action, to }: { title: string; copy: string; action: string; to: string }) {
  return (
    <div className="empty-state pixel-panel">
      <div className="empty-face" aria-hidden="true">•‿•</div>
      <h2>{title}</h2>
      <p>{copy}</p>
      <Link className="pixel-link pixel-link-yellow" to={to}>{action}</Link>
    </div>
  )
}

function HomePage() {
  const { data } = useQuest()
  const navigate = useNavigate()
  const today = localDateKey()
  const todaySeconds = data.records.filter((record) => record.date === today).reduce((sum, record) => sum + record.seconds, 0)
  const target = 25 * 60
  const progress = Math.min(100, Math.round((todaySeconds / target) * 100))
  const activeTask = data.focus.task || data.records.at(-1)?.task || '完成英语阅读训练'

  return (
    <PageShell pageClass="home-page">
      <div className="pixel-cloud cloud-a" /><div className="pixel-cloud cloud-b" />
      <div className="campus-silhouette" aria-hidden="true"><i /><i /><i /></div>
      <section className="home-hero">
        <span className="mini-flag">CAMPUS QUEST · LV.01</span>
        <h1 className="brand-title">STUDY<br /><em>QUEST</em></h1>
        <p className="brand-subtitle">YOUR STUDY ADVENTURE BEGINS!</p>
        <div className="hero-stage">
          <PodSprite state={data.rental.status === 'rented' ? 'rented' : 'open'} size="lg" />
          <div className="pixel-grass grass-left" /><div className="pixel-grass grass-right" />
          <span className="quest-spark spark-one">✦</span><span className="quest-spark spark-two">✦</span>
        </div>
      </section>

      <section className="home-panel pixel-panel">
        <div className="welcome-copy">
          <span className="pixel-avatar">SQ</span>
          <div><strong>今天准备开启怎样的学习冒险？</strong><small>选择一台移动学习舱，找到你的安静角落。</small></div>
        </div>
        <div className="goal-line"><span>TODAY · {formatStudyTime(todaySeconds)} / 25 min</span><b>{progress}%</b></div>
        <div className="pixel-progress"><i style={{ width: `${progress}%` }} /></div>
      </section>

      <PixelButton tone="yellow" className="primary-cta" onClick={() => navigate(data.rental.status === 'rented' ? '/pod' : '/rent')}>
        <Play size={18} fill="currentColor" />
        <span>{data.rental.status === 'rented' ? 'CONTINUE ADVENTURE' : 'START ADVENTURE'}<small>{data.rental.status === 'rented' ? '查看我的学习舱' : '开始租赁'}</small></span>
      </PixelButton>

      <Link className="mini-quest-card" to="/focus">
        <span className="quest-checkbox">!</span>
        <span><small>TODAY'S QUEST</small><b>{activeTask}</b></span>
        <ChevronRight size={18} strokeWidth={4} />
      </Link>
    </PageShell>
  )
}

const pods = [
  { id: 'POD 001', zone: '图书馆 2F · 北侧阅读区', distance: '18m away', status: 'Available', note: '靠窗 · 自然光 · 安静区' },
  { id: 'POD 014', zone: '图书馆 3F · 设计阅览区', distance: '42m away', status: 'Available', note: '插座附近 · 适合长时学习' },
  { id: 'POD 027', zone: '图书馆 1F · 东侧共享区', distance: '65m away', status: 'Available', note: '便于移动 · 靠近归还点' },
]

function ScanModal({
  mode,
  code,
  onClose,
  onConfirm,
}: {
  mode: 'rent' | 'return'
  code: string
  onClose: () => void
  onConfirm: () => void
}) {
  const [scanState, setScanState] = useState<'ready' | 'scanning' | 'found'>('ready')
  const [cameraState, setCameraState] = useState<'idle' | 'loading' | 'ready' | 'blocked'>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => stopCamera, [])

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('blocked')
      return
    }
    try {
      setCameraState('loading')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraState('ready')
    } catch {
      setCameraState('blocked')
    }
  }

  const demoScan = () => {
    setScanState('scanning')
    window.setTimeout(() => setScanState('found'), 900)
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="扫码演示">
      <section className="scan-modal pixel-panel">
        <button className="modal-close" onClick={close} aria-label="关闭">×</button>
        <span className="eyebrow">DEMO QR SCANNER</span>
        <h2>{mode === 'rent' ? 'SCAN POD CODE' : 'SCAN RETURN ZONE'}</h2>
        <p>演示模式 · 未接入真实校园设备后台</p>

        <div className={`scanner-window ${scanState}`}>
          {cameraState === 'ready' ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="qr-demo" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} />)}</div>}
          <span className="scan-corner corner-1" /><span className="scan-corner corner-2" />
          <span className="scan-corner corner-3" /><span className="scan-corner corner-4" />
          {scanState === 'scanning' && <span className="scan-beam" />}
          {scanState === 'found' && <div className="scan-found"><ShieldCheck size={36} /><b>CODE FOUND!</b><small>{code}</small></div>}
        </div>

        {cameraState === 'blocked' && <div className="inline-warning">无法使用摄像头，请使用下方模拟扫码。</div>}

        {scanState !== 'found' ? (
          <div className="scan-actions">
            <PixelButton tone="cream" onClick={openCamera} disabled={cameraState === 'loading'}><Camera size={16} />{cameraState === 'loading' ? 'OPENING…' : 'CAMERA PREVIEW'}</PixelButton>
            <PixelButton tone="yellow" onClick={demoScan} disabled={scanState === 'scanning'}><ScanLine size={17} />{scanState === 'scanning' ? 'SCANNING…' : 'USE DEMO CODE'}</PixelButton>
          </div>
        ) : (
          <PixelButton tone="yellow" className="wide-button" onClick={() => { stopCamera(); onConfirm() }}>
            <ShieldCheck size={18} />{mode === 'rent' ? 'CONFIRM RENTAL' : 'CONFIRM RETURN'}
          </PixelButton>
        )}
      </section>
    </div>
  )
}

function RentPage() {
  const { data, setData } = useQuest()
  const [selected, setSelected] = useState(0)
  const [scannerOpen, setScannerOpen] = useState(false)
  const navigate = useNavigate()
  const pod = pods[selected]

  const confirmRental = () => {
    setData((current) => ({
      ...current,
      rental: {
        ...current.rental,
        status: 'rented',
        podId: pod.id,
        location: pod.zone,
        startedAt: Date.now(),
      },
    }))
    setScannerOpen(false)
    navigate('/pod')
  }

  return (
    <PageShell pageClass="rent-page">
      <div className="rent-grid-bg" />
      <PageTitle eyebrow="EQUIPMENT SELECT" title="CHOOSE YOUR POD" subtitle="选择你的学习舱" />

      {data.rental.status === 'rented' && (
        <button className="active-rental-banner" onClick={() => navigate('/pod')}>
          <span>●</span> {data.rental.podId} 正在使用 <ChevronRight size={16} />
        </button>
      )}

      <section className="pod-carousel" aria-label="学习舱选择">
        <button className="carousel-arrow left" onClick={() => setSelected((selected + pods.length - 1) % pods.length)} aria-label="上一台"><ChevronLeft /></button>
        <div className="equipment-card pixel-panel">
          <div className="equipment-badge">{pod.status.toUpperCase()}</div>
          <div className="equipment-sprite"><PodSprite state="open" size="md" /></div>
          <div className="equipment-name"><span>{String(selected + 1).padStart(2, '0')} / {String(pods.length).padStart(2, '0')}</span><h2>{pod.id}</h2></div>
        </div>
        <button className="carousel-arrow right" onClick={() => setSelected((selected + 1) % pods.length)} aria-label="下一台"><ChevronRight /></button>
      </section>

      <div className="carousel-dots">{pods.map((item, index) => <button aria-label={`选择 ${item.id}`} key={item.id} onClick={() => setSelected(index)} className={index === selected ? 'active' : ''} />)}</div>

      <section className="pod-info pixel-panel">
        <div><MapPin size={18} /><span><b>{pod.zone}</b><small>{pod.distance}</small></span></div>
        <div><Sparkles size={18} /><span><b>{pod.note}</b><small>可自由移动至允许使用区域</small></span></div>
      </section>

      <div className="rent-note"><span>i</span><p>扫码将绑定设备。租赁期间请勿阻挡通道与紧急出口。</p></div>

      {data.rental.status === 'rented' ? (
        <PixelButton tone="cyan" className="primary-cta" onClick={() => navigate('/pod')}><span>VIEW MY POD<small>查看当前学习舱</small></span><ChevronRight size={20} /></PixelButton>
      ) : (
        <PixelButton tone="yellow" className="primary-cta" onClick={() => setScannerOpen(true)}><ScanLine size={20} /><span>SCAN TO RENT<small>演示扫码租赁</small></span></PixelButton>
      )}

      {scannerOpen && <ScanModal mode="rent" code={`${pod.id} · RENT-QR`} onClose={() => setScannerOpen(false)} onConfirm={confirmRental} />}
    </PageShell>
  )
}

function PodPage() {
  const { data } = useQuest()
  const now = useClock()
  const navigate = useNavigate()

  if (data.rental.status !== 'rented' || !data.rental.startedAt) {
    return (
      <PageShell pageClass="pod-page">
        <PageTitle eyebrow="MY POD" title="YOUR LITTLE SPACE" subtitle="A Quiet Corner, Just for You." />
        <EmptyState title="还没有学习舱" copy="先选择一台便携式学习舱，再把它移动到你喜欢的安静角落。" action="CHOOSE A POD" to="/rent" />
      </PageShell>
    )
  }

  const rentedSeconds = Math.floor((now - data.rental.startedAt) / 1000)
  return (
    <PageShell pageClass="pod-page">
      <div className="quiet-window" aria-hidden="true"><i /><i /><i /></div>
      <PageTitle eyebrow="MY POD" title="YOUR LITTLE SPACE" subtitle="A Quiet Corner, Just for You." back="/rent" />

      <section className="my-pod-stage">
        <div className="status-ribbon"><span>●</span> IN USE</div>
        <PodSprite state="using" size="lg" />
        <div className="floor-shadow" />
      </section>

      <section className="rental-console pixel-panel">
        <div className="console-top"><span><small>DEVICE</small><b>{data.rental.podId}</b></span><span><small>STATUS</small><b className="status-green">RENTED</b></span></div>
        <div className="time-display"><Clock3 size={22} /><span><small>RENTAL TIME</small><strong>{formatClock(rentedSeconds)}</strong></span></div>
        <div className="console-meta"><span>START {new Date(data.rental.startedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span><span>{data.rental.location}</span></div>
      </section>

      <div className="safety-message"><span>!</span><p>可移动至图书馆允许区域，请勿阻挡通道与紧急出口。</p></div>

      <div className="dual-actions">
        <PixelButton tone="yellow" onClick={() => navigate('/focus')}><Play size={17} fill="currentColor" />START FOCUS</PixelButton>
        <PixelButton tone="cream" onClick={() => navigate('/return')}><RotateCcw size={17} />RETURN POD</PixelButton>
      </div>
    </PageShell>
  )
}

const subjects = [
  { name: 'English', icon: 'Aa' },
  { name: 'Math', icon: '∑' },
  { name: 'Design', icon: '✦' },
  { name: 'Other', icon: '···' },
]

function CompletionModal({ elapsed, goal, reachedGoal, onClose, onSave }: { elapsed: number; goal: number; reachedGoal: boolean; onClose: () => void; onSave: (rating: number, completed: boolean) => void }) {
  const [rating, setRating] = useState(5)
  const [completed, setCompleted] = useState(true)
  const xp = Math.max(10, Math.round(elapsed / 60) * 4 + (completed ? 20 : 0))
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="学习结果">
      <section className="completion-modal pixel-panel">
        <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <div className="victory-burst">✦</div>
        <span className="eyebrow">{reachedGoal ? 'MISSION CLEAR' : 'QUEST LOGGED'}</span>
        <h2>{reachedGoal ? 'QUEST COMPLETED!' : 'FOCUS SAVED!'}</h2>
        <p>本次专注 {formatStudyTime(elapsed)} / 目标 {formatStudyTime(goal)}</p>
        <div className="xp-reward"><Trophy size={24} /><span><small>REWARD</small><b>+{xp} XP</b></span></div>
        <label className="pixel-check"><input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} /><span />本次学习任务已完成</label>
        <div className="rating-row"><span>专注表现</span><div>{[1, 2, 3, 4, 5].map((star) => <button key={star} className={star <= rating ? 'active' : ''} onClick={() => setRating(star)} aria-label={`${star} 星`}>★</button>)}</div></div>
        <PixelButton tone="yellow" className="wide-button" onClick={() => onSave(rating, completed)}>SAVE RESULT · 保存记录</PixelButton>
      </section>
    </div>
  )
}

function FocusPage() {
  const { data, setData, patchFocus } = useQuest()
  const now = useClock(250)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [completionOpen, setCompletionOpen] = useState(false)
  const [reachedGoal, setReachedGoal] = useState(false)
  const focus = data.focus
  const rawElapsed = currentFocusElapsed(focus, now)
  const elapsed = Math.min(rawElapsed, focus.goalSec)
  const remaining = Math.max(0, focus.goalSec - elapsed)
  const progress = Math.min(100, (elapsed / focus.goalSec) * 100)

  useEffect(() => {
    if (focus.isRunning && rawElapsed >= focus.goalSec) {
      setData((current) => ({
        ...current,
        focus: { ...current.focus, isRunning: false, runningSince: null, elapsedBase: current.focus.goalSec },
      }))
      setReachedGoal(true)
      setCompletionOpen(true)
    }
  }, [focus.isRunning, focus.goalSec, rawElapsed, setData])

  if (data.rental.status !== 'rented') {
    return (
      <PageShell pageClass="focus-page">
        <PageTitle eyebrow="STUDY TIMER" title="FOCUS QUEST" subtitle="专注任务" />
        <EmptyState title="冒险装备未就绪" copy="先租赁一台移动学习舱，才能开启本次专注任务。" action="RENT A POD" to="/rent" />
      </PageShell>
    )
  }

  const startOrResume = () => {
    if (!focus.task.trim()) {
      setError('请先写下这次要完成的学习任务。')
      return
    }
    setError('')
    patchFocus({ isRunning: true, runningSince: Date.now() })
  }

  const pause = () => {
    patchFocus({ elapsedBase: currentFocusElapsed(focus), isRunning: false, runningSince: null })
  }

  const endQuest = () => {
    const currentElapsed = currentFocusElapsed(focus)
    if (currentElapsed <= 0) return
    patchFocus({ elapsedBase: Math.min(currentElapsed, focus.goalSec), isRunning: false, runningSince: null })
    setReachedGoal(currentElapsed >= focus.goalSec)
    setCompletionOpen(true)
  }

  const saveResult = (rating: number, completed: boolean) => {
    const seconds = Math.max(1, Math.min(currentFocusElapsed({ ...focus, isRunning: false, runningSince: null, elapsedBase: elapsed }), focus.goalSec))
    const xp = Math.max(10, Math.round(seconds / 60) * 4 + (completed ? 20 : 0))
    const record: StudyRecord = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      date: localDateKey(),
      createdAt: Date.now(),
      subject: focus.subject,
      task: focus.task.trim(),
      seconds,
      goalSec: focus.goalSec,
      completed,
      rating,
      xp,
    }
    setData((current) => ({
      ...current,
      records: [...current.records, record],
      focus: { ...initialData.focus, subject: current.focus.subject, goalSec: current.focus.goalSec },
    }))
    setCompletionOpen(false)
    navigate('/pod')
  }

  return (
    <PageShell pageClass="focus-page">
      <div className="focus-stars" aria-hidden="true">✦　·　✦　·　✦</div>
      <PageTitle eyebrow="ACTIVE MISSION" title="FOCUS QUEST" subtitle="专注任务" back="/pod" />

      <section className="subject-selector">
        <span className="section-label">01 · CHOOSE SUBJECT</span>
        <div>{subjects.map((subject) => <button key={subject.name} disabled={focus.elapsedBase > 0 || focus.isRunning} onClick={() => patchFocus({ subject: subject.name })} className={focus.subject === subject.name ? 'active' : ''}><b>{subject.icon}</b><span>{subject.name}</span></button>)}</div>
      </section>

      <label className="task-input-wrap">
        <span className="section-label">02 · TODAY'S QUEST</span>
        <div><BookOpen size={17} /><input value={focus.task} disabled={focus.isRunning} onChange={(event) => patchFocus({ task: event.target.value })} placeholder="例如：完成英语阅读训练" maxLength={36} /></div>
      </label>
      {error && <p className="form-error">{error}</p>}

      <section className="timer-console pixel-panel">
        <div className="timer-modes">{[25, 45, 60].map((minutes) => <button key={minutes} disabled={elapsed > 0 || focus.isRunning} onClick={() => patchFocus({ goalSec: minutes * 60 })} className={focus.goalSec === minutes * 60 ? 'active' : ''}>{minutes} MIN</button>)}</div>
        <div className="timer-screen">
          <span>{focus.isRunning ? 'FOCUSING…' : elapsed > 0 ? 'QUEST PAUSED' : 'READY?'}</span>
          <strong>{formatClock(remaining)}</strong>
          <small>{focus.subject.toUpperCase()} · {data.rental.podId}</small>
        </div>
        <div className="quest-progress"><div className="progress-head"><span>QUEST PROGRESS</span><b>{Math.round(progress)}%</b></div><div className="pixel-progress dark"><i style={{ width: `${progress}%` }} /></div></div>
      </section>

      <div className="focus-actions">
        {!focus.isRunning ? <PixelButton tone="yellow" onClick={startOrResume}><Play size={18} fill="currentColor" />{elapsed > 0 ? 'RESUME' : 'START'}</PixelButton> : <PixelButton tone="cyan" onClick={pause}><Pause size={18} fill="currentColor" />PAUSE</PixelButton>}
        <PixelButton tone="cream" disabled={elapsed <= 0} onClick={endQuest}><Square size={16} fill="currentColor" />END</PixelButton>
      </div>

      <p className="focus-tip">计时状态已保存在本机，切换页面或锁屏后仍会按真实时间继续。</p>

      {completionOpen && <CompletionModal elapsed={Math.max(1, elapsed)} goal={focus.goalSec} reachedGoal={reachedGoal} onClose={() => setCompletionOpen(false)} onSave={saveResult} />}
    </PageShell>
  )
}

function ReturnPage() {
  const { data, setData } = useQuest()
  const [steps, setSteps] = useState([false, false])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [justReturned, setJustReturned] = useState(false)
  const navigate = useNavigate()

  const finishReturn = () => {
    const current = data.rental
    if (current.status !== 'rented' || !current.startedAt || !current.podId) return
    const returnedAt = Date.now()
    const rentalSeconds = Math.max(0, Math.floor((returnedAt - current.startedAt) / 1000))
    const returnRecord: ReturnRecord = { id: crypto.randomUUID?.() ?? String(returnedAt), podId: current.podId, returnedAt, rentalSeconds }
    setData((value) => ({
      ...value,
      rental: {
        ...value.rental,
        status: 'idle',
        podId: null,
        location: null,
        startedAt: null,
        lastReturnAt: returnedAt,
        lastRentalDuration: rentalSeconds,
      },
      returns: [...value.returns, returnRecord],
    }))
    setScannerOpen(false)
    setJustReturned(true)
  }

  if (justReturned || (data.rental.status === 'idle' && data.rental.lastReturnAt)) {
    return (
      <PageShell pageClass="return-page" nav={false}>
        <div className="return-success">
          <div className="success-rays" />
          <PodSprite state="folded" size="lg" />
          <span className="eyebrow">MISSION COMPLETE</span>
          <h1>POD RETURNED!</h1>
          <p>学习舱已确认归还，感谢你让它整装待发，等待下一位冒险者。</p>
          <div className="return-receipt pixel-panel"><span><small>RETURNED AT</small><b>{new Date(data.rental.lastReturnAt!).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</b></span><span><small>RENTAL TIME</small><b>{formatStudyTime(data.rental.lastRentalDuration)}</b></span></div>
          <PixelButton tone="yellow" className="wide-button" onClick={() => navigate('/journey')}><Trophy size={18} />VIEW MY JOURNEY</PixelButton>
          <button className="text-button" onClick={() => navigate('/')}>返回首页</button>
        </div>
      </PageShell>
    )
  }

  if (data.rental.status !== 'rented') {
    return (
      <PageShell pageClass="return-page">
        <PageTitle eyebrow="RETURN POD" title="MISSION COMPLETE" subtitle="归还学习舱" />
        <EmptyState title="没有待归还设备" copy="当前没有正在租赁的学习舱。完成一次租赁后，这里会出现分步归还任务。" action="CHOOSE A POD" to="/rent" />
      </PageShell>
    )
  }

  const allReady = steps.every(Boolean)
  return (
    <PageShell pageClass="return-page">
      <div className="depot-lines" />
      <PageTitle eyebrow="RETURN POD" title="MISSION COMPLETE" subtitle="归还学习舱" back="/pod" />
      <section className="folded-stage"><PodSprite state="folded" size="md" /><div><span>RETURN UNIT</span><b>{data.rental.podId}</b><small>请按顺序完成 3 个步骤</small></div></section>

      <section className="return-steps">
        <button className={steps[0] ? 'done' : 'active'} onClick={() => setSteps(([_, second]) => [true, second])}>
          <span className="step-number">01</span><i>{steps[0] ? '✓' : '↙'}</i><div><b>FOLD THE POD</b><small>收起坐垫及两侧折叠结构</small></div><em>{steps[0] ? 'DONE' : 'TAP TO CONFIRM'}</em>
        </button>
        <button disabled={!steps[0]} className={steps[1] ? 'done' : steps[0] ? 'active' : ''} onClick={() => setSteps(([first]) => [first, true])}>
          <span className="step-number">02</span><i>{steps[1] ? '✓' : '→'}</i><div><b>MOVE IT BACK</b><small>推回指定的学习舱归还区域</small></div><em>{steps[1] ? 'DONE' : steps[0] ? 'TAP TO CONFIRM' : 'LOCKED'}</em>
        </button>
        <button disabled={!allReady} className={allReady ? 'active' : ''} onClick={() => setScannerOpen(true)}>
          <span className="step-number">03</span><i>▦</i><div><b>SCAN TO RETURN</b><small>扫描归还区二维码确认设备</small></div><em>{allReady ? 'READY TO SCAN' : 'LOCKED'}</em>
        </button>
      </section>

      <PixelButton tone={allReady ? 'yellow' : 'cream'} className="primary-cta" disabled={!allReady} onClick={() => setScannerOpen(true)}><ScanLine size={19} /><span>COMPLETE RETURN<small>{allReady ? '扫描归还区二维码' : '请先完成前两个步骤'}</small></span></PixelButton>

      {scannerOpen && <ScanModal mode="return" code="LIBRARY · RETURN ZONE A" onClose={() => setScannerOpen(false)} onConfirm={finishReturn} />}
    </PageShell>
  )
}

function hasThreeDayStreak(records: StudyRecord[]) {
  const unique = [...new Set(records.map((record) => record.date))].sort()
  let streak = unique.length ? 1 : 0
  let best = streak
  for (let index = 1; index < unique.length; index += 1) {
    const previous = new Date(`${unique[index - 1]}T12:00:00`).getTime()
    const current = new Date(`${unique[index]}T12:00:00`).getTime()
    streak = Math.round((current - previous) / 86_400_000) === 1 ? streak + 1 : 1
    best = Math.max(best, streak)
  }
  return best >= 3
}

function JourneyPage() {
  const { data } = useQuest()
  const totalSeconds = data.records.reduce((sum, record) => sum + record.seconds, 0)
  const completed = data.records.filter((record) => record.completed).length
  const studyDays = new Set(data.records.map((record) => record.date)).size
  const totalXp = data.records.reduce((sum, record) => sum + record.xp, 0)
  const subjectTotals = data.records.reduce<Record<string, number>>((totals, record) => ({ ...totals, [record.subject]: (totals[record.subject] ?? 0) + record.seconds }), {})
  const subjectEntries = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])
  const maxSubject = Math.max(1, ...subjectEntries.map(([, seconds]) => seconds))
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return { key: localDateKey(date.getTime()), label: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()], day: date.getDate() }
  })
  const badges = [
    { title: 'FIRST QUEST', cn: '首次完成学习', icon: '⚑', unlocked: data.records.length >= 1 },
    { title: 'FOCUS HERO', cn: '累计五次专注', icon: '★', unlocked: data.records.length >= 5 },
    { title: 'STUDY EXPLORER', cn: '连续三天学习', icon: '◆', unlocked: hasThreeDayStreak(data.records) },
  ]

  return (
    <PageShell pageClass="journey-page">
      <div className="journey-mountains" aria-hidden="true"><i /><i /></div>
      <PageTitle eyebrow={`LEVEL ${String(Math.floor(totalXp / 100) + 1).padStart(2, '0')} · ${totalXp} XP`} title="YOUR ADVENTURE" subtitle="学习成果 · 冒险档案" />

      <section className="journey-stats">
        <div className="pixel-panel"><Clock3 size={19} /><strong>{formatStudyTime(totalSeconds)}</strong><small>TOTAL STUDY TIME</small></div>
        <div className="pixel-panel"><Trophy size={19} /><strong>{completed}</strong><small>COMPLETED QUESTS</small></div>
        <div className="pixel-panel"><Sparkles size={19} /><strong>{studyDays}</strong><small>STUDY DAYS</small></div>
      </section>

      <section className="journey-section subject-progress">
        <div className="journey-heading"><span>SUBJECT PROGRESS</span><small>科目统计</small></div>
        {subjectEntries.length ? subjectEntries.slice(0, 4).map(([subject, seconds]) => (
          <div className="subject-row" key={subject}><span><b>{subject}</b><small>{formatStudyTime(seconds)}</small></span><div className="pixel-progress dark"><i style={{ width: `${Math.max(8, (seconds / maxSubject) * 100)}%` }} /></div></div>
        )) : <div className="no-records">完成一次专注任务后，科目地图会在这里点亮。</div>}
      </section>

      <section className="journey-section">
        <div className="journey-heading"><span>REWARD BADGES</span><small>冒险徽章</small></div>
        <div className="badges-grid">{badges.map((badge) => <div key={badge.title} className={badge.unlocked ? 'unlocked' : 'locked'}><i>{badge.icon}</i><b>{badge.title}</b><small>{badge.unlocked ? badge.cn : `LOCKED · ${badge.cn}`}</small></div>)}</div>
      </section>

      <section className="pixel-calendar pixel-panel">
        <div className="calendar-title"><b>7-DAY MAP</b><span>{studyDays} DAYS ACTIVE</span></div>
        <div>{recentDays.map((day) => { const seconds = data.records.filter((record) => record.date === day.key).reduce((sum, record) => sum + record.seconds, 0); return <span className={seconds > 0 ? 'active' : ''} key={day.key}><small>{day.label}</small><b>{day.day}</b><i>{seconds > 0 ? '✦' : '·'}</i></span> })}</div>
      </section>

      {data.rental.status === 'rented' && <Link className="journey-return-link" to="/return">冒险结束？前往归还学习舱 <ChevronRight size={16} /></Link>}
    </PageShell>
  )
}

const devPages = [
  { to: '/', number: '01', title: 'HOME' },
  { to: '/rent', number: '02', title: 'RENT A POD' },
  { to: '/pod', number: '03', title: 'MY POD' },
  { to: '/focus', number: '04', title: 'FOCUS MODE' },
  { to: '/return', number: '05', title: 'RETURN POD' },
  { to: '/journey', number: '06', title: 'MY JOURNEY' },
]

function DevPageRail() {
  const location = useLocation()
  const reset = () => {
    if (window.confirm('重置本机演示数据？租赁与学习记录都会清空。')) {
      localStorage.removeItem(STORAGE_KEY)
      window.location.assign('/')
    }
  }
  return (
    <aside className="dev-rail" aria-label="开发预览页面切换">
      <span>DEV PAGE MAP</span>
      <h2>STUDY QUEST</h2>
      <p>6 个独立手机路由</p>
      <nav>{devPages.map((page) => <Link key={page.to} to={page.to} className={location.pathname === page.to ? 'active' : ''}><b>{page.number}</b><span>{page.title}</span></Link>)}</nav>
      <button onClick={reset}><RotateCcw size={14} /> RESET DEMO DATA</button>
      <small>390 × 844 BASE</small>
    </aside>
  )
}

function App() {
  return (
    <QuestProvider>
      <div className="app-preview">
        <div className="preview-label"><i /> LIVE PROTOTYPE</div>
        <div className="phone-shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/rent" element={<RentPage />} />
            <Route path="/pod" element={<PodPage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/return" element={<ReturnPage />} />
            <Route path="/journey" element={<JourneyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <DevPageRail />
      </div>
    </QuestProvider>
  )
}

export default App
