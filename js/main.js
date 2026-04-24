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
let mythLockEl       = null;
let mythDismissed    = false;
let mythVideos          = [];
let expandedPanelIndex  = -1;
let showreelVideoEl  = null;
let showreelPlayBool = null;
let cookiesVideoEl   = null;
let cookiesPlayBool  = null;
let ryeVideoEl          = null;
let ryePlayBool         = null;
let pixelsVideoEl       = null;
let pixelsPlayBool      = null;
let divingboardVideoEl  = null;
let divingboardPlayBool = null;
let cyclingVideoEl      = null;
let cyclingPlayBool     = null;
let jellycatVideoEl     = null;
let jellycatPlayBool    = null;
let bolt6VideoEl        = null;
let bolt6PlayBool       = null;
let chinatownVideoEl    = null;
let chinatownPlayBool   = null;

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
    if (expandedPanelIndex >= 0) return;
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

    // Content scale + opacity driven by scroll position
    panels.forEach((panel, i) => {
        const inner = panel.querySelector('.panel-inner:not(.myth-content-inner)');
        if (!inner) return;
        const p = Math.max(0, 1 - Math.abs(clamped - i));
        inner.style.opacity   = p;
        inner.style.transform = `scale(${0.88 + 0.12 * p})`;
    });

    if (showreelVideoEl && clamped > 0) {
        if (!showreelVideoEl.paused) showreelVideoEl.pause();
        if (!showreelVideoEl.muted) {
            showreelVideoEl.muted = true;
            const vb = document.getElementById('showreel-vol');
            if (vb) vb.classList.remove('unmuted');
        }
        if (showreelPlayBool) showreelPlayBool.value = false;
    }

    if (cookiesVideoEl && Math.abs(clamped - 1) > 0) {
        if (!cookiesVideoEl.paused) cookiesVideoEl.pause();
        if (!cookiesVideoEl.muted) {
            cookiesVideoEl.muted = true;
            const vb = document.getElementById('cookies-vol');
            if (vb) vb.classList.remove('unmuted');
        }
        if (cookiesPlayBool) cookiesPlayBool.value = false;
    }

    if (jellycatVideoEl && Math.abs(clamped - 2) > 0) {
        if (!jellycatVideoEl.paused) jellycatVideoEl.pause();
        if (!jellycatVideoEl.muted) { jellycatVideoEl.muted = true; const vb = document.getElementById('jellycat-vol'); if (vb) vb.classList.remove('unmuted'); }
        if (jellycatPlayBool) jellycatPlayBool.value = false;
    }

    if (bolt6VideoEl && Math.abs(clamped - 3) > 0) {
        if (!bolt6VideoEl.paused) bolt6VideoEl.pause();
        if (!bolt6VideoEl.muted) { bolt6VideoEl.muted = true; const vb = document.getElementById('bolt6-vol'); if (vb) vb.classList.remove('unmuted'); }
        if (bolt6PlayBool) bolt6PlayBool.value = false;
    }

    if (chinatownVideoEl && Math.abs(clamped - 5) > 0) {
        if (!chinatownVideoEl.paused) chinatownVideoEl.pause();
        if (!chinatownVideoEl.muted) {
            chinatownVideoEl.muted = true;
            const vb = document.getElementById('chinatown-vol');
            if (vb) vb.classList.remove('unmuted');
        }
        if (chinatownPlayBool) chinatownPlayBool.value = false;
    }

    if (Math.abs(clamped - 4) > 0) {
        if (window.pixelsCarouselStop) window.pixelsCarouselStop();
        document.querySelectorAll('.pixels-vid').forEach(v => { if (!v.paused) v.pause(); });
    }

    if (pixelsVideoEl && Math.abs(clamped - 4) > 0) {
        if (!pixelsVideoEl.paused) pixelsVideoEl.pause();
        if (!pixelsVideoEl.muted) { pixelsVideoEl.muted = true; const vb = document.getElementById('pixels-vol'); if (vb) vb.classList.remove('unmuted'); }
        if (pixelsPlayBool) pixelsPlayBool.value = false;
    }

    if (divingboardVideoEl && Math.abs(clamped - 8) > 0) {
        if (!divingboardVideoEl.paused) divingboardVideoEl.pause();
        if (!divingboardVideoEl.muted) { divingboardVideoEl.muted = true; const vb = document.getElementById('divingboard-vol'); if (vb) vb.classList.remove('unmuted'); }
        if (divingboardPlayBool) divingboardPlayBool.value = false;
    }

    if (cyclingVideoEl && Math.abs(clamped - 7) > 0) {
        if (!cyclingVideoEl.paused) cyclingVideoEl.pause();
        if (!cyclingVideoEl.muted) { cyclingVideoEl.muted = true; const vb = document.getElementById('cycling-vol'); if (vb) vb.classList.remove('unmuted'); }
        if (cyclingPlayBool) cyclingPlayBool.value = false;
    }

    if (ryeVideoEl && Math.abs(clamped - 7) > 0) {
        if (!ryeVideoEl.paused) ryeVideoEl.pause();
        if (!ryeVideoEl.muted) {
            ryeVideoEl.muted = true;
            const vb = document.getElementById('rye-vol');
            if (vb) vb.classList.remove('unmuted');
        }
        if (ryePlayBool) ryePlayBool.value = false;
    }

    if (Math.abs(clamped - 6) > 0 && mythVideos.length > 0 && mythVideos.some(v => !v.paused)) {
        stopAllMythVideos();
    }

    if (mythLockEl) {
        if (mythDismissed) {
            mythLockEl.style.opacity = 0;
            mythLockEl.style.pointerEvents = 'none';
        } else {
            mythLockEl.style.transition = '';
            const dist = Math.abs(clamped - 6);
            const p = Math.max(0, 1 - dist);
            mythLockEl.style.opacity = p;
            mythLockEl.style.transform = `scale(${0.88 + 0.12 * p})`;
            mythLockEl.style.pointerEvents = p > 0.5 ? 'auto' : 'none';
        }
    }
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


        if (lastSnappedPanel === 6 && snapped !== 6) {
            if (mythLockEl) {
                mythLockEl.classList.remove('unlocked');
                mythLockEl.style.transition = '';
            }
            mythDismissed = false;
            document.getElementById('myth-content').classList.remove('revealed');
            const input = document.getElementById('myth-input');
            if (input) input.value = '';
            sessionStorage.removeItem('myth-unlocked');
        }

        if (showreelVideoEl) {
            if (snapped === 0) {
                showreelVideoEl.play();
                if (showreelPlayBool) showreelPlayBool.value = true;
            } else {
                showreelVideoEl.pause();
                if (showreelPlayBool) showreelPlayBool.value = false;
            }
        }

        if (cookiesVideoEl) {
            if (snapped === 1) {
                cookiesVideoEl.play();
                if (cookiesPlayBool) cookiesPlayBool.value = true;
            } else {
                cookiesVideoEl.pause();
                if (cookiesPlayBool) cookiesPlayBool.value = false;
            }
        }

        if (jellycatVideoEl) {
            if (snapped === 2) { jellycatVideoEl.play(); if (jellycatPlayBool) jellycatPlayBool.value = true; }
            else { jellycatVideoEl.pause(); if (jellycatPlayBool) jellycatPlayBool.value = false; }
        }

        if (bolt6VideoEl) {
            if (snapped === 3) { bolt6VideoEl.play(); if (bolt6PlayBool) bolt6PlayBool.value = true; }
            else { bolt6VideoEl.pause(); if (bolt6PlayBool) bolt6PlayBool.value = false; }
        }

        if (chinatownVideoEl) {
            if (snapped === 5) {
                chinatownVideoEl.play();
                if (chinatownPlayBool) chinatownPlayBool.value = true;
            } else {
                chinatownVideoEl.pause();
                if (chinatownPlayBool) chinatownPlayBool.value = false;
            }
        }

        if (snapped === 4) {
            if (window.pixelsCarouselStart) window.pixelsCarouselStart();
            if (pixelsPlayBool) pixelsPlayBool.value = true;
        } else {
            if (window.pixelsCarouselStop) window.pixelsCarouselStop();
            document.querySelectorAll('.pixels-vid').forEach(v => v.pause());
            if (pixelsPlayBool) pixelsPlayBool.value = false;
        }

        if (divingboardVideoEl) {
            if (snapped === 8) { divingboardVideoEl.play(); if (divingboardPlayBool) divingboardPlayBool.value = true; }
            else { divingboardVideoEl.pause(); if (divingboardPlayBool) divingboardPlayBool.value = false; }
        }

        if (cyclingVideoEl) {
            if (snapped === 7) { cyclingVideoEl.play(); if (cyclingPlayBool) cyclingPlayBool.value = true; }
            else { cyclingVideoEl.pause(); if (cyclingPlayBool) cyclingPlayBool.value = false; }
        }

        if (ryeVideoEl) {
            if (snapped === 7) {
                ryeVideoEl.play();
                if (ryePlayBool) ryePlayBool.value = true;
            } else {
                ryeVideoEl.pause();
                if (ryePlayBool) ryePlayBool.value = false;
            }
        }

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
    if (expandedPanelIndex >= 0) return;
    if (Math.abs(e.deltaY) < 2) return;

    targetPos = Math.max(0, Math.min(panels.length - 1, targetPos + e.deltaY / SCROLL_SCALE));
    startAnim();

    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => moveTo(Math.round(targetPos)), SNAP_DELAY);
}

