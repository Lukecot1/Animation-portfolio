const cursorEl = document.getElementById('cursor');
window.addEventListener('mousemove', e => {
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top  = e.clientY + 'px';
});

const panels = Array.from(document.querySelectorAll('.panel'));
const navLinks = document.querySelectorAll('.nav-link');
const pageTitle = document.getElementById('page-title');

const CLOSED_W    = 20;
const CLOSED_H    = 20;
const CLOSED_H_PHONE = 10;
const SCROLL_SCALE = 200;
const LERP_FACTOR  = 14;
const SNAP_DELAY   = 240;

let visualPos        = 0.0;
let targetPos        = 0.0;
let rafId            = null;
let lastTime         = null;
let snapTimer        = null;
let position         = 0;
let lastSnappedPanel = 0;

const panelTitles = [
    'Showreel',                  // 0
    'Do you accept cookies?',    // 1
    'JellyCat',                  // 2
    'Bolt 6',                    // 3
    '44 Pixels',                 // 4
    'China Town',                // 5
    'Myth Studio',               // 6
    'Rye Lane Bagels',           // 7
    'Diving Board',              // 8
    'Present Model Management',  // 9
];

function typewriteTitle(text, el) {
    el = el || pageTitle;
    if (text === undefined || text === null) text = '';
    el.innerHTML = '';
    let charIndex = 0;
    text.split(' ').forEach((word, wi) => {
        if (wi > 0) {
            const space = document.createElement('span');
            space.className = 'title-letter';
            space.textContent = '\u00A0';
            space.style.animationDelay = (charIndex * 45) + 'ms';
            el.appendChild(space);
            charIndex++;
        }
        const wordSpan = document.createElement('span');
        wordSpan.style.whiteSpace = 'nowrap';
        word.split('').forEach(char => {
            const span = document.createElement('span');
            span.className = 'title-letter';
            span.textContent = char;
            span.style.animationDelay = (charIndex * 45) + 'ms';
            wordSpan.appendChild(span);
            charIndex++;
        });
        el.appendChild(wordSpan);
    });
}

function isPortrait() {
    return window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
}

function isPhone() {
    return window.innerWidth <= 430;
}

function renderWidths(fromIdx, toIdx, progress) {
    const portrait  = isPortrait();
    const nearSquare = !portrait && (window.innerWidth / window.innerHeight < 1.4);
    const closed    = isPhone() ? CLOSED_H_PHONE : (portrait || nearSquare) ? CLOSED_H : CLOSED_W;

    panels.forEach((panel, i) => {
        let grow, basis, radius;

        if (i === fromIdx) {
            grow   = 1 - progress;
            basis  = progress >= 1 ? closed : 0;
            radius = 24 + (20 - 24) * progress;
        } else if (toIdx >= 0 && i === toIdx) {
            grow   = progress;
            basis  = 0;
            radius = 20 + (24 - 20) * progress;
        } else {
            grow   = 0;
            basis  = closed;
            radius = 20;
        }

        panel.style.flexGrow     = grow;
        panel.style.flexShrink   = '0';
        panel.style.borderRadius = radius.toFixed(1) + 'px';
        panel.style.flexBasis    = basis + 'px';
        if (portrait) panel.style.width = '100%';
        else          panel.style.width = '';
    });

    panels.forEach(p => p.classList.remove('active'));
    const activeIdx = progress >= 1 ? toIdx : fromIdx;
    if (activeIdx >= 0) panels[activeIdx].classList.add('active');
}

function renderAt(prog) {
    const clamped = Math.max(0, Math.min(panels.length - 1, prog));
    const fromIdx = Math.floor(clamped);
    const t = clamped - fromIdx;
    if (t < 0.0001) renderWidths(fromIdx, -1, 0);
    else             renderWidths(fromIdx, fromIdx + 1, t);
}

// --- Lerp animation loop ---

function animTick(now) {
    const dt   = lastTime !== null ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime   = now;

    const diff = targetPos - visualPos;

    if (Math.abs(diff) < 0.0006) {
        visualPos = targetPos;
        renderAt(visualPos);
        onSettled();
        rafId    = null;
        lastTime = null;
        return;
    }

    // Frame-rate-independent exponential lerp
    visualPos += diff * (1 - Math.exp(-LERP_FACTOR * dt));
    renderAt(visualPos);
    rafId = requestAnimationFrame(animTick);
}

function onSettled() {
    const snapped = Math.round(visualPos);
    if (snapped !== lastSnappedPanel) {
        typewriteTitle(panelTitles[snapped]);
        lastSnappedPanel = snapped;
        position = snapped;
    }
}

