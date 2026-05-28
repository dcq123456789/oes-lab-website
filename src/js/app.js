// ===== 数据加载 =====
let DATA = {};

async function loadData() {
    const files = ['directions', 'members', 'publications', 'news', 'carousel'];
    const promises = files.map(async (file) => {
        try {
            const res = await fetch(`./data/${file}.json`);
            DATA[file] = await res.json();
        } catch (e) {
            console.error(`Failed to load ${file}.json`, e);
            DATA[file] = [];
        }
    });
    await Promise.all(promises);
}

function getData(key) {
    return DATA[key] || [];
}

// ===== 页面控制 =====
const PAGES = {
    'home': { title: 'OES实验室 - 光学·电学·传感' },
    'research': { title: 'OES实验室 - 研究方向' },
    'member': { title: 'OES实验室 - 团队成员' },
    'news': { title: 'OES实验室 - 新闻动态' },
    'publications': { title: 'OES实验室 - 发表论文' },
    'contact': { title: 'OES实验室 - 联系我们' }
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    window.scrollTo(0, 0);

    document.querySelectorAll('.nav-link').forEach(link => {
        const linkPage = link.dataset.page;
        if (linkPage === pageId) {
            link.classList.add('text-primary');
            link.classList.remove('text-gray-600');
        } else {
            link.classList.remove('text-primary');
            link.classList.add('text-gray-600');
        }
    });
}

function navigate(hash) {
    const path = hash.replace('#/', '').replace('#', '') || 'home';
    const parts = path.split('/');

    if (parts[0] === 'member') {
        if (parts[1]) {
            const id = parseInt(parts[1]);
            showPage('member');
            showMemberProfile(id);
            const members = getData('members');
            const m = members.find(x => x.id === id);
            document.title = m ? `OES实验室 - ${m.name}` : PAGES['member'].title;
        } else {
            showPage('member');
            showMemberList();
            document.title = PAGES['member'].title;
        }
    } else if (parts[0] === 'news') {
        if (parts[1]) {
            const id = parseInt(parts[1]);
            showPage('news');
            showNewsDetail(id);
            const news = getData('news');
            const n = news.find(x => x.id === id);
            document.title = n ? `OES实验室 - ${n.title}` : PAGES['news'].title;
        } else {
            showPage('news');
            showNewsList();
            document.title = PAGES['news'].title;
        }
    } else if (PAGES[parts[0]]) {
        showPage(parts[0]);
        showMemberList();
        showNewsList();
        document.title = PAGES[parts[0]].title;
    } else {
        showPage('home');
        document.title = PAGES['home'].title;
    }
}

function toggleMobile() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