// --- Touch scroll (iOS / iPad) ---
let touchStartY = 0;
let touchStartTarget = 0;

window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartTarget = targetPos;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (expandedPanelIndex >= 0) return;
    if (experienceOverlay.style.display === 'flex') return;
    e.preventDefault();
    const deltaY = touchStartY - e.touches[0].clientY;
    targetPos = Math.max(0, Math.min(panels.length - 1,
        touchStartTarget + deltaY / (window.innerHeight * 0.3)));
    startAnim();
}, { passive: false });

window.addEventListener('touchend', () => {
    if (expandedPanelIndex >= 0) return;
    if (experienceOverlay.style.display === 'flex') return;
    clearTimeout(snapTimer);
    const snapped = Math.round(targetPos);
    moveTo(snapped);
    if (snapped === 7) {
        if (ryeVideoEl) ryeVideoEl.play().catch(() => {});
        if (cyclingVideoEl) cyclingVideoEl.play().catch(() => {});
    }
});

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

    const avatarCanvas = document.getElementById('exp-avatar-canvas');
    if (avatarCanvas && !expAvatarRive) {
        expAvatarRive = new rive.Rive({
            src: 'Rive/Luket.riv',
            canvas: avatarCanvas,
            artboard: 'Avatar',
            stateMachines: 'State Machine 1',
            autoplay: true,
            layout: new rive.Layout({ fit: rive.Fit.Contain }),
            onLoad() { expAvatarRive.resizeDrawingSurfaceToCanvas(); },
        });
    }
    if (avatarCanvas) avatarCanvas.classList.remove('risen', 'exited');

    experienceOverlay.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        experienceOverlay.classList.add('visible');
        expTimers.push(setTimeout(() => {
            if (avatarCanvas) avatarCanvas.classList.add('risen');
        }, 100));
        expTimers.push(setTimeout(() => {
            if (avatarCanvas) { avatarCanvas.classList.remove('risen'); avatarCanvas.classList.add('exited'); }
        }, 1800));
    }));
}