function startAnim() {
    if (!rafId) {
        lastTime = null;
        rafId = requestAnimationFrame(animTick);
    }
}

function moveTo(target) {
    targetPos = Math.max(0, Math.min(panels.length - 1, target));
    startAnim();
}

// --- Scroll ---

window.addEventListener('wheel', onWheel, { passive: false, capture: true });

function onWheel(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (Math.abs(e.deltaY) < 2) return;

    targetPos = Math.max(0, Math.min(panels.length - 1, targetPos + e.deltaY / SCROLL_SCALE));
    startAnim();

    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => moveTo(Math.round(targetPos)), SNAP_DELAY);
}

// --- Click & Nav ---

function goTo(next) {
    if (next < 0 || next >= panels.length) return;
    moveTo(next);
}

panels.forEach((panel, i) => {
    panel.addEventListener('click', () => {
        if (panel.classList.contains('active')) return;
        panelSprings[i].target = 0;
        startSpring();
        goTo(i);
    });
});

const experienceOverlay = document.getElementById('experience-overlay');
const expTitle = document.getElementById('exp-title');
const expAvatarWrap = document.getElementById('exp-avatar-wrap');
const expContent = document.querySelector('.exp-content');
let expAvatarRive = null;
let expTimers = [];

function showExperience() {
    expTimers.forEach(clearTimeout);
    expTimers = [];

    expAvatarWrap.classList.remove('avatar-in', 'avatar-out');
    expContent.classList.remove('content-in');

    experienceOverlay.style.display = 'flex';

    if (!expAvatarRive) {
        expAvatarRive = new rive.Rive({
            src: 'Rive/Luket.riv',
            canvas: document.getElementById('exp-avatar-canvas'),
            artboard: 'Avatar',
            stateMachines: 'State Machine 1',
            autoplay: true,
            layout: new rive.Layout({ fit: rive.Fit.Contain }),
            onLoad() { expAvatarRive.resizeDrawingSurfaceToCanvas(); },
        });
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
        experienceOverlay.classList.add('visible');
        typewriteTitle('Experience', expTitle);
        expTimers.push(setTimeout(() => expAvatarWrap.classList.add('avatar-in'), 100));
        expTimers.push(setTimeout(() => expContent.classList.add('content-in'), 900));
        expTimers.push(setTimeout(() => expAvatarWrap.classList.add('avatar-out'), 1800));
    }));
}

function hideExperience() {
    expTimers.forEach(clearTimeout);
    expTimers = [];
    experienceOverlay.classList.remove('visible');
    setTimeout(() => {
        experienceOverlay.style.display = 'none';
        expAvatarWrap.classList.remove('avatar-in', 'avatar-out');
        expContent.classList.remove('content-in');
        buildPanels();
    }, 300);
}

function buildPanels() {
    panels.forEach((panel, i) => {
        panel.classList.remove('reveal');
        panel.style.setProperty('--reveal-delay', (i * 50) + 'ms');
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
        panels.forEach(panel => panel.classList.add('reveal'));
    }));
}

const navNameEl = document.querySelector('.nav-name');
function goHome() { hideExperience(); moveTo(0); }
navNameEl.addEventListener('click', goHome);
navNameEl.addEventListener('touchend', (e) => { e.preventDefault(); goHome(); });

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (link.dataset.page === 'experience') showExperience();
    });
});

// Burger menu
const burgerBtn    = document.getElementById('burger-btn');
const mobileMenu   = document.getElementById('mobile-menu');
const mobileClose  = document.getElementById('mobile-menu-close');

function openMobileMenu()  { mobileMenu.classList.add('open'); }
function closeMobileMenu() { mobileMenu.classList.remove('open'); }

burgerBtn.addEventListener('click', openMobileMenu);
mobileClose.addEventListener('click', closeMobileMenu);

document.getElementById('mob-experience').addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileMenu();
    showExperience();
});
document.getElementById('mob-instagram').addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileMenu();
    window.open('https://www.instagram.com/luke.cottrell_animation', '_blank');
});
document.getElementById('mob-email').addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileMenu();
    window.open('mailto:lukefgc@icloud.com', '_blank');
});

// Panel hover spring
const panelSprings = panels.map(() => ({ y: 0, vy: 0, target: 0 }));
const SPRING_K = 300;
const SPRING_D = 28;
let hoverRafId = null;
let hoverLastTime = null;
const leaveTimers = panels.map(() => null);