function filterByCategory(cat) {
    currentMemberFilter = cat;
    showPage('member');
    showMemberList();
    renderMemberList();
    document.querySelectorAll('.member-filter-btn').forEach(btn => {
        btn.className = `member-filter-btn px-4 py-1 rounded-full text-sm font-medium transition-colors ${btn.dataset.cat === cat ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;
    });
    document.getElementById('mobile-menu').classList.add('hidden');
}

function filterNewsByCategory(cat) {
    currentNewsFilter = cat;
    showPage('news');
    showNewsList();
    renderNewsPage();
    document.querySelectorAll('.news-filter-btn').forEach(btn => {
        btn.className = `news-filter-btn px-4 py-1 rounded-full text-sm font-medium transition-colors ${btn.dataset.cat === cat ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;
    });
    document.getElementById('mobile-menu').classList.add('hidden');
}

function showMemberList() {
    const view = document.getElementById('member-list-view');
    if (view) {
        view.classList.remove('hidden');
        document.getElementById('member-profile-view').classList.add('hidden');
    }
}

function showMemberProfile(id) {
    renderMemberPage(id, 'member-profile-content');
    document.getElementById('member-list-view').classList.add('hidden');
    document.getElementById('member-profile-view').classList.remove('hidden');
}

function showNewsList() {
    const view = document.getElementById('news-list-view');
    if (view) {
        view.classList.remove('hidden');
        document.getElementById('news-detail-view').classList.add('hidden');
    }
}

function showNewsDetail(id) {
    const news = getData('news');
    const n = news.find(x => x.id === id);
    if (!n) return;
    const colors = { '学术交流': 'bg-blue-100 text-blue-700', '科研动态': 'bg-green-100 text-green-700', '合作交流': 'bg-purple-100 text-purple-700', '其他': 'bg-gray-100 text-gray-700' };
    document.getElementById('news-detail-content').innerHTML = `
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div class="p-8">
        <div class="flex items-center gap-3 mb-4">
          <span class="${colors[n.category] || colors['其他']} text-sm px-3 py-1 rounded-full font-medium">${n.category}</span>
          <span class="text-gray-400">${n.date}</span>
        </div>
        <h1 class="text-3xl font-bold mb-6">${n.title}</h1>
        <div class="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">${n.content}</div>
      </div>
    </div>
  `;
    document.getElementById('news-list-view').classList.add('hidden');
    document.getElementById('news-detail-view').classList.remove('hidden');
}

// ===== 头像渲染 =====
function renderAvatar(m, size = 'w-24 h-24') {
    if (m.photo) {
        return `<img src="${m.photo}" alt="${m.name}" loading="lazy" class="${size} mx-auto rounded-full object-cover mb-3">`;
    }
    const s = size.includes('28') ? 'text-4xl' : size.includes('24') ? 'text-3xl' : size.includes('20') ? 'text-2xl' : 'text-lg';
    return `<div class="${size} mx-auto rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white ${s} font-semibold mb-3">${m.name.charAt(0)}</div>`;
}

// ===== 轮播图 =====
function getCarouselItems() {
    return getData('carousel').sort((a, b) => a.sortOrder - b.sortOrder);
}

let carouselIndex = 0;
let carouselTimer;

function renderCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
    if (!track) return;

    const items = getCarouselItems();
    track.innerHTML = items.map(item => {
        const style = item.image ? `background-image: url('${item.image}'); background-size: cover; background-position: center;` : '';
        const bgClass = item.image ? '' : `bg-gradient-to-r ${item.bg}`;
        const overlay = item.image ? '<div class="absolute inset-0 bg-black/40"></div>' : '';

        const linkStart = item.link ? `<a href="${item.link}">` : '';
        const linkEnd = item.link ? '</a>' : '';
        return `
    <div class="w-full flex-shrink-0 relative">
      ${linkStart}
      <div class="${bgClass} h-64 md:h-80 flex items-center justify-center text-white relative overflow-hidden ${item.link ? 'cursor-pointer hover:brightness-110 transition-all' : ''}" style="${style}">
        ${overlay}
        <div class="text-center px-8 relative z-10">
          <div class="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl font-bold mb-6">${item.icon}</div>
          <h2 class="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">${item.title}</h2>
          <p class="text-lg md:text-xl opacity-90 drop-shadow-md">${item.desc}</p>
        </div>
      </div>
      ${linkEnd}
    </div>
  `;
    }).join('');

    dots.innerHTML = items.map((_, i) => `
    <button onclick="carouselGo(${i})" class="w-3 h-3 rounded-full transition-all ${i === 0 ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}"></button>
  `).join('');

    startCarousel();
}

function carouselGo(index) {
    carouselIndex = index;
    const track = document.getElementById('carousel-track');
    if (track) track.style.transform = `translateX(-${index * 100}%)`;

    document.querySelectorAll('#carousel-dots button').forEach((dot, i) => {
        dot.className = `w-3 h-3 rounded-full transition-all ${i === index ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`;
    });
    resetCarousel();
}

function carouselPrev() {
    carouselGo((carouselIndex - 1 + getCarouselItems().length) % getCarouselItems().length);
}

function carouselNext() {
    carouselGo((carouselIndex + 1) % getCarouselItems().length);
}

function startCarousel() {
    carouselTimer = setInterval(() => carouselNext(), 5000);
}

function resetCarousel() {
    clearInterval(carouselTimer);
    startCarousel();
}

// ===== 渲染函数 =====
function renderHomeTags() {
    const directions = getData('directions');
    const container = document.getElementById('home-tags');
    if (!container) return;
    container.innerHTML = directions.map(d => {
        const label = d.title.replace(/\s*\(.*\)/, '');
        return `<span class="bg-white px-5 py-2 rounded-full font-medium text-primary border border-gray-200 shadow-sm">${label}</span>`;
    }).join('');
}

