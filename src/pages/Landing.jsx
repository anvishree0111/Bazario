import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        <span className="bg-blob bg-blob-yellow" />
        <span className="bg-blob bg-blob-peach-1" />
        <span className="bg-blob bg-blob-peach-2" />
        <span className="bg-glass bg-glass-left" />
        <span className="bg-glass bg-glass-right" />
      </div>

      <main className="landing-card">
        <div className="logo-wrapper landing-logo">
          <Logo size={613} />
        </div>

        <h1 className="landing-title">Welcome to Bazario</h1>
        <p className="landing-subtitle">Sell Anytime, Buy Anytime</p>
        <div className="landing-divider" aria-hidden="true" />
        <p className="landing-question">What would you like to do today?</p>

        <div className="landing-buttons">
          <Link className="landing-btn primary" to="/login">
            I want to Buy
          </Link>

          <Link className="landing-btn secondary" to="/login/seller">
            I want to Sell
          </Link>
        </div>

        <p className="landing-register">
          New here?{' '}
          <Link to="/register">Register as Buyer</Link>
          {' '}or{' '}
          <Link to="/register/seller">Register as Seller</Link>
        </p>
      </main>

      <style>{`
        .landing {
          --u: clamp(0.75px, min(0.125vh, (100vw - 32px) / 640), 1.75px);
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2vh 16px;
          background: linear-gradient(135deg, #FFF6D8 0%, #FFFCF2 48%, #FFEFD9 100%);
        }

        .landing-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .bg-blob {
          position: absolute;
          border-radius: 50%;
        }

        .bg-blob-yellow {
          left: calc(var(--u) * -140);
          top: calc(var(--u) * -160);
          width: calc(var(--u) * 620);
          height: calc(var(--u) * 620);
          background: #FFD45E;
          opacity: 0.55;
          filter: blur(calc(var(--u) * 90));
        }

        .bg-blob-peach-1 {
          right: calc(var(--u) * -95);
          bottom: calc(var(--u) * -94);
          width: calc(var(--u) * 524);
          height: calc(var(--u) * 558);
          background: #FFAE80;
          opacity: 0.45;
          filter: blur(calc(var(--u) * 100));
        }

        .bg-blob-peach-2 {
          right: calc(var(--u) * -227);
          bottom: calc(var(--u) * -336);
          width: calc(var(--u) * 524);
          height: calc(var(--u) * 558);
          background: #FFAE80;
          opacity: 0.45;
          filter: blur(calc(var(--u) * 100));
        }

        .bg-glass {
          position: absolute;
          width: calc(var(--u) * 1100);
          height: calc(var(--u) * 700);
          border-radius: calc(var(--u) * 32);
          transform: rotate(-12deg);
          background: rgba(255, 255, 255, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 calc(var(--u) * 18) calc(var(--u) * 40) rgba(255, 150, 40, 0.18);
        }

        .bg-glass-left {
          right: calc(50% + var(--u) * 149);
          bottom: calc(50% + var(--u) * 45.5);
          transform-origin: 100% 100%;
        }

        .bg-glass-right {
          left: calc(50% + var(--u) * 260);
          bottom: calc(50% - var(--u) * 20);
          transform-origin: 0% 100%;
        }

        .landing-card {
          position: relative;
          z-index: 2;
          width: calc(var(--u) * 640);
          max-width: 100%;
          padding: calc(var(--u) * 36) calc(var(--u) * 48) calc(var(--u) * 40);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: rgba(255, 255, 255, 0.58);
          -webkit-backdrop-filter: blur(26px) saturate(150%);
          backdrop-filter: blur(26px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: calc(var(--u) * 36);
          box-shadow:
            0 calc(var(--u) * 30) calc(var(--u) * 80) rgba(255, 120, 40, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }

        .landing-logo {
          --logo-h: calc(var(--u) * 278);
        }

        .landing-logo .logo {
          width: calc(var(--logo-h) * 1.2348);
          height: var(--logo-h);
          overflow: hidden;
          align-items: flex-start;
        }

        .landing-logo .logo-img {
          flex: none;
          max-width: none;
          width: auto;
          height: calc(var(--logo-h) * 2.0696) !important;
          margin-left: calc(var(--logo-h) * -0.5435);
          margin-top: calc(var(--logo-h) * -0.4565);
        }

        .landing-title {
          margin-top: calc(var(--u) * 14);
          font-size: calc(var(--u) * 56);
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1.15;
          color: #FF4800;
          animation: fadeUp 0.6s ease;
        }

        .landing-subtitle {
          margin-top: calc(var(--u) * 8);
          font-size: calc(var(--u) * 21);
          line-height: 1.3;
          color: #5B4F3F;
          animation: fadeUp 0.6s ease 0.1s both;
        }

        .landing-divider {
          width: calc(var(--u) * 56);
          height: calc(var(--u) * 3);
          border-radius: 3px;
          margin: calc(var(--u) * 26) 0 calc(var(--u) * 22);
          background: linear-gradient(90deg, #FFB703, #FF4800);
        }

        .landing-question {
          font-size: calc(var(--u) * 19);
          line-height: 1.3;
          font-weight: 700;
          color: #2B2218;
          animation: fadeUp 0.6s ease 0.2s both;
        }

        .landing-buttons {
          display: flex;
          gap: calc(var(--u) * 20);
          flex-wrap: wrap;
          justify-content: center;
          margin-top: calc(var(--u) * 20);
          animation: fadeUp 0.6s ease 0.3s both;
        }

        .landing-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          box-sizing: border-box;
          min-width: calc(var(--u) * 210);
          font-size: calc(var(--u) * 19);
          font-weight: 700;
          border-radius: calc(var(--u) * 14);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .landing-btn.primary {
          padding: calc(var(--u) * 16) calc(var(--u) * 36);
          background: linear-gradient(180deg, #FF5A14, #E84300);
          color: #fff;
          box-shadow: 0 calc(var(--u) * 10) calc(var(--u) * 24) rgba(232, 67, 0, 0.35);
        }

        .landing-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 calc(var(--u) * 14) calc(var(--u) * 30) rgba(232, 67, 0, 0.45);
        }

        .landing-btn.secondary {
          padding: calc(var(--u) * 14) calc(var(--u) * 36);
          background: rgba(255, 255, 255, 0.8);
          color: #B83300;
          border: 2px solid #E84300;
        }

        .landing-btn.secondary:hover {
          background: #fff;
          transform: translateY(-2px);
        }

        .landing-register {
          margin-top: calc(var(--u) * 28);
          font-size: calc(var(--u) * 17);
          line-height: 1.6;
          color: #5B4F3F;
          animation: fadeUp 0.6s ease 0.35s both;
        }

        .landing-register a {
          color: #B83300;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
        }

        .landing-register a:hover {
          color: #8A2600;
          text-decoration: underline;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .landing {
            --u: 1px;
            padding: 16px;
          }

          .landing-card {
            width: 100%;
            padding: 28px 20px 32px;
            border-radius: 28px;
          }

          .landing-logo {
            --logo-h: 190px;
          }

          .landing-title {
            font-size: clamp(1.75rem, 8.5vw, 2.5rem);
          }

          .landing-subtitle {
            font-size: 1.1rem;
          }

          .landing-question {
            font-size: 1.05rem;
          }

          .landing-register {
            font-size: 0.95rem;
          }

          .landing-btn {
            font-size: 1.05rem;
          }
        }

        @media (max-width: 480px) {
          .landing-buttons {
            flex-direction: column;
            align-self: stretch;
          }

          .landing-btn {
            width: 100%;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  )
}