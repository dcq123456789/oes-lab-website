// ===== OES Lab Website — Application =====
// Data layer, routing, rendering, cursor, reveal animations
// Optimized: single init flow, no race condition

let DATA = {};
let carouselIndex = 0;
let carouselTimer;

// ===== Data Loader =====
// Load merged data.json directly
async function loadData() {
    var files = ['directions', 'members', 'publications', 'news', 'carousel'];

    try {
        var res = await fetch('./data/data.json', { cache: 'reload' });
        var merged = await res.json();
        for (var k in merged) {
            if (merged.hasOwnProperty(k)) DATA[k] = merged[k];
        }
    } catch (e) {
        console.error('Failed to load data.json', e);
    }

    // Ensure all keys exist
    files.forEach(function (k) {
        if (!DATA[k]) DATA[k] = [];
    });
}

function getData(key) {
    return DATA[key] || [];
}

// ===== Page Routing =====
const PAGES = {
    'home': { title: 'OES实验室 - 光学·电学·传感' },
    'research': { title: 'OES实验室 - 研究方向' },
    'member': { title: 'OES实验室 - 团队成员' },
    'news': { title: 'OES实验室 - 新闻动态' },
    'publications': { title: 'OES实验室 - 发表论文' },
    'contact': { title: 'OES实验室 - 联系我们' }
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    window.scrollTo(0, 0);
    document.querySelectorAll('.nav-link').forEach(function (link) {
        var lp = link.dataset.page;
        link.classList.toggle('active', lp === pageId);
    });
    document.querySelectorAll('.mobile-link').forEach(function (link) {
        var lp = link.dataset.page;
        link.classList.toggle('active', lp === pageId);
    });
}

function navigate(hash) {
    var path = hash.replace('#/', '').replace('#', '') || 'home';
    var parts = path.split('/');
    if (parts[0] === 'member') {
        if (!_rendered.members) { renderMemberList(); _rendered.members = true; }
        if (parts[1]) {
            var id = parseInt(parts[1]);
            showPage('member');
            showMemberProfile(id);
            var members = getData('members');
            var m = members.find(function (x) { return x.id === id; });
            document.title = m ? 'OES实验室 - ' + m.name : PAGES.member.title;
        } else {
            showPage('member');
            showMemberList();
            document.title = PAGES.member.title;
        }
    } else if (parts[0] === 'news') {
        if (!_rendered.news) { renderNewsPage(); _rendered.news = true; }
        if (parts[1]) {
            var nid = parseInt(parts[1]);
            showPage('news');
            showNewsDetail(nid);
            var news = getData('news');
            var n = news.find(function (x) { return x.id === nid; });
            document.title = n ? 'OES实验室 - ' + n.title : PAGES.news.title;
        } else {
            showPage('news');
            showNewsList();
            document.title = PAGES.news.title;
        }
    } else if (parts[0] === 'research') {
        if (!_rendered.research) { renderResearchDetail(); _rendered.research = true; }
        showPage('research');
        document.title = PAGES.research.title;
    } else if (parts[0] === 'publications') {
        if (!_rendered.publications) { populateYearFilter(); renderPubList(); renderStats(); _rendered.publications = true; }
        showPage('publications');
        document.title = PAGES.publications.title;
    } else if (PAGES[parts[0]]) {
        showPage(parts[0]);
        document.title = PAGES[parts[0]].title;
    } else {
        showPage('home');
        document.title = PAGES.home.title;
    }
}

function toggleMobile() {
    document.getElementById('mobile-menu').classList.toggle('open');
}

// ===== Filter helpers (called from inline onclick) =====
function filterByCategory(cat) {
    currentMemberFilter = cat;
    showPage('member');
    showMemberList();
    renderMemberList();
    document.querySelectorAll('.member-filter-btn').forEach(function (btn) {
        btn.className = 'filter-btn member-filter-btn' + (btn.dataset.cat === cat ? ' active' : '');
    });
    document.getElementById('mobile-menu').classList.remove('open');
}

function filterNewsByCategory(cat) {
    currentNewsFilter = cat;
    showPage('news');
    showNewsList();
    renderNewsPage();
    document.querySelectorAll('.news-filter-btn').forEach(function (btn) {
        btn.className = 'filter-btn news-filter-btn' + (btn.dataset.cat === cat ? ' active' : '');
    });
    document.getElementById('mobile-menu').classList.remove('open');
}