function renderHomeResearch() {
    const directions = getData('directions');
    const container = document.getElementById('home-research');
    if (!container) return;
    container.innerHTML = directions.map(d => {
        const imgStyle = d.image ? `background-image: url('${d.image}'); background-size: cover; background-position: center;` : '';
        const iconHtml = d.image
            ? `<div class="w-20 h-20 rounded-xl mb-4" style="${imgStyle}"></div>`
            : `<div class="w-20 h-20 bg-primary rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-4">${d.icon}</div>`;
        return `
    <a href="#/research" class="bg-white p-6 rounded-xl border border-gray-200 card-hover block">
      ${iconHtml}
      <h3 class="text-xl font-semibold mb-2">${d.title.replace(/\s*\(.*\)/, '')}</h3>
      <p class="text-gray-600">${d.description}</p>
    </a>`;
    }).join('');
}

function renderResearchDetail() {
    const directions = getData('directions');
    const container = document.getElementById('research-detail');
    if (!container) return;
    container.innerHTML = directions.map(d => {
        const items = d.subItems || [];
        const imgStyle = d.image ? `background-image: url('${d.image}'); background-size: cover; background-position: center;` : '';
        const iconHtml = d.image
            ? `<div class="w-40 h-40 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-6xl font-bold" style="${imgStyle}"></div>`
            : `<div class="w-40 h-40 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-6xl font-bold">${d.icon}</div>`;
        return `
    <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden card-hover">
      <div class="md:flex">
        <div class="w-full md:w-72 flex items-center justify-center p-10 ${d.bgColor}">
          ${iconHtml}
        </div>
        <div class="p-8 flex-1">
          <h2 class="text-2xl font-bold mb-3">${d.title}</h2>
          <p class="text-gray-600 mb-4">${d.description}</p>
          <ul class="space-y-2">
            ${items.map(item => `<li class="flex items-center text-gray-700"><svg class="w-5 h-5 text-primary mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>${item}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>`;
    }).join('');
}

function renderHomeTeam() {
    const members = getData('members');
    const container = document.getElementById('home-team');
    if (!container) return;
    container.innerHTML = members.slice(0, 4).map(m => `
    <a href="#/member/${m.id}" class="text-center p-4 rounded-xl border border-gray-200 card-hover block">
      ${renderAvatar(m)}
      <h3 class="font-semibold">${m.name}</h3>
      <p class="text-primary text-sm font-medium">${m.role}</p>
    </a>
  `).join('');
}

function renderHomeNews() {
    const news = getData('news');
    const container = document.getElementById('home-news');
    if (!container || news.length === 0) {
        if (container) container.innerHTML = '<p class="text-center text-gray-500 col-span-3 py-8">暂无新闻</p>';
        return;
    }
    const colors = { '学术交流': 'bg-blue-100 text-blue-700', '科研动态': 'bg-green-100 text-green-700', '合作交流': 'bg-purple-100 text-purple-700', '其他': 'bg-gray-100 text-gray-700' };
    container.innerHTML = news.slice(0, 3).map(n => `
    <a href="#/news/${n.id}" class="bg-white rounded-xl border border-gray-200 p-6 card-hover block">
      <div class="flex items-center gap-2 mb-3">
        <span class="${colors[n.category] || colors['其他']} text-xs px-2 py-1 rounded font-medium">${n.category}</span>
        <span class="text-gray-400 text-sm">${n.date}</span>
      </div>
      <h3 class="text-lg font-bold mb-2">${n.title}</h3>
      <p class="text-gray-600 text-sm line-clamp-3">${n.content}</p>
    </a>
  `).join('');
}

let currentNewsFilter = '';