function hideExperience() {
    expTimers.forEach(clearTimeout);
    expTimers = [];
    experienceOverlay.classList.remove('visible');
    const avatarCanvas = document.getElementById('exp-avatar-canvas');
    if (avatarCanvas) avatarCanvas.classList.remove('risen', 'exited');
    setTimeout(() => {
        experienceOverlay.style.display = 'none';
        buildPanels();
    }, 400);
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

if (!window.matchMedia('(pointer: coarse)').matches) {
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
}

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
        requestAnimationFrame(() => requestAnimationFrame(() => {
            try {
                const src = document.getElementById('loader-canvas');
                const tmp = document.createElement('canvas');
                tmp.width  = 64;
                tmp.height = 64;
                const ctx  = tmp.getContext('2d');
                const scale = 65 / 64;
                const shift = 12;
                ctx.drawImage(src,
                    -(tmp.width  * (scale - 1)) / 2,
                    -(tmp.height * (scale - 1)) / 2 + shift,
                    tmp.width  * scale,
                    tmp.height * scale
                );
                document.getElementById('favicon').href = tmp.toDataURL('image/png');
            } catch(e) {}
        }));
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
        if (showreelVideoEl) {
            showreelVideoEl.play();
            if (showreelPlayBool) showreelPlayBool.value = true;
        }
    }, { once: true });
});

// JellyCat Rive play/pause
const jellycatPlayRive = new rive.Rive({
    src: 'Rive/pause&play.riv',
    canvas: document.getElementById('jellycat-play-canvas'),
    artboard: 'Pause and play',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain }),
    onLoad() {
        jellycatPlayRive.resizeDrawingSurfaceToCanvas();
        const vmi = jellycatPlayRive.viewModelInstance;
        const colorProp = vmi.color('colorProperty');
        if (colorProp) colorProp.value = 0xFFFFAE00;
        jellycatPlayBool = vmi.boolean('puase/play');
        if (jellycatPlayBool) jellycatPlayBool.value = false;
    },
});

const jellycatPlayCanvas = document.getElementById('jellycat-play-canvas');
const jellycatVideoWrap  = document.querySelectorAll('.showreel-video-wrap')[2];
let jellycatFadeTimer    = null;

function startJellycatFadeTimer() {
    clearTimeout(jellycatFadeTimer);
    jellycatFadeTimer = setTimeout(() => {
        jellycatPlayCanvas.classList.add('faded');
        document.getElementById('jellycat-vol').classList.add('faded');
    }, 2000);
}

jellycatVideoWrap.addEventListener('mouseenter', () => {
    clearTimeout(jellycatFadeTimer);
    jellycatPlayCanvas.classList.remove('faded');
    document.getElementById('jellycat-vol').classList.remove('faded');
});
jellycatVideoWrap.addEventListener('mouseleave', () => startJellycatFadeTimer());
startJellycatFadeTimer();

jellycatPlayCanvas.addEventListener('click', () => {
    if (!jellycatVideoEl) return;
    if (jellycatVideoEl.paused) { jellycatVideoEl.play(); if (jellycatPlayBool) jellycatPlayBool.value = true; }
    else { jellycatVideoEl.pause(); if (jellycatPlayBool) jellycatPlayBool.value = false; }
    startJellycatFadeTimer();
});

