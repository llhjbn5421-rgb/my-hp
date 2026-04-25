/* =============================================
   main.js — ナビ・スクロール・アニメーション
   ============================================= */

/* ナビゲーション：スクロール時に背景を変化させる */
(function initNavScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
})();

/* ハンバーガーメニューの開閉 */
(function initHamburger() {
  const btn  = document.getElementById('hamburger-btn');
  const menu = document.getElementById('mobile-menu');

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    /* メニュー表示中はページスクロールを無効化 */
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  /* モバイルメニューのリンクをクリックしたら閉じる */
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
})();

/* IntersectionObserver によるフェードインアニメーション */
(function initFadeIn() {
  const targets = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => observer.observe(el));
})();

/* ヒーローセクションのタイピングアニメーション */
(function initTyping() {
  const el = document.getElementById('typing-text');
  if (!el) return;

  /* 表示するフレーズリスト */
  const phrases = [
    'ビジネスを変革する',
    '未来を切り拓く',
    '可能性を最大化する',
    '課題を解決する',
  ];

  let phraseIdx = 0;
  let charIdx   = 0;
  let isDeleting = false;

  function tick() {
    const current = phrases[phraseIdx];

    if (isDeleting) {
      /* 1文字削除 */
      el.textContent = current.slice(0, charIdx - 1);
      charIdx--;
    } else {
      /* 1文字追加 */
      el.textContent = current.slice(0, charIdx + 1);
      charIdx++;
    }

    let delay = isDeleting ? 60 : 100;

    if (!isDeleting && charIdx === current.length) {
      /* 全文字表示 → 少し待ってから削除開始 */
      delay = 1800;
      isDeleting = true;
    } else if (isDeleting && charIdx === 0) {
      /* 全文字削除 → 次のフレーズへ */
      isDeleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      delay = 300;
    }

    setTimeout(tick, delay);
  }

  tick();
})();

/* お問い合わせフォームの送信処理（デモ用） */
(function initContactForm() {
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    /* 実際の送信処理はここに実装（fetch でAPIを呼ぶ等） */
    form.style.display = 'none';
    success.style.display = 'block';
  });
})();
