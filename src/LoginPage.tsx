import { useRef, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';

const bagVideoUrl = 'https://v1.pinimg.com/videos/iht/720p/f9/d0/0c/f9d00c97855fd45b6ecb22aa8ba463b1.mp4';
const bagPinUrl = 'https://pin.it/SxOBYCWH0';

type LoginPageProps = {
  error: string;
  isLoading: boolean;
  rememberMe: boolean;
  onRememberMeChange: (remember: boolean) => void;
  onSubmit: (username: string, password: string) => void;
};

export default function LoginPage({
  error,
  isLoading,
  rememberMe,
  onRememberMeChange,
  onSubmit,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [videoPosition, setVideoPosition] = useState({ x: 0, y: 0 });
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoDrag = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(username, password);
  }

  function startVideoDrag(event: React.PointerEvent<HTMLVideoElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    videoDrag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: videoPosition.x,
      y: videoPosition.y,
    };
    setIsDraggingVideo(true);
  }

  function moveVideo(event: React.PointerEvent<HTMLVideoElement>) {
    if (!videoDrag.current) return;
    const container = event.currentTarget.parentElement;
    if (!container) return;

    const containerBounds = container.getBoundingClientRect();
    const videoBounds = event.currentTarget.getBoundingClientRect();
    const drag = videoDrag.current;
    const left = videoBounds.left - videoPosition.x;
    const top = videoBounds.top - videoPosition.y;
    const minX = Math.min(0, containerBounds.left - left);
    const maxX = Math.max(0, containerBounds.right - (left + videoBounds.width));
    const minY = Math.min(0, containerBounds.top - top);
    const maxY = Math.max(0, containerBounds.bottom - (top + videoBounds.height));

    setVideoPosition({
      x: Math.max(minX, Math.min(maxX, drag.x + event.clientX - drag.pointerX)),
      y: Math.max(minY, Math.min(maxY, drag.y + event.clientY - drag.pointerY)),
    });
  }

  function stopVideoDrag(event: React.PointerEvent<HTMLVideoElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    videoDrag.current = null;
    setIsDraggingVideo(false);
  }

  function moveVideoWithKeyboard(event: React.KeyboardEvent<HTMLVideoElement>) {
    const offsets: Record<string, [number, number]> = {
      ArrowDown: [0, 20],
      ArrowLeft: [-20, 0],
      ArrowRight: [20, 0],
      ArrowUp: [0, -20],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();

    const container = event.currentTarget.parentElement;
    if (!container) return;
    const containerBounds = container.getBoundingClientRect();
    const videoBounds = event.currentTarget.getBoundingClientRect();
    const left = videoBounds.left - videoPosition.x;
    const top = videoBounds.top - videoPosition.y;
    const minX = Math.min(0, containerBounds.left - left);
    const maxX = Math.max(0, containerBounds.right - (left + videoBounds.width));
    const minY = Math.min(0, containerBounds.top - top);
    const maxY = Math.max(0, containerBounds.bottom - (top + videoBounds.height));

    setVideoPosition({
      x: Math.max(minX, Math.min(maxX, videoPosition.x + offset[0])),
      y: Math.max(minY, Math.min(maxY, videoPosition.y + offset[1])),
    });
  }

  async function playVideo() {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setVideoError('');
    } catch {
      setVideoError('Video playback is unavailable. Use the Pinterest link to view it.');
    }
  }

  return (
    <main className="login-page">
      <div className="login-photo">
        <div className="login-video-frame">
          <video
            aria-label="Drag to reposition the luxury bag video"
            className={isDraggingVideo ? 'login-video dragging' : 'login-video'}
            onKeyDown={moveVideoWithKeyboard}
            onLostPointerCapture={stopVideoDrag}
            onPointerCancel={stopVideoDrag}
            onPointerDown={startVideoDrag}
            onPointerMove={moveVideo}
            onPointerEnter={() => void playVideo()}
            onPointerLeave={() => videoRef.current?.pause()}
            onPointerUp={stopVideoDrag}
            playsInline
            loop
            muted
            preload="metadata"
            ref={videoRef}
            src={bagVideoUrl}
            style={{ transform: `translate(${videoPosition.x}px, ${videoPosition.y}px)` }}
            tabIndex={0}
          />
        </div>
        {videoError && <p className="video-playback-error" role="status">{videoError}</p>}
        <a
          className="video-credit"
          href={bagPinUrl}
          rel="noreferrer"
          target="_blank"
        >
          View video on Pinterest
        </a>
      </div>
      <section className="login-panel" aria-label="Sign in">
        <div className="login-content">
          <img className="login-logo" src="/cjv-logo.png" alt="CJV Luxury Bags & Watches" />
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span className="visually-hidden">Username</span>
              <input
                autoComplete="username"
                placeholder="Username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="login-field">
              <span className="visually-hidden">Password</span>
              <input
                autoComplete="current-password"
                placeholder="Password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="login-options">
              <label className="remember-option">
                <input
                  checked={rememberMe}
                  onChange={(event) => onRememberMeChange(event.target.checked)}
                  type="checkbox"
                />
                <span>Remember me</span>
              </label>
              <button className="login-submit" disabled={isLoading} type="submit">
                {isLoading ? <LoaderCircle className="login-spinner" size={17} /> : <ArrowRight size={17} />}
                <span>{isLoading ? 'Signing in' : 'Sign in'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