const jellycatVolBtn = document.getElementById('jellycat-vol');
jellycatVolBtn.addEventListener('click', () => {
    jellycatVideoEl.muted = !jellycatVideoEl.muted;
    jellycatVolBtn.classList.toggle('unmuted', !jellycatVideoEl.muted);
    startJellycatFadeTimer();
});

// Bolt6 Rive play/pause
const bolt6PlayRive = new rive.Rive({
    src: 'Rive/pause&play.riv',
    canvas: document.getElementById('bolt6-play-canvas'),
    artboard: 'Pause and play',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain }),
    onLoad() {
        bolt6PlayRive.resizeDrawingSurfaceToCanvas();
        const vmi = bolt6PlayRive.viewModelInstance;
        const colorProp = vmi.color('colorProperty');
        if (colorProp) colorProp.value = 0xFF00346B;
        bolt6PlayBool = vmi.boolean('puase/play');
        if (bolt6PlayBool) bolt6PlayBool.value = false;
    },
});

const bolt6PlayCanvas = document.getElementById('bolt6-play-canvas');
const bolt6VideoWrap  = document.querySelectorAll('.showreel-video-wrap')[3];
let bolt6FadeTimer    = null;

function startBolt6FadeTimer() {
    clearTimeout(bolt6FadeTimer);
    bolt6FadeTimer = setTimeout(() => {
        bolt6PlayCanvas.classList.add('faded');
        document.getElementById('bolt6-vol').classList.add('faded');
    }, 2000);
}

bolt6VideoWrap.addEventListener('mouseenter', () => {
    clearTimeout(bolt6FadeTimer);
    bolt6PlayCanvas.classList.remove('faded');
    document.getElementById('bolt6-vol').classList.remove('faded');
});
bolt6VideoWrap.addEventListener('mouseleave', () => startBolt6FadeTimer());
startBolt6FadeTimer();

bolt6PlayCanvas.addEventListener('click', () => {
    if (!bolt6VideoEl) return;
    if (bolt6VideoEl.paused) { bolt6VideoEl.play(); if (bolt6PlayBool) bolt6PlayBool.value = true; }
    else { bolt6VideoEl.pause(); if (bolt6PlayBool) bolt6PlayBool.value = false; }
    startBolt6FadeTimer();
});

const bolt6VolBtn = document.getElementById('bolt6-vol');
bolt6VolBtn.addEventListener('click', () => {
    bolt6VideoEl.muted = !bolt6VideoEl.muted;
    bolt6VolBtn.classList.toggle('unmuted', !bolt6VideoEl.muted);
    startBolt6FadeTimer();
});

showreelVideoEl = document.getElementById('showreel-video');
cookiesVideoEl      = document.getElementById('cookies-video');
jellycatVideoEl     = document.getElementById('jellycat-video');
bolt6VideoEl        = document.getElementById('bolt6-video');
chinatownVideoEl    = document.getElementById('chinatown-video');
pixelsVideoEl       = document.getElementById('pixels-video');

// 44 Pixels carousel
(function() {
    const track  = document.getElementById('pixels-carousel-track');
    const items  = Array.from(track.querySelectorAll('.pixels-carousel-item'));
    const videos = Array.from(track.querySelectorAll('.pixels-vid'));
    let current  = 0;
    let timer    = null;

    function goTo(index) {
        current = ((index % items.length) + items.length) % items.length;
        track.style.transform = `translateX(-${current * 100}%)`;
        items.forEach((item, i) => {
            item.classList.toggle('active', i === current);
        });
        videos.forEach((v, i) => {
            if (i === current) { v.currentTime = 0; v.play(); }
            else { v.pause(); v.currentTime = 0; }
        });
    }

    function startCarousel() {
        stopCarousel();
        timer = setInterval(() => goTo(current + 1), 4000);
    }

    function stopCarousel() { clearInterval(timer); }

    document.getElementById('pixels-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(current - 1);
    });
    document.getElementById('pixels-next').addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(current + 1);
    });

    videos.forEach(v => {
        v.addEventListener('ended', () => { v.currentTime = 0; v.play(); });
    });

    window.pixelsCarouselStart = () => {};
    window.pixelsCarouselStop  = stopCarousel;

    goTo(0);
})();
divingboardVideoEl  = document.getElementById('divingboard-video');
cyclingVideoEl      = document.getElementById('cycling-video');
ryeVideoEl          = document.getElementById('rye-video');

// Showreel Rive play/pause button
const showreelPlayRive = new rive.Rive({
    src: 'Rive/pause&play.riv',
    canvas: document.getElementById('showreel-play-canvas'),
    artboard: 'Pause and play',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain }),
    onLoad() {
        showreelPlayRive.resizeDrawingSurfaceToCanvas();
        const vmi = showreelPlayRive.viewModelInstance;
        const colorProp = vmi.color('colorProperty');
        if (colorProp) colorProp.value = 0xFFBEBEBE;
        showreelPlayBool = vmi.boolean('puase/play');
        if (showreelPlayBool) showreelPlayBool.value = false;
    },
});

