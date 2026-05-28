let DATA = {};
let carouselIndex = 0;
let carouselTimer;

async function loadData() {
    const files = ['directions', 'members', 'publications', 'news', 'carousel'];
    const promises = files.map(async (file) => {
        try {
            const res = await fetch('./data/' + file + '.json');
            DATA[file] = await res.json();
        } catch (e) {
            console.error('Failed to load ' + file + '.json', e);
            DATA[file] = [];
        }
    });
    await Promise.all(promises);
}

function getData(key) {
    return DATA[key] || [];
}

// ===== Custom Cursor =====
(function initCursor() {
    if ('ontouchstart' in window) return;
    const outer = document.getElementById('cursorOuter');
    const inner = document.getElementById('cursorInner');
    if (!outer || !inner) return;
    let mx = 0, my = 0, ox = 0, oy = 0, ix = 0, iy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
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
    document.addEventListener('mouseleave', () => { outer.style.opacity = '0'; inner.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { outer.style.opacity = '1'; inner.style.opacity = '1'; });
    document.querySelectorAll('a, button, .card, .research-card, .contact-item, .map-placeholder, .filter-btn, .member-card, .stat-card').forEach(el => {
        el.addEventListener('mouseenter', () => outer.classList.add('hover'));
        el.addEventListener('mouseleave', () => outer.classList.remove('hover'));
    });
})();

// ===== Scroll Reveal =====
(function initReveal() {
    try {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('show');
                        observer.unobserve(e.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
            document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        } else {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('show'));
        }
    } catch(e) { console.warn('initReveal:', e); }
})();

// ===== Counter Animation =====
function animateCounter(el, target, duration) {
    const start = performance.now();
    function update(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target);
        if (t < 1) requestAnimationFrame(update);
        else el.textContent = target;
    }
    requestAnimationFrame(update);
}

// ===== Avatar =====
function renderAvatar(m, size, textSize) {
    const imgSize = size || 'w-24 h-24';
    if (m.photo) {
        const cls = 'member-avatar' + (imgSize.includes('48') || imgSize.includes('60') ? '' : '');
        return '<img src="' + m.photo + '" alt="' + m.name + '" loading="lazy" class="' + cls + '">';
    }
    return '<div class="member-avatar-placeholder" style="width:96px;height:96px;font-size:36px">' + m.name.charAt(0) + '</div>';
}

// ===== Carousel =====
function getCarouselItems() {
    return getData('carousel').sort((a, b) => a.sortOrder - b.sortOrder);
}

function renderCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
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
    const items = getCarouselItems();
    track.innerHTML = items.map(item => {
        var bgStyle = '';
        if (item.image) {
            bgStyle = 'background-image:url(\'' + item.image + '\');background-size:cover;background-position:center;';
        } else {
            bgStyle = 'background:' + parseBg(item.bg) + ';';
        }
        var overlay = item.image ? '<div class="carousel-overlay"></div>' : '<div class="carousel-overlay" style="background:rgba(0,0,0,0.2)"></div>';
        var clickHandler = item.link ? (item.link.startsWith('#') ? ' onclick="window.location.href=\'' + item.link + '\'"' : ' onclick="window.open(\'' + item.link + '\',\'_blank\')"') : '';
        return '<div class="carousel-slide' + (item.link ? ' carousel-linked' : '') + '" style="' + bgStyle + '"' + clickHandler + '>' +
            overlay +
            '<div class="carousel-content">' +
            '<div class="carousel-icon">' + item.icon + '</div>' +
            '<div class="carousel-title">' + item.title + '</div>' +
            '<div class="carousel-desc">' + item.desc + '</div>' +
            '</div></div>';
    }).join('');
    dots.innerHTML = items.map((_, i) =>
        '<button onclick="carouselGo(' + i + ')" class="carousel-dot" style="width:10px;height:10px;border-radius:50%;border:none;cursor:pointer;transition:all 0.3s;background:' + (i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.3)') + '"></button>'
    ).join('');
    startCarousel();
}

function carouselGo(index) {
    carouselIndex = index;
    const track = document.getElementById('carousel-track');
    if (track) track.style.transform = 'translateX(-' + (index * 100) + '%)';
    document.querySelectorAll('#carousel-dots button').forEach((dot, i) => {
        dot.style.background = i === index ? 'var(--accent)' : 'rgba(255,255,255,0.3)';
    });
    resetCarousel();
}

function carouselPrev() { carouselGo((carouselIndex - 1 + getCarouselItems().length) % getCarouselItems().length); }
function carouselNext() { carouselGo((carouselIndex + 1) % getCarouselItems().length); }
function startCarousel() { carouselTimer = setInterval(function() { carouselNext(); }, 5000); }
function resetCarousel() { clearInterval(carouselTimer); startCarousel(); }