// ===== Custom Cursor =====
(function initCursor() {
    if ('ontouchstart' in window) return;
    var outer = document.getElementById('cursorOuter');
    var inner = document.getElementById('cursorInner');
    if (!outer || !inner) return;
    var mx = 0, my = 0, ox = 0, oy = 0, ix = 0, iy = 0;
    document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; });
    function lerp() {
        ox += (mx - ox) * 0.12;
        oy += (my - oy) * 0.12;
        ix += (mx - ix) * 0.25;
        iy += (my - iy) * 0.25;
        outer.style.left = ox + 'px';
        outer.style.top = oy + 'px';
        inner.style.left = ix + 'px';
        inner.style.top = iy + 'px';
        requestAnimationFrame(lerp);
    }
    lerp();
    document.addEventListener('mouseleave', function () { outer.style.opacity = '0'; inner.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { outer.style.opacity = '1'; inner.style.opacity = '1'; });
    document.querySelectorAll('a, button, .card, .research-card, .contact-item, .map-placeholder, .filter-btn, .member-card, .stat-card').forEach(function (el) {
        el.addEventListener('mouseenter', function () { outer.classList.add('hover'); });
        el.addEventListener('mouseleave', function () { outer.classList.remove('hover'); });
    });
})();

// ===== Scroll Reveal =====
(function initReveal() {
    try {
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) {
                        e.target.classList.add('show');
                        observer.unobserve(e.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
            document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
        } else {
            document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('show'); });
        }
    } catch (e) { console.warn('initReveal:', e); }
})();

// ===== Counter Animation =====
function animateCounter(el, target, duration) {
    var start = performance.now();
    function update(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target);
        if (t < 1) requestAnimationFrame(update);
        else el.textContent = target;
    }
    requestAnimationFrame(update);
}

// ===== Avatar =====
function renderAvatar(m) {
    if (m.photo) {
        return '<img src="' + m.photo + '" alt="' + m.name + '" loading="lazy" decoding="async" class="member-avatar">';
    }
    return '<div class="member-avatar-placeholder" style="width:96px;height:96px;font-size:36px">' + m.name.charAt(0) + '</div>';
}

// ===== HTML Escape (basic XSS prevention) =====
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Carousel =====
function getCarouselItems() {
    return getData('carousel').sort(function (a, b) { return a.sortOrder - b.sortOrder; });
}

function renderCarousel() {
    var track = document.getElementById('carousel-track');
    var dots = document.getElementById('carousel-dots');
    if (!track) return;
    var tailwindColors = { 'blue': '#3b82f6', 'sky': '#38bdf8', 'indigo': '#6366f1', 'purple': '#a855f7', 'pink': '#ec4899', 'emerald': '#10b981', 'teal': '#14b8a6', 'cyan': '#06b6d4', 'violet': '#8b5cf6', 'fuchsia': '#d946ef', 'rose': '#f43f5e', 'slate': '#64748b', 'gray': '#6b7280', 'neutral': '#737373', 'stone': '#78716c', 'red': '#ef4444', 'orange': '#f97316', 'amber': '#f59e0b', 'yellow': '#eab308', 'lime': '#84cc16', 'green': '#22c55e' };
    function parseBg(bg) {
        var parts = (bg || '').split(' ');
        var from = parts[0] || '', to = parts[1] || '';
        var fromColor = from.startsWith('from-') ? from.replace('from-', '').replace(/-\d+$/, '') : '';
        var toColor = to.startsWith('to-') ? to.replace('to-', '').replace(/-\d+$/, '') : '';
        var c1 = tailwindColors[fromColor] || '#3b82f6';
        var c2 = tailwindColors[toColor] || '#8b5cf6';
        return 'linear-gradient(135deg,' + c1 + ',' + c2 + ')';
    }
    var items = getCarouselItems();
    track.innerHTML = items.map(function (item) {
        var bgStyle = '';
        var bgImg = '';
        if (item.image) {
            bgImg = '<img src="' + esc(item.image) + '" alt="" class="carousel-bg-img">';
        } else {
            bgStyle = ' style="background:' + parseBg(item.bg) + ';"';
        }
        var overlay = item.image ? '<div class="carousel-overlay" style="background:rgba(0,0,0,0.25)"></div>' : '<div class="carousel-overlay" style="background:rgba(0,0,0,0.2)"></div>';
        var clickHandler = item.link ? (item.link.startsWith('#') ? ' onclick="window.location.href=\'' + esc(item.link) + '\'"' : ' onclick="window.open(\'' + esc(item.link) + '\',\'_blank\')"') : '';
        return '<div class="carousel-slide' + (item.link ? ' carousel-linked' : '') + '"' + bgStyle + clickHandler + ' role="group" aria-roledescription="slide" aria-label="' + esc(item.title) + '">' +
            bgImg +
            overlay +
            '<div class="carousel-content">' +
            '<div class="carousel-icon">' + esc(item.icon) + '</div>' +
            '<div class="carousel-title">' + esc(item.title) + '</div>' +
            '<div class="carousel-desc">' + esc(item.desc) + '</div>' +
            '</div></div>';
    }).join('');
    dots.innerHTML = items.map(function (_, i) {
        return '<button onclick="carouselGo(' + i + ')" class="carousel-dot" style="width:10px;height:10px;border-radius:50%;border:none;cursor:pointer;transition:all 0.3s;background:' + (i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.3)') + '" aria-label="幻灯片 ' + (i + 1) + '"></button>';
    }).join('');
    startCarousel();
}