function springTick(now) {
    const dt = hoverLastTime !== null ? Math.min((now - hoverLastTime) / 1000, 0.05) : 1 / 60;
    hoverLastTime = now;

    let anyActive = false;
    panels.forEach((panel, i) => {
        const s = panelSprings[i];
        if (panel.classList.contains('active')) {
            s.target = 0;
        }
        const diff = s.target - s.y;
        if (Math.abs(diff) < 0.05 && Math.abs(s.vy) < 0.05) {
            s.y = s.target;
            s.vy = 0;
            panel.style.transform = s.y === 0 ? '' : `translateY(${s.y}px)`;
            return;
        }
        const force = SPRING_K * diff - SPRING_D * s.vy;
        s.vy += force * dt;
        s.y  += s.vy * dt;
        panel.style.transform = `translateY(${s.y.toFixed(3)}px)`;
        anyActive = true;
    });

    if (anyActive) {
        hoverRafId = requestAnimationFrame(springTick);
    } else {
        hoverRafId = null;
        hoverLastTime = null;
    }
}

function startSpring() {
    if (!hoverRafId) {
        hoverLastTime = null;
        hoverRafId = requestAnimationFrame(springTick);
    }
}

panels.forEach((panel, i) => {
    panel.addEventListener('mouseenter', () => {
        clearTimeout(leaveTimers[i]);
        if (panel.classList.contains('active')) return;
        panelSprings[i].target = -10;
        startSpring();
    });
    panel.addEventListener('mouseleave', () => {
        leaveTimers[i] = setTimeout(() => {
            panelSprings[i].target = 0;
            startSpring();
        }, 80);
    });
});

// Init
renderAt(visualPos);
typewriteTitle(panelTitles[0]);
window.addEventListener('resize', () => renderAt(visualPos));

// Responsive Rive font size
function getRiveFontSize() {
    if (isPhone()) return 16;
    if (isPortrait()) return 20;
    return 24;
}

let navFontSizeProp = null;
let contactFontSizeProp = null;

function updateRiveFontSizes() {
    const size = getRiveFontSize();
    if (navFontSizeProp) navFontSizeProp.value = size;
    if (contactFontSizeProp) contactFontSizeProp.value = size;
}

// Nav name Rive
const navNameCanvas = document.getElementById('nav-name-canvas');
const navNameRive = new rive.Rive({
    src: 'Rive/LukeCottrell[Text].riv',
    canvas: navNameCanvas,
    artboard: 'LukeCottrell',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Layout }),
});
navNameRive.on(rive.EventType.Load, () => {
    navFontSizeProp = navNameRive.viewModelInstance.number('fontsize');
    navFontSizeProp.value = getRiveFontSize();
    requestAnimationFrame(() => navNameRive.resizeDrawingSurfaceToCanvas());
});
window.addEventListener('resize', () => {
    navNameRive.resizeDrawingSurfaceToCanvas();
    updateRiveFontSizes();
});

// Contact Rive
const contactRive = new rive.Rive({
    src: 'Rive/Contact.riv',
    canvas: document.getElementById('nav-contact-canvas'),
    artboard: 'Contact',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.TopRight }),
});
contactRive.on(rive.EventType.Load, () => {
    const vmi = contactRive.viewModelInstance;
    contactFontSizeProp = vmi.number('fontsize');
    contactFontSizeProp.value = getRiveFontSize();
    vmi.trigger('insta').on(() => window.open('https://www.instagram.com/luke.cottrell_animation', '_blank'));
    vmi.trigger('mail').on(() => window.open('mailto:lukefgc@icloud.com', '_blank'));
    requestAnimationFrame(() => contactRive.resizeDrawingSurfaceToCanvas());
});
window.addEventListener('resize', () => contactRive.resizeDrawingSurfaceToCanvas());

// Loader
const loaderEl = document.getElementById('loader');

const loaderRive = new rive.Rive({
    src: 'Rive/Luket.riv',
    canvas: document.getElementById('loader-canvas'),
    artboard: 'Avatar',
    stateMachines: 'State Machine 1',
    autoplay: true,
    onLoad() {
        loaderRive.resizeDrawingSurfaceToCanvas();
    },
});

const pageLoaded = new Promise(res => window.addEventListener('load', res));
const minDelay   = new Promise(res => setTimeout(res, 3000));

const loaderCanvas = document.getElementById('loader-canvas');

Promise.all([pageLoaded, minDelay]).then(() => {
    loaderCanvas.classList.add('shrink');
    loaderCanvas.addEventListener('transitionend', () => {
        loaderEl.style.display = 'none';
        loaderRive.cleanup();
    }, { once: true });
});