function renderNewsPage() {
    const news = getData('news');
    const container = document.getElementById('news-list-page');
    const empty = document.getElementById('news-empty');
    if (!container) return;
    const filtered = currentNewsFilter ? news.filter(n => n.category === currentNewsFilter) : news;
    if (filtered.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    const colors = { '学术交流': 'bg-blue-100 text-blue-700', '科研动态': 'bg-green-100 text-green-700', '合作交流': 'bg-purple-100 text-purple-700', '其他': 'bg-gray-100 text-gray-700' };
    container.innerHTML = filtered.map(n => `
    <a href="#/news/${n.id}" class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all block">
      <div class="flex items-center gap-2 mb-3">
        <span class="${colors[n.category] || colors['其他']} text-xs px-2 py-1 rounded font-medium">${n.category}</span>
        <span class="text-gray-400 text-sm">${n.date}</span>
      </div>
      <h3 class="text-xl font-bold mb-2">${n.title}</h3>
      <p class="text-gray-600">${n.content}</p>
    </a>
  `).join('');
}

function filterNews() {
    const clicked = event.target;
    if (clicked.dataset.cat === currentNewsFilter) {
        currentNewsFilter = '';
    } else {
        currentNewsFilter = clicked.dataset.cat;
    }
    document.querySelectorAll('.news-filter-btn').forEach(btn => {
        btn.className = `news-filter-btn px-4 py-1 rounded-full text-sm font-medium transition-colors ${btn.dataset.cat === currentNewsFilter ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;
    });
    renderNewsPage();
}

let currentMemberFilter = '';

function renderMemberList() {
    const members = getData('members');
    const filtered = currentMemberFilter ? members.filter(m => m.category === currentMemberFilter) : members;
    const container = document.getElementById('member-detail');
    const empty = document.getElementById('member-empty');
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    container.innerHTML = filtered.map(m => `
    <a href="#/member/${m.id}" class="bg-white rounded-xl border border-gray-200 p-6 text-center card-hover block">
      ${renderAvatar(m, 'w-24 h-24')}
      <h3 class="text-lg font-bold">${m.name}</h3>
      <p class="text-primary font-medium text-sm mt-1">${m.role}</p>
      <span class="inline-block mt-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">${m.category}</span>
      <p class="text-gray-500 text-sm mt-2">${m.bio}</p>
    </a>
  `).join('');
}

function filterMember() {
    const clicked = event.target;
    if (clicked.dataset.cat === currentMemberFilter) {
        currentMemberFilter = '';
    } else {
        currentMemberFilter = clicked.dataset.cat;
    }
    document.querySelectorAll('.member-filter-btn').forEach(btn => {
        btn.className = `member-filter-btn px-4 py-1 rounded-full text-sm font-medium transition-colors ${btn.dataset.cat === currentMemberFilter ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;
    });
    renderMemberList();
}

function renderMemberPage(id, containerId = 'member-profile-content') {
    const members = getData('members');
    const m = members.find(x => x.id === id);
    if (!m) return;

    const resume = m.resume || `【个人简历】\n${m.bio}`;
    const research = m.research || '';
    const education = m.education || '';
    const experience = m.experience || '';

    document.getElementById(containerId).innerHTML = `
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div class="p-8 md:p-12">
        <div class="flex flex-col md:flex-row gap-10">
          <div class="flex-shrink-0 text-center md:text-left">
            ${m.photo ? `<img src="${m.photo}" alt="${m.name}" loading="lazy" class="w-48 h-60 mx-auto md:mx-0 rounded-lg object-cover shadow-md mb-4">` : `<div class="w-48 h-60 mx-auto md:mx-0 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-7xl font-semibold shadow-md mb-4">${m.name.charAt(0)}</div>`}
            <h2 class="text-2xl font-bold text-gray-900">${m.name}</h2>
            <p class="text-gray-500 mt-1">${m.role}</p>
          </div>
          <div class="flex-1">
            <h3 class="text-3xl font-bold text-gray-900 mb-4">个人简介</h3>
            <div class="w-12 h-1 bg-red-500 mb-6"></div>
            
            <div class="space-y-6 text-gray-600 leading-relaxed">
              ${resume ? `<div class="whitespace-pre-wrap">${resume}</div>` : ''}
              
              ${education ? `
              <div>
                <h4 class="font-bold text-gray-800 mb-2">【教育经历】</h4>
                <div class="whitespace-pre-wrap text-sm">${education}</div>
              </div>
              ` : ''}
              
              ${experience ? `
              <div>
                <h4 class="font-bold text-gray-800 mb-2">【工作经历】</h4>
                <div class="whitespace-pre-wrap text-sm">${experience}</div>
              </div>
              ` : ''}
              
              ${m.email || m.phone ? `
              <div class="pt-4 border-t border-gray-200">
                ${m.phone ? `<p class="text-sm"><span class="font-medium text-gray-700">电话：</span>${m.phone}</p>` : ''}
                ${m.email ? `<p class="text-sm mt-1"><span class="font-medium text-gray-700">邮箱：</span>${m.email}</p>` : ''}
              </div>
              ` : ''}
              
              ${research ? `
              <div class="pt-4">
                <h4 class="font-bold text-gray-800 mb-2">【研究方向】</h4>
                <p class="text-sm">${research}</p>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHomePubs() {
    const pubs = getData('publications');
    const container = document.getElementById('home-pubs');
    if (!container) return;
    container.innerHTML = pubs.slice(0, 3).map(pub => `
    <a href="#/publications" class="bg-white p-5 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4 items-start hover:shadow-md transition-all block">
      <span class="bg-primary text-white px-3 py-1 rounded-md text-sm font-semibold whitespace-nowrap">${pub.year}</span>
      <div>
        <h4 class="font-medium text-gray-900">${pub.title}</h4>
        <p class="text-gray-500 text-sm mt-1">${pub.authors}</p>
        <p class="text-primary text-sm font-medium">${pub.journal}</p>
      </div>
    </a>
  `).join('');
}

function renderPubList() {
    const pubs = getData('publications');
    const list = document.getElementById('pub-list');
    const empty = document.getElementById('pub-empty');
    if (!list) return;
    const query = document.getElementById('search-input').value.toLowerCase();
    const year = document.getElementById('year-select').value;
    const filtered = pubs.filter(pub => {
        const matchYear = !year || pub.year === parseInt(year);
        const matchSearch = !query || pub.title.toLowerCase().includes(query) || pub.authors.toLowerCase().includes(query);
        return matchYear && matchSearch;
    });
    if (filtered.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    list.innerHTML = filtered.map(pub => `
    <div class="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all">
      <div class="flex flex-col sm:flex-row gap-4">
        <span class="bg-primary text-white px-3 py-1 rounded-md text-sm font-semibold whitespace-nowrap h-fit">${pub.year}</span>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">${pub.title}</h3>
          <p class="text-gray-500 text-sm mb-2">${pub.authors}</p>
          <p class="text-primary font-medium text-sm">${pub.journal}</p>
          ${pub.doi ? `<div class="mt-2"><span class="text-xs text-gray-400">DOI:</span><a href="https://doi.org/${pub.doi}" target="_blank" class="text-xs text-primary hover:underline ml-1">${pub.doi}</a></div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function filterPubs() {
    renderPubList();
}

function populateYearFilter() {
    const pubs = getData('publications');
    const select = document.getElementById('year-select');
    if (!select) return;
    const years = [...new Set(pubs.map(p => p.year))].sort((a, b) => b - a);
    select.innerHTML = '<option value="">全部年份</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
}

function renderStats() {
    const pubs = getData('publications');
    const container = document.getElementById('pub-stats');
    if (!container) return;
    container.innerHTML = `
    <div class="bg-white p-6 rounded-xl border border-gray-200"><p class="text-3xl font-bold text-primary">${pubs.length}</p><p class="text-gray-500 text-sm mt-1">发表论文总数</p></div>
    <div class="bg-white p-6 rounded-xl border border-gray-200"><p class="text-3xl font-bold text-primary">${pubs.length}</p><p class="text-gray-500 text-sm mt-1">SCI/EI收录</p></div>
    <div class="bg-white p-6 rounded-xl border border-gray-200"><p class="text-3xl font-bold text-primary">3</p><p class="text-gray-500 text-sm mt-1">发明专利</p></div>
  `;
}

function submitForm(e) {
    e.preventDefault();
    document.getElementById('form-success').classList.remove('hidden');
    e.target.reset();
}

// ===== 初始化 =====
async function init() {
    await loadData();

    // Scroll reveal
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); });
        }, { threshold: .1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    } else {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('show'));
    }

    // Back to top
    window.addEventListener('scroll', () => {
        document.getElementById('back-top').classList.toggle('show', window.scrollY > 400);
    });

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

    window.addEventListener('hashchange', () => navigate(window.location.hash));
}

init();