function carouselGo(index) {
    carouselIndex = index;
    var track = document.getElementById('carousel-track');
    if (track) track.style.transform = 'translateX(-' + (index * 100) + '%)';
    document.querySelectorAll('#carousel-dots button').forEach(function (dot, i) {
        dot.style.background = i === index ? 'var(--accent)' : 'rgba(255,255,255,0.3)';
    });
    resetCarousel();
}

function carouselPrev() { carouselGo((carouselIndex - 1 + getCarouselItems().length) % getCarouselItems().length); }
function carouselNext() { carouselGo((carouselIndex + 1) % getCarouselItems().length); }
function startCarousel() { carouselTimer = setInterval(carouselNext, 5000); }
function resetCarousel() { clearInterval(carouselTimer); startCarousel(); }

// ===== Home Tags =====
function renderHomeTags() {
    var directions = getData('directions');
    var container = document.getElementById('home-tags');
    if (!container) return;
    container.innerHTML = directions.map(function (d) {
        var label = d.title.replace(/\s*\(.*\)/, '');
        return '<span class="tag">' + esc(label) + '</span>';
    }).join('');
}

// ===== Home Research =====
function renderHomeResearch() {
    var directions = getData('directions');
    var container = document.getElementById('home-research');
    if (!container) return;
    container.innerHTML = directions.map(function (d) {
        var iconHtml = d.image
            ? '<img src="' + esc(d.image) + '" loading="lazy" width="64" height="64" alt="" style="object-fit:cover;border-radius:var(--radius-lg);margin-bottom:var(--space-md)">'
            : '<div style="width:64px;height:64px;border-radius:var(--radius-lg);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:var(--space-md)">' + esc(d.icon) + '</div>';
        return '<a href="#/research" class="card">' +
            iconHtml +
            '<h3 class="h3" style="margin-bottom:var(--space-sm)">' + esc(d.title.replace(/\s*\(.*\)/, '')) + '</h3>' +
            '<p class="body">' + esc(d.description) + '</p></a>';
    }).join('');
}

// ===== Research Detail =====
function renderResearchDetail() {
    var directions = getData('directions');
    var container = document.getElementById('research-detail');
    if (!container) return;
    container.innerHTML = directions.map(function (d) {
        var items = d.subItems || [];
        var iconHtml = d.image
            ? '<img src="' + esc(d.image) + '" loading="lazy" width="140" height="140" alt="" style="object-fit:cover;border-radius:var(--radius-xl)">'
            : '<div style="width:140px;height:140px;border-radius:var(--radius-xl);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:56px">' + esc(d.icon) + '</div>';
        return '<div class="research-card">' +
            '<div class="research-visual" style="background:' + (d.bgColor || 'var(--bg-card)') + '">' + iconHtml + '</div>' +
            '<div class="research-body">' +
            '<h2>' + esc(d.title) + '</h2>' +
            '<p class="body" style="margin-bottom:var(--space-md)">' + esc(d.description) + '</p>' +
            '<ul>' + items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>' +
            '</div></div>';
    }).join('');
}