const showreelPlayCanvas = document.getElementById('showreel-play-canvas');
const showreelVideoWrap = document.querySelector('.showreel-video-wrap');
let showreelFadeTimer = null;

function startFadeTimer() {
    clearTimeout(showreelFadeTimer);
    showreelFadeTimer = setTimeout(() => {
        showreelPlayCanvas.classList.add('faded');
        document.getElementById('showreel-vol').classList.add('faded');
    }, 2000);
}

showreelVideoWrap.addEventListener('mouseenter', () => {
    clearTimeout(showreelFadeTimer);
    showreelPlayCanvas.classList.remove('faded');
    document.getElementById('showreel-vol').classList.remove('faded');
});

showreelVideoWrap.addEventListener('mouseleave', () => startFadeTimer());

startFadeTimer();

showreelPlayCanvas.addEventListener('click', () => {
    if (!showreelVideoEl) return;
    if (showreelVideoEl.paused) {
        showreelVideoEl.play();
        if (showreelPlayBool) showreelPlayBool.value = true;
    } else {
        showreelVideoEl.pause();
        if (showreelPlayBool) showreelPlayBool.value = false;
    }
    startFadeTimer();
});

const showreelVolBtn = document.getElementById('showreel-vol');
showreelVolBtn.addEventListener('click', () => {
    showreelVideoEl.muted = !showreelVideoEl.muted;
    showreelVolBtn.classList.toggle('unmuted', !showreelVideoEl.muted);
    startFadeTimer();
});

// Do you accept cookies? Rive play/pause
const cookiesPlayRive = new rive.Rive({
    src: 'Rive/pause&play.riv',
    canvas: document.getElementById('cookies-play-canvas'),
    artboard: 'Pause and play',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain }),
    onLoad() {
        cookiesPlayRive.resizeDrawingSurfaceToCanvas();
        const vmi = cookiesPlayRive.viewModelInstance;
        const colorProp = vmi.color('colorProperty');
        if (colorProp) colorProp.value = 0xFF5470FF;
        cookiesPlayBool = vmi.boolean('puase/play');
        if (cookiesPlayBool) cookiesPlayBool.value = false;
    },
});

const cookiesPlayCanvas = document.getElementById('cookies-play-canvas');
const cookiesVideoWrap = document.querySelectorAll('.showreel-video-wrap')[1];
let cookiesFadeTimer = null;

function startCookiesFadeTimer() {
    clearTimeout(cookiesFadeTimer);
    cookiesFadeTimer = setTimeout(() => {
        cookiesPlayCanvas.classList.add('faded');
        document.getElementById('cookies-vol').classList.add('faded');
    }, 2000);
}

cookiesVideoWrap.addEventListener('mouseenter', () => {
    clearTimeout(cookiesFadeTimer);
    cookiesPlayCanvas.classList.remove('faded');
    document.getElementById('cookies-vol').classList.remove('faded');
});
cookiesVideoWrap.addEventListener('mouseleave', () => startCookiesFadeTimer());
startCookiesFadeTimer();

cookiesPlayCanvas.addEventListener('click', () => {
    if (!cookiesVideoEl) return;
    if (cookiesVideoEl.paused) {
        cookiesVideoEl.play();
        if (cookiesPlayBool) cookiesPlayBool.value = true;
    } else {
        cookiesVideoEl.pause();
        if (cookiesPlayBool) cookiesPlayBool.value = false;
    }
    startCookiesFadeTimer();
});

const cookiesVolBtn = document.getElementById('cookies-vol');
cookiesVolBtn.addEventListener('click', () => {
    cookiesVideoEl.muted = !cookiesVideoEl.muted;
    cookiesVolBtn.classList.toggle('unmuted', !cookiesVideoEl.muted);
    startCookiesFadeTimer();
});



// Diving Board Rive play/pause
const divingboardPlayRive = new rive.Rive({
    src: 'Rive/pause&play.riv',
    canvas: document.getElementById('divingboard-play-canvas'),
    artboard: 'Pause and play',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain }),
    onLoad() {
        divingboardPlayRive.resizeDrawingSurfaceToCanvas();
        const vmi = divingboardPlayRive.viewModelInstance;
        const colorProp = vmi.color('colorProperty');
        if (colorProp) colorProp.value = 0xFFFFB0F8;
        divingboardPlayBool = vmi.boolean('puase/play');
        if (divingboardPlayBool) divingboardPlayBool.value = false;
    },
});

const divingboardPlayCanvas = document.getElementById('divingboard-play-canvas');
const divingboardVideoWrap  = document.querySelectorAll('.showreel-video-wrap')[8];
let divingboardFadeTimer    = null;

