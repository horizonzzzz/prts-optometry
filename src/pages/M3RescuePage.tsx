import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { createM3Scene, type M3Scene } from '../m3/createM3Scene';
import { createInput, KEY_ACTIONS, type InputAction } from '../m3/core/input';
import type { Run } from '../m3/core/progress';
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
  const [displayNotice, setDisplayNotice] = useState('');

  async function toggleFullscreen() {
    input.current.clear();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (playArea.current?.requestFullscreen) await playArea.current.requestFullscreen();
      else { setDisplayNotice('当前浏览器不支持全屏，可横屏继续游玩。'); return; }
      setDisplayNotice('');
    } catch {
      setDisplayNotice('未能进入全屏，可横屏继续游玩。');
    } finally {
      playArea.current?.focus({ preventScroll: true });
    }
  }

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
    // 旋转瞬间触点可能收不到 pointercancel，方向改变时兜底清空按住状态。
    const orientation = window.matchMedia('(orientation: portrait)');
    orientation.addEventListener('change', clear);
    window.addEventListener('keyup', releaseKey);
    window.addEventListener('blur', clear);
    return () => {
      cancelled = true;
      orientation.removeEventListener('change', clear);
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
    <main className="m3-page">
      <div className="m3-shell">
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
            <nav className="m3-tools" aria-label="游戏选项">
              <Link to="/index" className="m3-tool" aria-label="返回游戏菜单">‹</Link>
              <button type="button" className="m3-tool" onClick={toggleFullscreen} aria-label="切换全屏">⛶</button>
              <details className="m3-help"><summary aria-label="操作说明">?</summary><p>← → / A D 移动<br />空格 / Z / ↑ 跳跃<br />短按低跳，长按高跳<br />往右上方的旗帜前进！</p></details>
            </nav>
            <div className="m3-location" aria-hidden="true"><span>01 · 罗德岛</span><strong>甲板大逃跑</strong></div>
            {displayNotice && <p className="m3-notice" role="status">{displayNotice}</p>}
            <div className="m3-controls m3-controls--move" aria-label="移动控制">
              {(['left', 'right'] as const).map((action) => <button key={action} type="button"
                className="m3-control m3-control--move-button" disabled={!active}
                aria-label={{ left: '左移', right: '右移' }[action]}
                onPointerDown={(event) => press(event, action)} onPointerUp={(event) => release(event, action)}
                onPointerCancel={(event) => release(event, action)} onLostPointerCapture={(event) => release(event, action)}>
                {action === 'left' ? '←' : '→'}
              </button>)}
            </div>
            <div className="m3-controls m3-controls--jump" aria-label="跳跃控制">
              <button type="button" className="m3-control m3-control--jump" disabled={!active} aria-label="跳跃"
                onPointerDown={(event) => press(event, 'jump')} onPointerUp={(event) => release(event, 'jump')}
                onPointerCancel={(event) => release(event, 'jump')} onLostPointerCapture={(event) => release(event, 'jump')}>
                跳跃 ↑
              </button>
            </div>
            {(!ready || error) && <div className="m3-overlay" role="status"><p>{error ? '画面加载失败，请检查浏览器的 WebGL 支持。' : '小猫正在溜上甲板…'}</p></div>}
            {ready && run?.status === 'recalled' && <div className="m3-overlay">
              <svg className="m3-recall-image" viewBox="0 0 240 180" role="img" aria-label="回收完成：小猫被拎回。当前为静态占位图。">
                <path fill="#8dada7" d="M0 150h240v30H0zM16 154V28h70v126z" />
                <path fill="#b17e58" d="M86 34h78v14H86zM150 42h14v36h-14z" />
                <path fill="#202a30" d="M140 82l-4-16 16 10h16l16-10-4 16v48h-40zM140 116h-12v-18h-7v26h19z" />
                <path fill="#4ade80" d="M147 88h5v4h-5zM166 88h5v4h-5z" />
                <path fill="#ffc364" d="M0 151h240v3H0z" />
              </svg>
              <button ref={retry} type="button" className="m3-action" onClick={restart}>重试</button>
            </div>}
            {ready && run?.status === 'complete' && <div className="m3-overlay" role="status">
              <span className="m3-eyebrow">NICE JUMP!</span><h2>甲板试跑成功！</h2>
              <p>本轮回收 {run.recallCount} 次</p><button ref={retry} className="m3-action" type="button" onClick={restart}>再试一次</button>
            </div>}
            <div className="m3-rotate" role="status">
              <span className="m3-rotate__phone" aria-hidden="true" />
              <p>请将手机横屏游玩</p>
              <span className="m3-eyebrow">小猫需要多一点助跑空间</span>
            </div>
          </div>
        </section>
        <p className="m3-instructions" id="m3-instructions">M3 营救行动 · 甲板试跑。方向键 / A·D 移动，空格 / Z / ↑ 跳跃；触屏使用左下与右下按钮，短按低跳、长按高跳。沿悬吊平台向右上方的旗帜前进。正式救援关卡制作中。</p>
      </div>
    </main>
  );
}