// ===== Home Team =====
function renderHomeTeam() {
    var members = getData('members');
    var container = document.getElementById('home-team');
    if (!container) return;
    container.innerHTML = members.slice(0, 4).map(function (m) {
        return '<a href="#/member/' + m.id + '" class="card card-compact member-card text-center">' +
            renderAvatar(m) +
            '<h3 class="fw-600">' + esc(m.name) + '</h3>' +
            '<p class="text-accent small fw-500" style="margin-top:2px">' + esc(m.role) + '</p></a>';
    }).join('');
}

// ===== Home News =====
function renderHomeNews() {
    var news = getData('news');
    var container = document.getElementById('home-news');
    if (!container) return;
    if (news.length === 0) {
        container.innerHTML = '<p class="body text-center" style="grid-column:1/-1;padding:var(--space-3xl) 0">暂无新闻</p>';
        return;
    }
    container.innerHTML = news.slice(0, 3).map(function (n) {
        return '<a href="#/news/' + n.id + '" class="card news-card">' +
            '<div class="news-meta">' +
            '<span class="tag tag-sm">' + esc(n.category || '其他') + '</span>' +
            '<span class="micro" style="text-transform:none;letter-spacing:normal">' + esc(n.date) + '</span>' +
            '</div>' +
            '<h3 class="news-title">' + esc(n.title) + '</h3>' +
            '<p class="news-excerpt">' + esc(n.content) + '</p></a>';
    }).join('');
}

// ===== Member =====
var currentMemberFilter = '';

function renderMemberList() {
    var members = getData('members');
    var filtered = currentMemberFilter ? members.filter(function (m) { return m.category === currentMemberFilter; }) : members;
    var container = document.getElementById('member-detail');
    var empty = document.getElementById('member-empty');
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';
    container.innerHTML = filtered.map(function (m) {
        return '<a href="#/member/' + m.id + '" class="card card-compact member-card text-center">' +
            renderAvatar(m) +
            '<h3 class="fw-600">' + esc(m.name) + '</h3>' +
            '<p class="text-accent small fw-500" style="margin-top:2px">' + esc(m.role) + '</p>' +
            '<span class="tag tag-sm" style="margin-top:var(--space-sm)">' + esc(m.category) + '</span>' +
            '<p class="small text-dim" style="margin-top:var(--space-sm)">' + esc(m.bio || '') + '</p></a>';
    }).join('');
}

function filterMember(e) {
    var clicked = (e && e.target) || event.target;
    if (clicked.dataset.cat === currentMemberFilter) {
        currentMemberFilter = '';
    } else {
        currentMemberFilter = clicked.dataset.cat;
    }
    document.querySelectorAll('.member-filter-btn').forEach(function (btn) {
        btn.className = 'filter-btn member-filter-btn' + (btn.dataset.cat === currentMemberFilter ? ' active' : '');
    });
    renderMemberList();
}

function showMemberList() {
    var view = document.getElementById('member-list-view');
    if (view) {
        view.style.display = '';
        document.getElementById('member-profile-view').style.display = 'none';
    }
}

function showMemberProfile(id) {
    renderMemberPage(id, 'member-profile-content');
    document.getElementById('member-list-view').style.display = 'none';
    document.getElementById('member-profile-view').style.display = '';
}

