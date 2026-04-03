// ELEONOR LAB - Optimized Main JavaScript
class EleonorLab {
    constructor() {
        this.lastHeaderScrollY = window.pageYOffset || 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initNavigation();
        this.initNavOverlapHandler();
        this.initAnimations();
        this.initScrollManagement();
    }

    // Event Listeners
    setupEventListeners() {
        const onReady = () => {
            // Ensure DOM-ready initialization runs even if the script is instantiated after DOMContentLoaded
            this.handleDOMReady();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady, { once: true });
        } else {
            onReady();
        }

        window.addEventListener('scroll', () => {
            this.handleScroll();
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // DOM Ready Handler
    handleDOMReady() {
        console.log('ELEONOR LAB - Modern Website initialized');
        
        // На главной странице не обновляем активные ссылки навигации
        if (!document.body.classList.contains('home-page')) {
            this.updateActiveNavLink();
        }
        
        this.initScrollAnimations();
        
        // Убираем no-scroll если это не главная страница
        if (!document.body.classList.contains('home-page')) {
            document.body.classList.remove('no-scroll');
            document.body.style.overflow = 'auto';
        }
        
        // Инициализация кнопок на главной странице
        this.initHomePageButtons();
        this.initHeaderCtaButtons();
        this.initFeatureSlider();
        this.initLazyBackgrounds();
        this.mountHeaderNavigationToggle();
        this.initHeaderBehavior();
        this.setupSideNavToggle();
        this.initProjectsFilter();
        this.initScrollTopButtons();
        this.initBackButtons();
        this.toggleDarkNav();
        this.updateHeaderContrast();
        this.syncSideNavThemeWithToggle();
    }

    // Инициализация кнопок на главной странице
    initHomePageButtons() {
        if (!document.body.classList.contains('home-page')) return;
        
        const discussProjectBtn = document.querySelector('.discuss-project-btn');
        const presentationBtn = document.querySelector('.presentation-btn');
        
        if (discussProjectBtn) {
            discussProjectBtn.addEventListener('click', () => {
                window.location.href = 'contacts.html';
            });
        }
        
        if (presentationBtn) {
            presentationBtn.addEventListener('click', () => {
                console.log('Открыть презентацию');
                // Здесь можно добавить логику для открытия презентации
                // window.open('путь_к_презентации.pdf', '_blank');
            });
        }
    }

    // Scroll Handler
    handleScroll() {
        this.handleHeaderBehaviorOnScroll();
        this.toggleHeaderShadow();
        this.updateActiveNavLink();
        this.handleScrollAnimations();
        this.handleHeaderBackground();
        this.toggleDarkNav();
        this.updateHeaderContrast();
    }

    // Resize Handler
    handleResize() {
        this.mountHeaderNavigationToggle();
        this.syncHeaderMetrics();
        this.handleHeaderBehaviorOnScroll(true);
        this.handleMobileMenu();
        this.toggleDarkNav();
        this.updateHeaderContrast();
    }

    // Navigation
    initNavigation() {
        // Проверяем, если это главная страница, инициализируем особую навигацию
        if (document.body.classList.contains('home-page')) {
            this.setupHomePageNavigation();
            return;
        }
        
        this.setupMobileMenu();
        this.setupSmoothScrolling();
    }

    // Новый метод для навигации на главной странице
    setupHomePageNavigation() {
        const sideNavLinks = document.querySelectorAll('.side-nav-link');
        
        sideNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Если это ссылка на другую страницу, позволяем обычное поведение
                if (href.includes('.html')) {
                    return;
                }
                
                // Если это якорная ссылка на той же странице
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }

    // Отслеживание перекрытия боковой навигации и CTA-панели
    initNavOverlapHandler() {
        if (!document.body.classList.contains('home-page')) return;

        const sideNav = document.querySelector('.side-nav');
        const ctaBand = document.querySelector('.cta-band');

        if (!sideNav || !ctaBand) return;

        const items = Array.from(sideNav.querySelectorAll('.side-nav-item'));

        const checkOverlap = () => {
            const ctaRect = ctaBand.getBoundingClientRect();

            items.forEach(item => {
                const link = item.querySelector('.side-nav-link');
                if (!link) return;

                const linkRect = link.getBoundingClientRect();
                // Проверяем центр ссылки — если он внутри CTA-прямоугольника, считаем попадание
                const cx = linkRect.left + linkRect.width / 2;
                const cy = linkRect.top + linkRect.height / 2;

                const isPointInside = cx >= ctaRect.left && cx <= ctaRect.right && cy >= ctaRect.top && cy <= ctaRect.bottom;

                if (isPointInside) {
                    link.classList.add('on-cta');
                    item.classList.add('on-cta');
                } else {
                    link.classList.remove('on-cta');
                    item.classList.remove('on-cta');
                }
            });

            // Обработаем социальные ссылки внизу навигации — окрашиваем только те, которые попали в зону CTA
            const socialEls = Array.from(sideNav.querySelectorAll('.side-social a, .side-social .social-circle'));
            socialEls.forEach(el => {
                const rect = el.getBoundingClientRect();
                const cx2 = rect.left + rect.width / 2;
                const cy2 = rect.top + rect.height / 2;
                const isInside = cx2 >= ctaRect.left && cx2 <= ctaRect.right && cy2 >= ctaRect.top && cy2 <= ctaRect.bottom;
                if (isInside) {
                    el.classList.add('on-cta');
                } else {
                    el.classList.remove('on-cta');
                }
            });
        };

        // Проверяем при загрузке, скролле и изменении размера
        window.addEventListener('scroll', checkOverlap, { passive: true });
        window.addEventListener('resize', checkOverlap);

        // initial check
        setTimeout(checkOverlap, 50);
    }

    // Изменение фона header при скролле на главной странице
    handleHeaderBackground() {
        if (!document.body.classList.contains('home-page')) return;
        
        const header = document.querySelector('.home-header');
        const heroSection = document.querySelector('.hero-section');
        const principleSection = document.querySelector('.principle-section');
        
        if (!header || !heroSection || !principleSection) return;
        
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        const currentScroll = window.pageYOffset + header.offsetHeight;
        
        // Если мы прокрутили ниже героя, меняем фон header
        if (currentScroll > heroBottom) {
            header.style.backgroundColor = 'white';
            header.style.borderBottom = '1px solid #d4d4d4';
        } else {
            header.style.backgroundColor = 'transparent';
            header.style.borderBottom = 'none';
        }
    }

    setupMobileMenu() {
        const navToggle = document.querySelector('.header__toggle');
        const navMenu = document.querySelector('.header__nav');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                const isExpanded = navToggle.classList.contains('active');
                
                navToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
                
                // Блокируем прокрутку только при открытом мобильном меню
                if (navMenu.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = 'auto';
                }
            });

            // Закрытие меню при клике на ссылку
            const navLinks = navMenu.querySelectorAll('.header__link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMobileMenu();
                });
            });
        }
    }

    setupSmoothScrolling() {
        const navLinks = document.querySelectorAll('.header__link[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Плавная прокрутка только для якорей на той же странице
                if (href.startsWith('#') && href.length > 1) {
                    e.preventDefault();
                    
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        const header = document.querySelector('.header');
                        const headerHeight = header ? header.offsetHeight : 0;
                        const targetPosition = targetElement.offsetTop - headerHeight;

                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });

                        // Закрытие мобильного меню
                        this.closeMobileMenu();
                    }
                }
            });
        });
    }

    closeMobileMenu() {
        const navToggle = document.querySelector('.header__toggle');
        const navMenu = document.querySelector('.header__nav');

        if (navToggle && navMenu) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    setupSideNavToggle() {
        const toggle = document.querySelector('.side-nav-toggle');
        const sideNav = document.getElementById('side-nav');
        if (!toggle || !sideNav) return;

        const syncContrastNow = (keepDark = false) => {
            this.toggleDarkNav();
            this.updateHeaderContrast();
            if (keepDark) {
                toggle.classList.add('on-dark-contrast');
            }
            this.syncSideNavThemeWithToggle();
        };

        const scheduleSync = (keepDark = false) => {
            syncContrastNow(keepDark);
            requestAnimationFrame(() => syncContrastNow(keepDark));
            [80, 180, 320, 480].forEach(delay => {
                setTimeout(() => syncContrastNow(keepDark), delay);
            });
        };

        const updateState = (open) => {
            // Preserve current contrast when opening the menu:
            // if toggle is already light on a dark background, keep it light.
            const wasDarkContrast = toggle.classList.contains('on-dark-contrast');

            sideNav.classList.toggle('side-nav--open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            document.body.classList.toggle('side-nav-open', open);
            this.handleHeaderBehaviorOnScroll(true);

            // Recalculate contrast immediately after menu state change
            // so the toggle color does not lag until next scroll/resize.
            scheduleSync(open && wasDarkContrast);
        };

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = sideNav.classList.contains('side-nav--open');
            updateState(!isOpen);
        });

        document.addEventListener('click', (e) => {
            const isInside = sideNav.contains(e.target) || toggle.contains(e.target);
            if (!isInside) {
                updateState(false);
            }
        });

        sideNav.addEventListener('transitionend', () => {
            const keepDark =
                sideNav.classList.contains('side-nav--open') &&
                toggle.classList.contains('on-dark-contrast');
            syncContrastNow(keepDark);
            this.handleHeaderBehaviorOnScroll(true);
        });
    }

    initProjectsFilter() {
        const filter = document.querySelector('[data-project-filter]');
        if (!filter) return;

        const toggle = filter.querySelector('.projects-filter-toggle');
        const panel = filter.querySelector('.projects-filter-panel');
        const toggleIcon = filter.querySelector('.projects-filter-toggle__icon');
        const options = Array.from(filter.querySelectorAll('.projects-filter-option'));
        if (!toggle || !panel) return;

        const setOpen = (open) => {
            filter.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            panel.setAttribute('aria-hidden', open ? 'false' : 'true');
            if (toggleIcon) {
                toggleIcon.textContent = open ? '\u2193' : '\u2192';
            }
        };

        setOpen(false);

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!filter.classList.contains('is-open'));
        });

        document.addEventListener('click', (e) => {
            if (!filter.contains(e.target)) {
                setOpen(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        });

        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(item => item.classList.remove('is-active'));
                option.classList.add('is-active');
            });
        });
    }

    initScrollTopButtons() {
        const buttons = document.querySelectorAll('[data-scroll-top]');
        if (buttons.length === 0) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        buttons.forEach((button) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: prefersReducedMotion ? 'auto' : 'smooth'
                });
            });
        });
    }

    initBackButtons() {
        const buttons = document.querySelectorAll('[data-back-button]');
        if (buttons.length === 0) return;

        buttons.forEach((button) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();

                if (window.history.length > 1) {
                    window.history.back();
                    return;
                }

                window.location.href = 'index.html';
            });
        });
    }

    // Move burger into the header row so logo / CTA / burger share one line
    mountHeaderNavigationToggle() {
        const headerContainer = document.querySelector('.header .header-container');
        const toggle = document.querySelector('.side-nav-toggle');
        if (!toggle) return;

        if (headerContainer) {
            if (toggle.parentElement !== headerContainer) {
                headerContainer.appendChild(toggle);
            }
            toggle.classList.add('side-nav-toggle--in-header');
        } else {
            toggle.classList.remove('side-nav-toggle--in-header');
        }
    }

    // Единая CTA-кнопка в шапке на всех страницах
    initHeaderCtaButtons() {
        const headerButtons = document.querySelectorAll('.start-work-btn');
        if (headerButtons.length === 0) return;

        headerButtons.forEach((button) => {
            if (button.dataset.boundCta === 'true') return;
            button.dataset.boundCta = 'true';

            button.addEventListener('click', () => {
                window.location.href = 'contacts.html';
            });
        });
    }

    syncHeaderMetrics() {
        const header = document.querySelector('.header');
        if (!header) return;

        const headerHeight = Math.round(header.getBoundingClientRect().height);
        if (headerHeight > 0) {
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        }
    }

    initHeaderBehavior() {
        const header = document.querySelector('.header');
        if (!header) return;

        this.syncHeaderMetrics();
        this.lastHeaderScrollY = window.pageYOffset || 0;
        this.handleHeaderBehaviorOnScroll(true);
    }

    // Reference-like behavior: transparent at top, sticky on scroll, hide on scroll-down, show on scroll-up
    handleHeaderBehaviorOnScroll(force = false) {
        const header = document.querySelector('.header');
        if (!header) return;

        const sideNav = document.getElementById('side-nav');
        const menuOpen = !!(sideNav && sideNav.classList.contains('side-nav--open'));
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        const delta = scrollY - this.lastHeaderScrollY;

        const stickyStart = 12;
        const hideStart = 140;
        const minDelta = 6;

        if (scrollY <= stickyStart) {
            header.classList.add('header--at-top');
            header.classList.remove('header--sticky', 'header--hidden');
        } else {
            header.classList.remove('header--at-top');
            header.classList.add('header--sticky');

            if (menuOpen) {
                header.classList.remove('header--hidden');
            } else if (force || Math.abs(delta) >= minDelta) {
                if (delta > 0 && scrollY > hideStart) {
                    header.classList.add('header--hidden');
                } else if (delta < 0) {
                    header.classList.remove('header--hidden');
                }
            }
        }

        this.lastHeaderScrollY = scrollY;
    }

    // Header Effects
    toggleHeaderShadow() {
        const header = document.querySelector('.header');
        if (!header) return;
        
        const scrollY = window.scrollY;

        if (scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.header__link');
        
        if (sections.length === 0 || navLinks.length === 0) return;
        
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // Animations
    initAnimations() {
        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animateElements = document.querySelectorAll(
            '.fade-in, .project-item, .about-title, .about-subtitle, .about-text p, .founder-photo, .about-principles, .founder-quote'
        );
        animateElements.forEach(el => {
            if (el) observer.observe(el);
        });
    }

    handleScrollAnimations() {
        this.handleParallaxEffects();
    }

    handleParallaxEffects() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        if (parallaxElements.length === 0) return;
        
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach(element => {
            const rate = element.getAttribute('data-parallax-rate') || 0.5;
            element.style.transform = `translateY(${scrolled * rate}px)`;
        });
    }

    initScrollAnimations() {
        this.setupIntersectionObserver();
    }

    // Feature slider on the home page
    initFeatureSlider() {
        if (!document.body.classList.contains('home-page')) return;
        const slider = document.querySelector('.feature-slider');
        if (!slider) return;

        const slides = Array.from(slider.querySelectorAll('.project-slide'));
        const peek = slider.querySelector('.slide-peek');
        const peekContent = peek ? peek.querySelector('.slide-peek__content') : null;
        if (slides.length === 0) return;

        let currentIndex = slides.findIndex(
            slide => slide.classList.contains('project-slide_active') || slide.classList.contains('active')
        );
        if (currentIndex === -1) {
            currentIndex = 0;
            slides[0].classList.add('active');
        }

        const transitionDuration = 650;
        let isSwitching = false;

        const getBg = (slide) => {
            const bg = slide ? slide.querySelector('.slide-bg') : null;
            return bg ? bg.style.backgroundImage : '';
        };

        const setPeek = () => {
            if (!peek) return;
            const nextIndex = (currentIndex + 1) % slides.length;
            const nextSlide = slides[nextIndex];
            peek.style.backgroundImage = getBg(nextSlide);
            if (peekContent && nextSlide) {
                const nextContent = nextSlide.querySelector('.slide-content');
                peekContent.innerHTML = nextContent ? nextContent.innerHTML : '';
            }
        };

        const setStates = () => {
            slides.forEach((slide, idx) => {
                slide.classList.remove('next', 'far', 'active', 'project-slide_next', 'project-slide_far', 'project-slide_active', 'project-slide_leaving');
                const diff = (idx - currentIndex + slides.length) % slides.length;
                if (diff === 0) {
                    slide.classList.add('project-slide_active', 'active');
                } else if (diff === 1) {
                    slide.classList.add('project-slide_next', 'next');
                } else {
                    slide.classList.add('project-slide_far', 'far');
                }
            });
        };

        const getTitle = (slide) => {
            if (!slide) return '';
            const dataLabel = slide.dataset.toggleLabel;
            const titleEl = slide.querySelector('.slide-title');
            return (dataLabel || (titleEl ? titleEl.textContent : '')).trim();
        };

        const setNextLabel = () => {
            const nextIndex = (currentIndex + 1) % slides.length;
            const nextLabel = getTitle(slides[nextIndex]);
            const activeSlide = slides[currentIndex];
            const labelEl = activeSlide.querySelector('.slide-next-label');
            if (labelEl && nextLabel) {
                labelEl.textContent = nextLabel;
            }
        };

        const updateNextThumbs = () => {
            slides.forEach((slide, idx) => {
                const btn = slide.querySelector('.slide-next');
                if (!btn) return;
                const nextIdx = (idx + 1) % slides.length;
                const nextSlide = slides[nextIdx];
                const nextLabel = nextSlide.dataset.toggleLabel || '';
                btn.setAttribute('data-label', nextLabel);
            });
        };

        const autoplay = false;
        const autoplayDelay = 6500;
        let autoplayId = null;

        const stopAutoplay = () => {
            if (autoplayId) {
                clearInterval(autoplayId);
                autoplayId = null;
            }
        };

        const startAutoplay = () => {
            stopAutoplay();
            if (!autoplay) return;
            autoplayId = setInterval(() => {
                const targetIndex = (currentIndex + 1) % slides.length;
                goTo(targetIndex);
            }, autoplayDelay);
        };

        const goTo = (targetIndex) => {
            if (targetIndex === currentIndex || isSwitching) return;
            const currentSlide = slides[currentIndex];
            const nextSlide = slides[targetIndex];
            if (!nextSlide || !currentSlide) return;
            isSwitching = true;
            slider.classList.add('transitioning');

            currentSlide.classList.add('project-slide_leaving');
            nextSlide.classList.add('project-slide_active', 'active');
            if (peek) {
                peek.classList.add('animating');
                setTimeout(() => peek.classList.remove('animating'), transitionDuration);
            }

            setTimeout(() => {
                currentSlide.classList.remove('project-slide_active', 'project-slide_leaving', 'active');
                currentIndex = targetIndex;
                setStates();
                setNextLabel();
                updateNextThumbs();
                setPeek();
                slider.classList.remove('transitioning');
                isSwitching = false;
                startAutoplay();
            }, transitionDuration);
        };

        const goNext = () => goTo((currentIndex + 1) % slides.length);
        const goPrev = () => goTo((currentIndex - 1 + slides.length) % slides.length);

        slider.querySelectorAll('.slide-next').forEach(button => {
            button.addEventListener('click', goNext);
            button.addEventListener('mouseenter', () => slider.classList.add('peek-hover'));
            button.addEventListener('mouseleave', () => slider.classList.remove('peek-hover'));
        });

        const keyHandler = (e) => {
            const tag = document.activeElement?.tagName;
            if (tag && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', keyHandler);

        slider.addEventListener('mouseenter', stopAutoplay);
        slider.addEventListener('mouseleave', startAutoplay);

        updateNextThumbs();
        setStates();
        setNextLabel();
        setPeek();
        startAutoplay();
    }

    initLazyBackgrounds() {
        const bgElements = Array.from(document.querySelectorAll('[data-bg]'));
        if (bgElements.length === 0) return;

        const applyBackground = (element) => {
            if (!element || element.dataset.bgLoaded === 'true') return;
            const source = element.getAttribute('data-bg');
            if (!source) return;
            element.style.backgroundImage = `url('${source}')`;
            element.dataset.bgLoaded = 'true';
        };

        if (!('IntersectionObserver' in window)) {
            bgElements.forEach(applyBackground);
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                applyBackground(entry.target);
                obs.unobserve(entry.target);
            });
        }, {
            rootMargin: '300px 0px',
            threshold: 0.01
        });

        bgElements.forEach(element => observer.observe(element));
    }

    // Scroll Management
    initScrollManagement() {
        const isHomePage = document.body.classList.contains('home-page');
        if (!isHomePage) {
            document.body.classList.remove('no-scroll');
            document.body.style.overflow = 'auto';
        }
    }

    handleMobileMenu() {
        if (window.innerWidth > 768) {
            this.closeMobileMenu();
        }
    }

    // Toggle nav color on dark sections
    toggleDarkNav() {
        const links = document.querySelectorAll('.side-nav .side-nav-link');
        const socials = document.querySelectorAll('.side-nav .social-circle');
        const darkSections = this.getDarkSections();
        if (links.length === 0 && socials.length === 0) return;

        // Prevent stale white/black states when page has no dark sections.
        if (darkSections.length === 0) {
            links.forEach(link => link.classList.remove('on-dark-item'));
            socials.forEach(icon => icon.classList.remove('on-dark-item'));
            return;
        }

        const isInsideDarkSection = (cx, cy) => darkSections.some(section => {
            const rect = section.getBoundingClientRect();
            return cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
        });

        links.forEach(link => {
            const linkRect = link.getBoundingClientRect();
            const cx = linkRect.left + linkRect.width / 2;
            const cy = linkRect.top + linkRect.height / 2;
            const inside = isInsideDarkSection(cx, cy);
            link.classList.toggle('on-dark-item', inside);
        });

        socials.forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            const cx = iconRect.left + iconRect.width / 2;
            const cy = iconRect.top + iconRect.height / 2;
            const inside = isInsideDarkSection(cx, cy);
            icon.classList.toggle('on-dark-item', inside);
        });
    }

    // Switch header/logo/button to light theme on dark sections
    updateHeaderContrast() {
        const darkSections = this.getDarkSections();
        const logo = document.querySelector('.home-logo');
        const startBtn = document.querySelector('.start-work-btn');
        const toggle = document.querySelector('.side-nav-toggle');
        const sideNav = document.getElementById('side-nav');

        if (darkSections.length === 0) {
            [logo, startBtn, toggle].forEach(el => {
                if (el) el.classList.remove('on-dark-contrast');
            });
            this.syncSideNavThemeWithToggle();
            return;
        }

        const isInsideDarkSection = (cx, cy) => darkSections.some(section => {
            const rect = section.getBoundingClientRect();
            return cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
        });

        const elements = [logo, startBtn, toggle];

        elements.forEach(el => {
            if (!el) return;
            const elRect = el.getBoundingClientRect();
            const cx = elRect.left + elRect.width / 2;
            const cy = elRect.top + elRect.height / 2;
            const inside = isInsideDarkSection(cx, cy);
            el.classList.toggle('on-dark-contrast', inside);
        });

        // Ensure immediate white contrast for the toggle when menu is open
        // on dedicated dark-themed pages, even before any scroll event.
        if (toggle) {
            const darkPage =
                document.body.classList.contains('contacts-ref-page') ||
                document.body.classList.contains('tour-signup-page');
            const menuOpen = sideNav && sideNav.classList.contains('side-nav--open');
            if (menuOpen && darkPage) {
                toggle.classList.add('on-dark-contrast');
            }
        }

        this.syncSideNavThemeWithToggle();
    }

    getDarkSections() {
        return Array.from(document.querySelectorAll(
            '.contact-cta-section, ' +
            '.projects-min-footer, ' +
            '.contacts-ref, ' +
            '.contacts-ref-page, ' +
            '.tour-signup, ' +
            '.tour-signup--footer, ' +
            '.tour-signup-page, ' +
            '.feature-slider'
        ));
    }

    // Keep slide-out menu theme aligned with the nav toggle color.
    syncSideNavThemeWithToggle() {
        const toggle = document.querySelector('.side-nav-toggle');
        const sideNav = document.getElementById('side-nav');
        if (!toggle || !sideNav) return;

        const darkMode = toggle.classList.contains('on-dark-contrast');
        sideNav.classList.toggle('side-nav--panel-dark', darkMode);
    }

    // Utility Methods
    handleErrors() {
        window.addEventListener('error', (e) => {
            console.error('JavaScript Error:', e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled Promise Rejection:', e.reason);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new EleonorLab();

    // Run once after full load to account for late layout shifts (images/fonts).
    window.addEventListener('load', () => {
        app.toggleDarkNav();
        app.updateHeaderContrast();
    });
});

// Export for modern browsers
if (typeof window !== 'undefined') {
    window.EleonorLab = EleonorLab;
}