function startDivingboardFadeTimer() {
    clearTimeout(divingboardFadeTimer);
    divingboardFadeTimer = setTimeout(() => {
        divingboardPlayCanvas.classList.add('faded');
        document.getElementById('divingboard-vol').classList.add('faded');
    }, 2000);
}

divingboardVideoWrap.addEventListener('mouseenter', () => {
    clearTimeout(divingboardFadeTimer);
    divingboardPlayCanvas.classList.remove('faded');
    document.getElementById('divingboard-vol').classList.remove('faded');
});
divingboardVideoWrap.addEventListener('mouseleave', () => startDivingboardFadeTimer());
startDivingboardFadeTimer();

divingboardPlayCanvas.addEventListener('click', () => {
    if (!divingboardVideoEl) return;
    if (divingboardVideoEl.paused) { divingboardVideoEl.play(); if (divingboardPlayBool) divingboardPlayBool.value = true; }
    else { divingboardVideoEl.pause(); if (divingboardPlayBool) divingboardPlayBool.value = false; }
    startDivingboardFadeTimer();
});

const divingboardVolBtn = document.getElementById('divingboard-vol');
divingboardVolBtn.addEventListener('click', () => {
    divingboardVideoEl.muted = !divingboardVideoEl.muted;
    divingboardVolBtn.classList.toggle('unmuted', !divingboardVideoEl.muted);
    startDivingboardFadeTimer();
});

// Cycling Rive play/pause
const cyclingPlayRive = new rive.Rive({
    src: 'Rive/pause&play.riv',
    canvas: document.getElementById('cycling-play-canvas'),
    artboard: 'Pause and play',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain }),
    onLoad() {
        cyclingPlayRive.resizeDrawingSurfaceToCanvas();
        const vmi = cyclingPlayRive.viewModelInstance;
        const colorProp = vmi.color('colorProperty');
        if (colorProp) colorProp.value = 0xFF00794A;
        cyclingPlayBool = vmi.boolean('puase/play');
        if (cyclingPlayBool) cyclingPlayBool.value = false;
    },
});

const cyclingPlayCanvas = document.getElementById('cycling-play-canvas');
const cyclingVideoWrap  = document.querySelectorAll('.showreel-video-wrap')[7];
let cyclingFadeTimer    = null;

function startCyclingFadeTimer() {
    clearTimeout(cyclingFadeTimer);
    cyclingFadeTimer = setTimeout(() => {
        cyclingPlayCanvas.classList.add('faded');
        document.getElementById('cycling-vol').classList.add('faded');
    }, 2000);
}

cyclingVideoWrap.addEventListener('mouseenter', () => {
    clearTimeout(cyclingFadeTimer);
    cyclingPlayCanvas.classList.remove('faded');
    document.getElementById('cycling-vol').classList.remove('faded');
});
cyclingVideoWrap.addEventListener('mouseleave', () => startCyclingFadeTimer());
startCyclingFadeTimer();

cyclingPlayCanvas.addEventListener('click', () => {
    if (!cyclingVideoEl) return;
    if (cyclingVideoEl.paused) { cyclingVideoEl.play(); if (cyclingPlayBool) cyclingPlayBool.value = true; }
    else { cyclingVideoEl.pause(); if (cyclingPlayBool) cyclingPlayBool.value = false; }
    startCyclingFadeTimer();
});

const cyclingVolBtn = document.getElementById('cycling-vol');
cyclingVolBtn.addEventListener('click', () => {
    cyclingVideoEl.muted = !cyclingVideoEl.muted;
    cyclingVolBtn.classList.toggle('unmuted', !cyclingVideoEl.muted);
    startCyclingFadeTimer();
});

// Rye Lane Bagels Rive play/pause
const ryePlayRive = new rive.Rive({
    src: 'Rive/pause&play.riv',
    canvas: document.getElementById('rye-play-canvas'),
    artboard: 'Pause and play',
    stateMachines: 'State Machine 1',
    autoplay: true,
    autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain }),
    onLoad() {
        ryePlayRive.resizeDrawingSurfaceToCanvas();
        const vmi = ryePlayRive.viewModelInstance;
        const colorProp = vmi.color('colorProperty');
        if (colorProp) colorProp.value = 0xFF00794A;
        ryePlayBool = vmi.boolean('puase/play');
        if (ryePlayBool) ryePlayBool.value = false;
    },
});

const ryePlayCanvas  = document.getElementById('rye-play-canvas');
const ryeVideoWrap   = document.querySelectorAll('.showreel-video-wrap')[6];
let ryeFadeTimer     = null;

function startRyeFadeTimer() {
    clearTimeout(ryeFadeTimer);
    ryeFadeTimer = setTimeout(() => {
        ryePlayCanvas.classList.add('faded');
        document.getElementById('rye-vol').classList.add('faded');
    }, 2000);
}