function renderMemberPage(id, containerId) {
    containerId = containerId || 'member-profile-content';
    var members = getData('members');
    var m = members.find(function (x) { return x.id === id; });
    if (!m) return;
    var resume = m.resume || '【个人简历】\n' + (m.bio || '');
    var research = m.research || '';
    var education = m.education || '';
    var experience = m.experience || '';
    var photoHtml = m.photo
        ? '<img src="' + esc(m.photo) + '" alt="' + esc(m.name) + '" loading="lazy" decoding="async" class="profile-photo">'
        : '<div class="profile-photo-placeholder" style="background:var(--accent-bg);color:var(--fg)">' + esc(m.name.charAt(0)) + '</div>';
    document.getElementById(containerId).innerHTML =
        '<div class="profile-card">' +
        '<div class="profile-inner">' +
        '<div class="text-center" style="text-align:center">' +
        photoHtml +
        '<h2 class="profile-name" style="margin-top:var(--space-md)">' + esc(m.name) + '</h2>' +
        '<p class="profile-role">' + esc(m.role) + '</p>' +
        '</div>' +
        '<div class="profile-section">' +
        '<h4>个人简介</h4>' +
        '<div class="section-divider"></div>' +
        '<div style="display:flex;flex-direction:column;gap:var(--space-lg);color:var(--fg-muted);font-size:var(--text-body);line-height:var(--leading-relaxed)">' +
        (resume ? '<div style="white-space:pre-wrap">' + esc(resume) + '</div>' : '') +
        (education ? '<div><h4 style="font-weight:600;color:var(--fg);margin-bottom:var(--space-sm)">教育经历</h4><div style="white-space:pre-wrap;font-size:var(--text-small)">' + esc(education) + '</div></div>' : '') +
        (experience ? '<div><h4 style="font-weight:600;color:var(--fg);margin-bottom:var(--space-sm)">工作经历</h4><div style="white-space:pre-wrap;font-size:var(--text-small)">' + esc(experience) + '</div></div>' : '') +
        ((m.email || m.phone) ? '<div style="padding-top:var(--space-md);border-top:1px solid var(--border)">' +
            (m.phone ? '<p class="profile-info"><span class="profile-info-label">电话：</span>' + esc(m.phone) + '</p>' : '') +
            (m.email ? '<p class="profile-info" style="margin-top:4px"><span class="profile-info-label">邮箱：</span>' + esc(m.email) + '</p>' : '') +
            '</div>' : '') +
        (research ? '<div style="padding-top:var(--space-sm)"><h4 style="font-weight:600;color:var(--fg);margin-bottom:var(--space-sm)">研究方向</h4><p style="font-size:var(--text-small)">' + esc(research) + '</p></div>' : '') +
        '</div></div></div></div>';
}

// ===== News =====
var currentNewsFilter = '';

function showNewsList() {
    document.getElementById('news-list-view').style.display = '';
    document.getElementById('news-detail-view').style.display = 'none';
}

function showNewsDetail(id) {
    var news = getData('news');
    var n = news.find(function (x) { return x.id === id; });
    if (!n) return;
    document.getElementById('news-detail-content').innerHTML =
        '<div class="profile-card">' +
        '<div class="profile-inner" style="grid-template-columns:1fr">' +
        '<div>' +
        '<div class="news-meta">' +
        '<span class="tag tag-sm">' + esc(n.category || '其他') + '</span>' +
        '<span class="small text-dim">' + esc(n.date || '') + '</span>' +
        '</div>' +
        '<h1 class="h2" style="margin-bottom:var(--space-lg)">' + esc(n.title) + '</h1>' +
        '<div style="color:var(--fg-muted);line-height:var(--leading-relaxed);white-space:pre-wrap">' + esc(n.content || '') + '</div>' +
        '</div></div></div>';
    document.getElementById('news-list-view').style.display = 'none';
    document.getElementById('news-detail-view').style.display = '';
}