// ===== Home Tags =====
function renderHomeTags() {
    const directions = getData('directions');
    const container = document.getElementById('home-tags');
    if (!container) return;
    container.innerHTML = directions.map(function(d) {
        var label = d.title.replace(/\s*\(.*\)/, '');
        return '<span class="tag">' + label + '</span>';
    }).join('');
}

// ===== Home Research =====
function renderHomeResearch() {
    const directions = getData('directions');
    const container = document.getElementById('home-research');
    if (!container) return;
    container.innerHTML = directions.map(function(d) {
        var iconHtml = d.image
            ? '<div style="width:64px;height:64px;border-radius:var(--radius-lg);background-size:cover;background-position:center;background-image:url(\'' + d.image + '\');margin-bottom:var(--space-md)"></div>'
            : '<div style="width:64px;height:64px;border-radius:var(--radius-lg);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:var(--space-md)">' + d.icon + '</div>';
        return '<a href="#/research" class="card">' +
            iconHtml +
            '<h3 class="h3" style="margin-bottom:var(--space-sm)">' + d.title.replace(/\s*\(.*\)/, '') + '</h3>' +
            '<p class="body">' + d.description + '</p></a>';
    }).join('');
}

// ===== Research Detail =====
function renderResearchDetail() {
    const directions = getData('directions');
    const container = document.getElementById('research-detail');
    if (!container) return;
    container.innerHTML = directions.map(function(d) {
        var items = d.subItems || [];
        var iconHtml = d.image
            ? '<div style="width:140px;height:140px;border-radius:var(--radius-xl);background-size:cover;background-position:center;background-image:url(\'' + d.image + '\')"></div>'
            : '<div style="width:140px;height:140px;border-radius:var(--radius-xl);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:56px">' + d.icon + '</div>';
        return '<div class="research-card">' +
            '<div class="research-visual" style="background:' + (d.bgColor || 'var(--bg-card)') + '">' + iconHtml + '</div>' +
            '<div class="research-body">' +
            '<h2>' + d.title + '</h2>' +
            '<p class="body" style="margin-bottom:var(--space-md)">' + d.description + '</p>' +
            '<ul>' + items.map(function(item) { return '<li>' + item + '</li>'; }).join('') + '</ul>' +
            '</div></div>';
    }).join('');
}

// ===== Home Team =====
function renderHomeTeam() {
    const members = getData('members');
    const container = document.getElementById('home-team');
    if (!container) return;
    container.innerHTML = members.slice(0, 4).map(function(m) {
        return '<a href="#/member/' + m.id + '" class="card card-compact member-card text-center">' +
            renderAvatar(m) +
            '<h3 class="fw-600">' + m.name + '</h3>' +
            '<p class="text-accent small fw-500" style="margin-top:2px">' + m.role + '</p></a>';
    }).join('');
}

// ===== Home News =====
function renderHomeNews() {
    const news = getData('news');
    const container = document.getElementById('home-news');
    if (!container) return;
    if (news.length === 0) {
        container.innerHTML = '<p class="body text-center" style="grid-column:1/-1;padding:var(--space-3xl) 0">暂无新闻</p>';
        return;
    }
    container.innerHTML = news.slice(0, 3).map(function(n) {
        return '<a href="#/news/' + n.id + '" class="card news-card">' +
            '<div class="news-meta">' +
            '<span class="tag tag-sm">' + (n.category || '其他') + '</span>' +
            '<span class="micro" style="text-transform:none;letter-spacing:normal">' + n.date + '</span>' +
            '</div>' +
            '<h3 class="news-title">' + n.title + '</h3>' +
            '<p class="news-excerpt">' + n.content + '</p></a>';
    }).join('');
}

// ===== Member =====
let currentMemberFilter = '';

function renderMemberList() {
    const members = getData('members');
    const filtered = currentMemberFilter ? members.filter(function(m) { return m.category === currentMemberFilter; }) : members;
    const container = document.getElementById('member-detail');
    const empty = document.getElementById('member-empty');
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';
    container.innerHTML = filtered.map(function(m) {
        return '<a href="#/member/' + m.id + '" class="card card-compact member-card text-center">' +
            renderAvatar(m) +
            '<h3 class="fw-600">' + m.name + '</h3>' +
            '<p class="text-accent small fw-500" style="margin-top:2px">' + m.role + '</p>' +
            '<span class="tag tag-sm" style="margin-top:var(--space-sm)">' + m.category + '</span>' +
            '<p class="small text-dim" style="margin-top:var(--space-sm)">' + (m.bio || '') + '</p></a>';
    }).join('');
}