ryeVideoWrap.addEventListener('mouseenter', () => {
    clearTimeout(ryeFadeTimer);
    ryePlayCanvas.classList.remove('faded');
    document.getElementById('rye-vol').classList.remove('faded');
});
ryeVideoWrap.addEventListener('mouseleave', () => startRyeFadeTimer());
startRyeFadeTimer();

ryePlayCanvas.addEventListener('click', () => {
    if (!ryeVideoEl) return;
    if (ryeVideoEl.paused) {
        ryeVideoEl.play();
        if (ryePlayBool) ryePlayBool.value = true;
    } else {
        ryeVideoEl.pause();
        if (ryePlayBool) ryePlayBool.value = false;
    }
    startRyeFadeTimer();
});

const ryeVolBtn = document.getElementById('rye-vol');
ryeVolBtn.addEventListener('click', () => {
    ryeVideoEl.muted = !ryeVideoEl.muted;
    ryeVolBtn.classList.toggle('unmuted', !ryeVideoEl.muted);
    startRyeFadeTimer();
});

// Vimeo overlay — intercepts scroll, lets click through to player
const vimeoOverlay = document.getElementById('vimeo-overlay');
const vimeoWrap    = document.querySelector('.vimeo-wrap');

vimeoOverlay.addEventListener('wheel', (e) => {
    e.preventDefault();
    onWheel(e);
}, { passive: false });

vimeoOverlay.addEventListener('click', () => {
    vimeoOverlay.style.display = 'none';
});

vimeoWrap.addEventListener('mouseleave', () => {
    vimeoOverlay.style.display = '';
});

// Video timelines
function setupTimeline(video, timelineEl, progressEl) {
    video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        progressEl.style.width = (video.currentTime / video.duration * 100) + '%';
    });
    timelineEl.addEventListener('click', (e) => {
        if (!video.duration) return;
        const rect = timelineEl.getBoundingClientRect();
        video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
    });
    let dragging = false;
    timelineEl.addEventListener('mousedown', () => dragging = true);
    window.addEventListener('mouseup', () => dragging = false);
    window.addEventListener('mousemove', (e) => {
        if (!dragging || !video.duration) return;
        const rect = timelineEl.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        video.currentTime = pct * video.duration;
    });
}

setupTimeline(
    document.getElementById('showreel-video'),
    document.getElementById('showreel-timeline'),
    document.getElementById('showreel-progress')
);
setupTimeline(
    document.getElementById('cookies-video'),
    document.getElementById('cookies-timeline'),
    document.getElementById('cookies-progress')
);

// Myth Studio videos
mythVideos = Array.from(document.querySelectorAll('.myth-video'));

function stopAllMythVideos() {
    mythVideos.forEach(video => {
        video.pause();
        video.muted = true;
    });
}

// Panel fullscreen expand/collapse
const tabRow = document.querySelector('.tab-row');

function expandPanel(index) {
    expandedPanelIndex = index;
    const tr = 'flex-grow 0.45s cubic-bezier(0.4,0,0.2,1), flex-basis 0.45s cubic-bezier(0.4,0,0.2,1), min-width 0.45s ease, min-height 0.45s ease';
    tabRow.style.transition = 'gap 0.45s ease';
    tabRow.style.gap = '0';
    panels.forEach((p, i) => {
        p.style.transition = tr;
        p.style.flexGrow   = i === index ? '1' : '0';
        p.style.flexBasis  = '0';
        p.style.minWidth   = '0';
        p.style.minHeight  = '0';
    });
    setTimeout(() => {
        panels.forEach(p => p.style.transition = '');
        tabRow.style.transition = '';
    }, 450);
}

function collapsePanel() {
    expandedPanelIndex = -1;
    const tr = 'flex-grow 0.45s cubic-bezier(0.4,0,0.2,1), flex-basis 0.45s cubic-bezier(0.4,0,0.2,1), min-width 0.45s ease, min-height 0.45s ease';
    tabRow.style.transition = 'gap 0.45s ease';
    tabRow.style.gap = '';
    panels.forEach(p => {
        p.style.transition = tr;
        p.style.minWidth   = '';
        p.style.minHeight  = '';
    });
    setTimeout(() => {
        panels.forEach(p => p.style.transition = '');
        tabRow.style.transition = '';
        renderAt(visualPos);
    }, 450);
}

// Rye Lane expand/collapse
document.getElementById('rye-expand').addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = panels[7].classList.contains('expanded');
    panels[7].classList.toggle('expanded');
    if (!isExpanded) {
        panels.forEach(p => p.classList.remove('active'));
        panels[7].classList.add('active');
        targetPos = 7;
        visualPos = 7;
        lastSnappedPanel = 7;
        typewriteTitle(panelTitles[7]);
        expandPanel(7);
    } else {
        collapsePanel();
    }
});

// Myth Studio expand/collapse
const mythGrid = document.querySelector('.myth-grid');
const mythVideoWraps = document.querySelectorAll('.myth-video-wrap');