function renderNewsPage() {
    var news = getData('news');
    var container = document.getElementById('news-list-page');
    var empty = document.getElementById('news-empty');
    if (!container) return;
    var filtered = currentNewsFilter ? news.filter(function (n) { return n.category === currentNewsFilter; }) : news;
    if (filtered.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';
    container.innerHTML = filtered.map(function (n) {
        return '<a href="#/news/' + n.id + '" class="card news-card">' +
            '<div class="news-meta">' +
            '<span class="tag tag-sm">' + esc(n.category || '其他') + '</span>' +
            '<span class="small text-dim">' + esc(n.date) + '</span>' +
            '</div>' +
            '<h3 class="news-title">' + esc(n.title) + '</h3>' +
            '<p class="body" style="font-size:var(--text-small)">' + esc(n.content) + '</p></a>';
    }).join('');
}

function filterNews(e) {
    var clicked = (e && e.target) || event.target;
    if (clicked.dataset.cat === currentNewsFilter) {
        currentNewsFilter = '';
    } else {
        currentNewsFilter = clicked.dataset.cat;
    }
    document.querySelectorAll('.news-filter-btn').forEach(function (btn) {
        btn.className = 'filter-btn news-filter-btn' + (btn.dataset.cat === currentNewsFilter ? ' active' : '');
    });
    renderNewsPage();
}

// ===== Publications =====
function renderHomePubs() {
    var pubs = getData('publications');
    var container = document.getElementById('home-pubs');
    if (!container) return;
    container.innerHTML = pubs.slice(0, 3).map(function (pub) {
        return '<a href="#/publications" class="card pub-card" style="cursor:pointer">' +
            '<span class="pub-year">' + esc(String(pub.year)) + '</span>' +
            '<div><div class="pub-title">' + esc(pub.title) + '</div>' +
            '<p class="pub-authors">' + esc(pub.authors) + '</p>' +
            '<p class="pub-journal">' + esc(pub.journal) + '</p></div></a>';
    }).join('');
}

function renderPubList() {
    var pubs = getData('publications');
    var list = document.getElementById('pub-list');
    var empty = document.getElementById('pub-empty');
    if (!list) return;
    var searchEl = document.getElementById('search-input');
    var query = searchEl ? searchEl.value.toLowerCase() : '';
    var yearEl = document.getElementById('year-select');
    var year = yearEl ? yearEl.value : '';
    var filtered = pubs.filter(function (pub) {
        var matchYear = !year || pub.year === parseInt(year);
        var matchSearch = !query || (pub.title && pub.title.toLowerCase().indexOf(query) > -1) || (pub.authors && pub.authors.toLowerCase().indexOf(query) > -1);
        return matchYear && matchSearch;
    });
    if (filtered.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = filtered.map(function (pub) {
        var doiHtml = pub.doi ? '<div class="pub-doi">DOI:<a href="https://doi.org/' + esc(pub.doi) + '" target="_blank" rel="noopener"> ' + esc(pub.doi) + '</a></div>' : '';
        return '<div class="card pub-card">' +
            '<span class="pub-year">' + esc(String(pub.year)) + '</span>' +
            '<div style="flex:1"><div class="pub-title">' + esc(pub.title) + '</div>' +
            '<p class="pub-authors">' + esc(pub.authors) + '</p>' +
            '<p class="pub-journal">' + esc(pub.journal) + '</p>' + doiHtml + '</div></div>';
    }).join('');
}

function filterPubs() { renderPubList(); }

function populateYearFilter() {
    var pubs = getData('publications');
    var select = document.getElementById('year-select');
    if (!select) return;
    var years = [];
    pubs.forEach(function (p) { if (years.indexOf(p.year) === -1) years.push(p.year); });
    years.sort(function (a, b) { return b - a; });
    select.innerHTML = '<option value="">全部年份</option>' + years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
}

function renderStats() {
    var pubs = getData('publications');
    var container = document.getElementById('pub-stats');
    if (!container) return;
    container.innerHTML =
        '<div class="card stat-card" id="stat-total"><div class="stat-num" data-target="' + pubs.length + '">0</div><p class="small text-dim" style="margin-top:var(--space-sm)">发表论文总数</p></div>' +
        '<div class="card stat-card" id="stat-sci"><div class="stat-num" data-target="' + pubs.length + '">0</div><p class="small text-dim" style="margin-top:var(--space-sm)">SCI/EI收录</p></div>' +
        '<div class="card stat-card" id="stat-patent"><div class="stat-num" data-target="3">0</div><p class="small text-dim" style="margin-top:var(--space-sm)">发明专利</p></div>';
    if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.querySelectorAll('.stat-num').forEach(function (el) {
                        var target = parseInt(el.dataset.target);
                        animateCounter(el, target, 1500);
                    });
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.5 });
        obs.observe(container);
    }
}

// ===== Contact Form =====
function submitForm(e) {
    e.preventDefault();
    document.getElementById('form-success').style.display = '';
    e.target.reset();
}

// Lazy-render flags: hidden pages only render on first access
var _rendered = {};

// ===== Init — single authoritative entry point =====
async function init() {
    // Load all data first
    await loadData();

    // Only render above-the-fold + home page content immediately
    renderCarousel();
    renderHomeTags();
    renderHomeResearch();
    renderHomeTeam();
    renderHomeNews();
    renderHomePubs();

    // Set up initial route
    navigate(window.location.hash || '#/');

    // Event listeners
    window.addEventListener('hashchange', function () { navigate(window.location.hash); });

    window.addEventListener('scroll', function () {
        document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 50);
        document.getElementById('back-top').classList.toggle('show', window.scrollY > 400);
    });

    // Hide loader after animation completes
    // Minimum 1.8s for branding, or after data loaded if later
    var elapsed = performance.now();
    var minDelay = Math.max(0, 1800 - elapsed);
    setTimeout(function () {
        var loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
        document.body.style.overflow = '';
    }, minDelay);
}

// Set body overflow hidden until loader finishes
document.body.style.overflow = 'hidden';
init();
