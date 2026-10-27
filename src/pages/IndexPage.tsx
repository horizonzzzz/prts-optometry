import { Link } from 'react-router-dom';
import '../styles/terminal.scss';

export default function IndexPage() {
  return (
    <main className="terminal-page">
      <div className="terminal-shell">
        <header className="terminal-header">
          <div className="brand-lockup"><span className="rhodes-watermark" aria-hidden="true" /><span>RHODES ISLAND<small>PERSONAL TERMINAL SYSTEM</small></span></div>
          <span className="terminal-signal">● LOCAL / ONLINE</span>
        </header>
        <section className="terminal-intro" aria-labelledby="index-title">
          <p className="terminal-eyebrow">PRTS // INDEX — 终端目录</p>
          <h1 id="index-title">连接已建立<span>请选择运行模块。</span></h1>
          <p>博士，欢迎返回。以下终端可供访问。</p>
          <span className="terminal-watermark" aria-hidden="true">PRTS</span>
        </section>
        <nav className="terminal-modules" aria-label="游戏终端">
          <Link className="terminal-module terminal-module--vision" to="/">
            <span className="terminal-module__number">00</span>
            <span className="terminal-module__copy"><small>OPTICAL DIAGNOSTICS</small><strong>光学诊断终端</strong><span>校准、观测，等待另一端的回应。</span></span>
            <span className="terminal-module__state">{import.meta.env.VITE_NEED_HIDE === 'true' ? 'LOCKED' : 'ACTIVE'} <b aria-hidden="true">↗</b></span>
          </Link>
          <Link className="terminal-module terminal-module--m3" to="/m3">
            <span className="terminal-module__number">01</span>
            <span className="terminal-module__copy"><small>CUSTODY ACKNOWLEDGEMENT</small><strong>代管责任 · M3</strong><span>横版跳跃 / 引擎验证场已接入</span></span>
            <span className="terminal-module__state">PROTOTYPE <b aria-hidden="true">↗</b></span>
          </Link>
          <div className="terminal-module terminal-module--offline" aria-disabled="true">
            <span className="terminal-module__number">02</span>
            <span className="terminal-module__copy"><small>UNASSIGNED CHANNEL</small><strong>等待信号</strong><span>暂无可用模块</span></span>
            <span className="terminal-module__state">NO SIGNAL</span>
          </div>
        </nav>
        <footer className="terminal-footer"><span>PRTS / RECREATION ARCHIVE</span><span>非官方 · 非商业同人作品</span></footer>
      </div>
    </main>
  );
}