document.getElementById('myth-expand').addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = panels[6].classList.contains('expanded');
    panels[6].classList.toggle('expanded');
    if (!isExpanded) {
        panels.forEach(p => p.classList.remove('active'));
        panels[6].classList.add('active');
        targetPos = 6;
        visualPos = 6;
        lastSnappedPanel = 6;
        typewriteTitle(panelTitles[6]);
        expandPanel(6);
        const n = mythVideos.length;
        const portrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
        const mythContent = document.getElementById('myth-content');
        mythVideoWraps.forEach(w => { w.style.display = 'block'; });
        if (portrait) {
            mythGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            mythGrid.style.gridTemplateRows    = '';
            mythGrid.style.height              = '';
            mythContent.style.overflow         = 'auto';
        } else {
            mythGrid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
            mythGrid.style.gridTemplateRows    = '1fr';
            mythGrid.style.height              = 'calc(100vh - 280px)';
            mythContent.style.overflow         = 'hidden';
            mythVideoWraps.forEach(w => { w.style.aspectRatio = 'unset'; w.style.height = '100%'; });
        }
    } else {
        mythGrid.style.gridTemplateColumns = '';
        mythGrid.style.gridTemplateRows    = '';
        mythGrid.style.height              = '';
        document.getElementById('myth-content').style.overflow = '';
        mythVideoWraps.forEach(w => { w.style.display = ''; w.style.aspectRatio = ''; w.style.height = ''; });
        collapsePanel();
    }
});

// Bolt6 expand/collapse
let bolt6RivesLoaded = false;

function loadBolt6Rives() {
    if (bolt6RivesLoaded) return;
    bolt6RivesLoaded = true;
    const canvas = document.getElementById('bolt6-rive-1');
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = 300 * dpr;
    canvas.height = 300 * dpr;
    const bolt6Rive = new rive.Rive({
        src: 'Rive/tristam.riv',
        canvas,
        stateMachines: 'State Machine 1',
        autoplay: true,
        layout: new rive.Layout({ fit: rive.Fit.Contain }),
        onLoad() {
            bolt6Rive.resizeDrawingSurfaceToCanvas();
        },
    });
    window.addEventListener('resize', () => bolt6Rive.resizeDrawingSurfaceToCanvas());
}

document.getElementById('bolt6-expand').addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = panels[3].classList.contains('expanded');
    panels[3].classList.toggle('expanded');
    if (!isExpanded) {
        panels.forEach(p => p.classList.remove('active'));
        panels[3].classList.add('active');
        targetPos = 3;
        visualPos = 3;
        lastSnappedPanel = 3;
        typewriteTitle(panelTitles[3]);
        expandPanel(3);
        loadBolt6Rives();
    } else {
        collapsePanel();
    }
});

// JellyCat expand/collapse
document.getElementById('jellycat-expand').addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = panels[2].classList.contains('expanded');
    panels[2].classList.toggle('expanded');
    if (!isExpanded) {
        panels.forEach(p => p.classList.remove('active'));
        panels[2].classList.add('active');
        targetPos = 2;
        visualPos = 2;
        lastSnappedPanel = 2;
        typewriteTitle(panelTitles[2]);
        expandPanel(2);
    } else {
        collapsePanel();
    }
});

// Cookies expand/collapse
document.getElementById('cookies-expand').addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = panels[1].classList.contains('expanded');
    panels[1].classList.toggle('expanded');
    if (!isExpanded) {
        panels.forEach(p => p.classList.remove('active'));
        panels[1].classList.add('active');
        targetPos = 1;
        visualPos = 1;
        lastSnappedPanel = 1;
        typewriteTitle(panelTitles[1]);
        expandPanel(1);
    } else {
        collapsePanel();
    }
});

// Myth Studio password lock
const MYTH_PASSWORD = 'luke2001';
mythLockEl = document.getElementById('myth-lock');
mythLockEl.style.opacity = '0';
const mythForm  = document.getElementById('myth-form');
const mythInput = document.getElementById('myth-input');

sessionStorage.removeItem('myth-unlocked');

document.getElementById('myth-relock').addEventListener('click', () => {
    mythLockEl.classList.remove('unlocked');
    mythInput.value = '';
    sessionStorage.removeItem('myth-unlocked');
});

mythForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (mythInput.value === MYTH_PASSWORD) {
        mythLockEl.classList.add('unlocked');
        sessionStorage.setItem('myth-unlocked', '1');
        setTimeout(() => {
            mythLockEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            mythDismissed = true;
            document.getElementById('myth-content').classList.add('revealed');
            mythVideos = Array.from(document.querySelectorAll('.myth-video'));
            mythVideos.forEach(v => v.play());
            renderAt(visualPos);
        }, 1000);
    } else {
        mythInput.value = '';
        mythInput.placeholder = 'Incorrect';
        setTimeout(() => { mythInput.placeholder = 'Password'; }, 1500);
    }
});