function filterMember() {
    const clicked = event.target;
    if (clicked.dataset.cat === currentMemberFilter) {
        currentMemberFilter = '';
    } else {
        currentMemberFilter = clicked.dataset.cat;
    }
    document.querySelectorAll('.member-filter-btn').forEach(function(btn) {
        btn.className = 'filter-btn' + (btn.dataset.cat === currentMemberFilter ? ' active' : '');
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
    const members = getData('members');
    const m = members.find(function(x) { return x.id === id; });
    if (!m) return;
    const resume = m.resume || '【个人简历】\n' + (m.bio || '');
    const research = m.research || '';
    const education = m.education || '';
    const experience = m.experience || '';
    var photoHtml = m.photo
        ? '<img src="' + m.photo + '" alt="' + m.name + '" loading="lazy" class="profile-photo">'
        : '<div class="profile-photo-placeholder" style="background:var(--accent-bg);color:var(--fg)">' + m.name.charAt(0) + '</div>';
    document.getElementById(containerId).innerHTML =
        '<div class="profile-card">' +
        '<div class="profile-inner">' +
        '<div class="text-center" style="text-align:center">' +
        photoHtml +
        '<h2 class="profile-name" style="margin-top:var(--space-md)">' + m.name + '</h2>' +
        '<p class="profile-role">' + m.role + '</p>' +
        '</div>' +
        '<div class="profile-section">' +
        '<h4>个人简介</h4>' +
        '<div class="section-divider"></div>' +
        '<div style="display:flex;flex-direction:column;gap:var(--space-lg);color:var(--fg-muted);font-size:var(--text-body);line-height:var(--leading-relaxed)">' +
        (resume ? '<div style="white-space:pre-wrap">' + resume + '</div>' : '') +
        (education ? '<div><h4 style="font-weight:600;color:var(--fg);margin-bottom:var(--space-sm)">教育经历</h4><div style="white-space:pre-wrap;font-size:var(--text-small)">' + education + '</div></div>' : '') +
        (experience ? '<div><h4 style="font-weight:600;color:var(--fg);margin-bottom:var(--space-sm)">工作经历</h4><div style="white-space:pre-wrap;font-size:var(--text-small)">' + experience + '</div></div>' : '') +
        ((m.email || m.phone) ? '<div style="padding-top:var(--space-md);border-top:1px solid var(--border)">' +
            (m.phone ? '<p class="profile-info"><span class="profile-info-label">电话：</span>' + m.phone + '</p>' : '') +
            (m.email ? '<p class="profile-info" style="margin-top:4px"><span class="profile-info-label">邮箱：</span>' + m.email + '</p>' : '') +
            '</div>' : '') +
        (research ? '<div style="padding-top:var(--space-sm)"><h4 style="font-weight:600;color:var(--fg);margin-bottom:var(--space-sm)">研究方向</h4><p style="font-size:var(--text-small)">' + research + '</p></div>' : '') +
        '</div></div></div></div>';
}

// ===== News =====
let currentNewsFilter = '';

function showNewsList() {
    document.getElementById('news-list-view').style.display = '';
    document.getElementById('news-detail-view').style.display = 'none';
}

function showNewsDetail(id) {
    const news = getData('news');
    const n = news.find(function(x) { return x.id === id; });
    if (!n) return;
    document.getElementById('news-detail-content').innerHTML =
        '<div class="profile-card">' +
        '<div class="profile-inner" style="grid-template-columns:1fr">' +
        '<div>' +
        '<div class="news-meta">' +
        '<span class="tag tag-sm">' + (n.category || '其他') + '</span>' +
        '<span class="small text-dim">' + (n.date || '') + '</span>' +
        '</div>' +
        '<h1 class="h2" style="margin-bottom:var(--space-lg)">' + n.title + '</h1>' +
        '<div style="color:var(--fg-muted);line-height:var(--leading-relaxed);white-space:pre-wrap">' + (n.content || '') + '</div>' +
        '</div></div></div>';
    document.getElementById('news-list-view').style.display = 'none';
    document.getElementById('news-detail-view').style.display = '';
}

function renderNewsPage() {
    const news = getData('news');
    const container = document.getElementById('news-list-page');
    const empty = document.getElementById('news-empty');
    if (!container) return;
    const filtered = currentNewsFilter ? news.filter(function(n) { return n.category === currentNewsFilter; }) : news;
    if (filtered.length === 0) {
        container.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';
    container.innerHTML = filtered.map(function(n) {
        return '<a href="#/news/' + n.id + '" class="card news-card">' +
            '<div class="news-meta">' +
            '<span class="tag tag-sm">' + (n.category || '其他') + '</span>' +
            '<span class="small text-dim">' + n.date + '</span>' +
            '</div>' +
            '<h3 class="news-title">' + n.title + '</h3>' +
            '<p class="body" style="font-size:var(--text-small)">' + n.content + '</p></a>';
    }).join('');
}

function filterNews() {
    const clicked = event.target;
    if (clicked.dataset.cat === currentNewsFilter) {
        currentNewsFilter = '';
    } else {
        currentNewsFilter = clicked.dataset.cat;
    }
    document.querySelectorAll('.news-filter-btn').forEach(function(btn) {
        btn.className = 'filter-btn' + (btn.dataset.cat === currentNewsFilter ? ' active' : '');
    });
    renderNewsPage();
}

// ===== Publications =====
function renderHomePubs() {
    const pubs = getData('publications');
    const container = document.getElementById('home-pubs');
    if (!container) return;
    container.innerHTML = pubs.slice(0, 3).map(function(pub) {
        return '<a href="#/publications" class="card pub-card" style="cursor:pointer">' +
            '<span class="pub-year">' + pub.year + '</span>' +
            '<div><div class="pub-title">' + pub.title + '</div>' +
            '<p class="pub-authors">' + pub.authors + '</p>' +
            '<p class="pub-journal">' + pub.journal + '</p></div></a>';
    }).join('');
}

function renderPubList() {
    const pubs = getData('publications');
    const list = document.getElementById('pub-list');
    const empty = document.getElementById('pub-empty');
    if (!list) return;
    const query = document.getElementById('search-input').value.toLowerCase();
    const year = document.getElementById('year-select').value;
    const filtered = pubs.filter(function(pub) {
        var matchYear = !year || pub.year === parseInt(year);
        var matchSearch = !query || pub.title.toLowerCase().includes(query) || pub.authors.toLowerCase().includes(query);
        return matchYear && matchSearch;
    });
    if (filtered.length === 0) {
        list.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';
    list.innerHTML = filtered.map(function(pub) {
        var doiHtml = pub.doi ? '<div class="pub-doi">DOI:<a href="https://doi.org/' + pub.doi + '" target="_blank"> ' + pub.doi + '</a></div>' : '';
        return '<div class="card pub-card">' +
            '<span class="pub-year">' + pub.year + '</span>' +
            '<div style="flex:1"><div class="pub-title">' + pub.title + '</div>' +
            '<p class="pub-authors">' + pub.authors + '</p>' +
            '<p class="pub-journal">' + pub.journal + '</p>' + doiHtml + '</div></div>';
    }).join('');
}

function filterPubs() { renderPubList(); }

function populateYearFilter() {
    const pubs = getData('publications');
    const select = document.getElementById('year-select');
    if (!select) return;
    var years = [...new Set(pubs.map(function(p) { return p.year; }))].sort(function(a, b) { return b - a; });
    select.innerHTML = '<option value="">全部年份</option>' + years.map(function(y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
}

function renderStats() {
    const pubs = getData('publications');
    const container = document.getElementById('pub-stats');
    if (!container) return;
    container.innerHTML =
        '<div class="card stat-card" id="stat-total"><div class="stat-num" data-target="' + pubs.length + '">0</div><p class="small text-dim" style="margin-top:var(--space-sm)">发表论文总数</p></div>' +
        '<div class="card stat-card" id="stat-sci"><div class="stat-num" data-target="' + pubs.length + '">0</div><p class="small text-dim" style="margin-top:var(--space-sm)">SCI/EI收录</p></div>' +
        '<div class="card stat-card" id="stat-patent"><div class="stat-num" data-target="3">0</div><p class="small text-dim" style="margin-top:var(--space-sm)">发明专利</p></div>';
    // Counter animation on scroll into view
    if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(e) {
                if (e.isIntersecting) {
                    e.target.querySelectorAll('.stat-num').forEach(function(el) {
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

function submitForm(e) {
    e.preventDefault();
    document.getElementById('form-success').style.display = '';
    e.target.reset();
}

// ===== Init =====
async function init() {
    await loadData();
    renderCarousel();
    renderHomeTags();
    renderHomeResearch();
    renderHomeTeam();
    renderHomeNews();
    renderHomePubs();
    renderResearchDetail();
    renderMemberList();
    renderNewsPage();
    populateYearFilter();
    renderPubList();
    renderStats();
    navigate(window.location.hash || '#/');
    window.addEventListener('hashchange', function() { navigate(window.location.hash); });
}

init();
