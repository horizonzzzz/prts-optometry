import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { createM3Scene, type M3Scene } from '../m3/createM3Scene';
import { createInput, KEY_ACTIONS, type InputAction } from '../m3/core/input';
import type { Run } from '../m3/core/progress';
import '../styles/terminal.scss';
import '../styles/m3.scss';

export default function M3RescuePage() {
  const host = useRef<HTMLDivElement>(null);
  const playArea = useRef<HTMLElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  const input = useRef(createInput());
  const scene = useRef<M3Scene | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const active = ready && run?.status === 'playing';

  useEffect(() => {
    let cancelled = false;
    let mounted: M3Scene | undefined;
    const controls = input.current;
    void createM3Scene(host.current!, controls, (next) => {
      if (!cancelled) setRun(next);
    }).then((next) => {
      if (cancelled) { next.destroy(); return; }
      mounted = next;
      scene.current = next;
      setReady(true);
      playArea.current?.focus({ preventScroll: true });
    }).catch(() => { if (!cancelled) setError(true); });
    const releaseKey = (event: KeyboardEvent) => {
      const action = KEY_ACTIONS[event.code];
      if (action) controls.set(event.code, action, false);
    };
    const clear = () => controls.clear();
    window.addEventListener('keyup', releaseKey);
    window.addEventListener('blur', clear);
    return () => {
      cancelled = true;
      window.removeEventListener('keyup', releaseKey);
      window.removeEventListener('blur', clear);
      controls.clear();
      mounted?.destroy();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    if (run && run.status !== 'playing') retry.current?.focus({ preventScroll: true });
  }, [run?.status]);

  function press(event: ReactPointerEvent<HTMLButtonElement>, action: InputAction) {
    if (!active || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    input.current.set(`pointer:${event.pointerId}`, action, true);
  }
  function release(event: ReactPointerEvent<HTMLButtonElement>, action: InputAction) {
    input.current.set(`pointer:${event.pointerId}`, action, false);
  }
  function restart() {
    input.current.clear();
    scene.current?.retry();
    playArea.current?.focus({ preventScroll: true });
  }

  return (
    <main className="terminal-page m3-page">
      <div className="m3-shell">
        <header className="terminal-header">
          <Link to="/index" className="m3-back">← PRTS // INDEX</Link>
          <span className="terminal-signal">01 / PROTOTYPE</span>
        </header>
        <div className="m3-heading"><div><p className="terminal-eyebrow">CUSTODY ACKNOWLEDGEMENT</p><h1>代管责任 · M3</h1></div><span>引擎验证场</span></div>
        <section ref={playArea} className="m3-play" tabIndex={0} aria-label="横版跳跃验证场" aria-describedby="m3-instructions"
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) input.current.clear(); }}
          onKeyDown={(event) => {
            const action = KEY_ACTIONS[event.code];
            if (!active || !action) return;
            event.preventDefault();
            if (!event.repeat) input.current.set(event.code, action, true);
          }}>
          <div className="m3-viewport">
            <div ref={host} className="m3-canvas" aria-hidden="true" />
            {(!ready || error) && <div className="m3-overlay" role="status"><p>{error ? '图形终端初始化失败，请检查浏览器的 WebGL 支持。' : 'PRTS // 正在连接验证场…'}</p></div>}
            {ready && run?.status === 'recalled' && <div className="m3-overlay">
              <svg className="m3-recall-image" viewBox="0 0 240 180" role="img" aria-label="回收完成：小猫被拎回。当前为静态占位图。">
                <path fill="#36464d" d="M0 150h240v30H0zM16 154V28h70v126z" />
                <path fill="#9caaa9" d="M86 34h78v14H86zM150 42h14v36h-14z" />
                <path fill="#0a0e12" d="M140 82l-4-16 16 10h16l16-10-4 16v48h-40zM140 116h-12v-18h-7v26h19z" />
                <path fill="#4ade80" d="M147 88h5v4h-5zM166 88h5v4h-5z" />
                <path fill="#ffd802" d="M0 151h240v3H0z" />
              </svg>
              <button ref={retry} type="button" className="m3-action" onClick={restart}>重试</button>
            </div>}
            {ready && run?.status === 'complete' && <div className="m3-overlay" role="status">
              <span className="terminal-eyebrow">TEST SEQUENCE COMPLETE</span><h2>验证场通过</h2>
              <p>本轮回收 {run.recallCount} 次</p><button ref={retry} className="m3-action" type="button" onClick={restart}>再试一次</button>
            </div>}
          </div>
          <div className="m3-controls" aria-label="移动与跳跃控制">
            {(['left', 'right', 'jump'] as const).map((action) => <button key={action} type="button"
              className={`m3-control m3-control--${action}`} disabled={!active}
              aria-label={{ left: '左移', right: '右移', jump: '跳跃' }[action]}
              onPointerDown={(event) => press(event, action)} onPointerUp={(event) => release(event, action)}
              onPointerCancel={(event) => release(event, action)} onLostPointerCapture={(event) => release(event, action)}>
              {action === 'left' ? '←' : action === 'right' ? '→' : '跳跃 ↑'}
            </button>)}
          </div>
        </section>
        <p className="m3-instructions" id="m3-instructions">方向键 / A·D 移动，空格 / Z / ↑ 跳跃。触屏可同时按住方向与跳跃；短按低跳，长按高跳。沿黄色平台抵达绿色出口。</p>
        <footer className="terminal-footer"><span>480 × 480 / 60 Hz</span><span>基础操作验证 · 正式关卡制作中</span></footer>
      </div>
    </main>
  );
}
