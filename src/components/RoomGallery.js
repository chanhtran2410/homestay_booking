import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import useScrollReveal from '../hooks/useScrollReveal';
import { ROOM_DATA, formatPrice, CONTACT_INFO } from '../constants/roomData';
import {
    DAY_PLAN,
    DEFAULT_ROOM_THEME,
    DIRECTIONS,
    DIRECTIONS_INTRO,
    FOOTER,
    HERO_IMAGE,
    LOCATION,
    MARQUEE_ITEMS,
    ROOM_THEME,
    STORY,
    STORY_IMAGE,
} from '../constants/landingContent';
import './RoomGallery.css';

const WORDMARK = 'BẰNG LĂNG HILL';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// 0903664474 -> 0903 664 474
const formatPhone = (phone) =>
    phone.replace(/\D/g, '').replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3');

// Giá rút gọn cho khối thống kê: 600000 -> "600k"
const shortPrice = (price) =>
    price >= 1000000
        ? `${(price / 1000000).toFixed(price % 1000000 ? 1 : 0)}tr`
        : `${Math.round(price / 1000)}k`;

const scrollRailTo = (rail, left) => {
    if (!rail) return;
    if (typeof rail.scrollTo === 'function') {
        rail.scrollTo({ left, behavior: 'smooth' });
    } else {
        rail.scrollLeft = left;
    }
};

const useScrollY = () => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                setScrollY(window.scrollY);
            });
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return scrollY;
};

const useViewportHeight = () => {
    const [height, setHeight] = useState(
        typeof window === 'undefined' ? 900 : window.innerHeight
    );

    useEffect(() => {
        const onResize = () => setHeight(window.innerHeight);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return height || 900;
};

// Tiến trình 0 -> 1 khi khối `ref` đi vào khung nhìn, dùng cho hiệu ứng reveal.
const useRevealProgress = (ref, scrollY) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const { top } = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        setProgress(clamp01((vh - top) / (vh * 0.75)));
    }, [ref, scrollY]);

    return progress;
};

const CATEGORIES = [
    { key: 'all', label: 'Tất cả' },
    { key: 'bungalow', label: 'Bungalow' },
    { key: 'room', label: 'Phòng' },
];

const HillMap = () => (
    <svg className="bl-map__svg" viewBox="0 0 800 600" aria-hidden="true">
        <rect width="800" height="600" fill="#E7E2D2" />
        <g fill="none" stroke="#CDC6B0" strokeWidth="1.5">
            <path d="M-20 470 C 140 430 260 460 400 415 S 660 330 820 360" />
            <path d="M-20 420 C 150 375 270 410 410 360 S 660 275 820 305" />
            <path d="M-20 372 C 160 322 280 358 420 305 S 660 220 820 250" />
            <path d="M-20 324 C 170 270 290 306 430 250 S 660 165 820 196" />
            <path d="M-20 276 C 180 220 300 254 440 196 S 660 112 820 142" />
            <path d="M40 228 C 200 178 320 206 450 150 S 660 60 820 88" />
        </g>
        <path
            d="M-20 560 C 120 545 210 520 300 470 C 380 425 450 400 560 392 L 820 386"
            fill="none"
            stroke="#B3BCAB"
            strokeWidth="16"
            strokeLinecap="round"
        />
        <path
            d="M-20 560 C 120 545 210 520 300 470 C 380 425 450 400 560 392 L 820 386"
            fill="none"
            stroke="#F2EEE3"
            strokeWidth="4"
            strokeDasharray="14 12"
            strokeLinecap="round"
        />
        <g fill="#6C7A67" opacity="0.55">
            <path d="M120 300 l16 30 h-32z" />
            <path d="M172 268 l20 38 h-40z" />
            <path d="M600 250 l18 34 h-36z" />
            <path d="M646 276 l14 26 h-28z" />
        </g>
        <g transform="translate(556,368)">
            <circle r="30" fill="#18231A" opacity="0.12" />
            <circle r="13" fill="#18231A" />
            <circle r="5" fill="#F2EEE3" />
        </g>
    </svg>
);

const RoomGallery = () => {
    const scrollY = useScrollY();
    const viewportH = useViewportHeight();

    const [category, setCategory] = useState('all');
    const [active, setActive] = useState(0);
    const [detailId, setDetailId] = useState(null);
    const [pageProgress, setPageProgress] = useState(0);

    const railRef = useRef(null);
    const storyRef = useRef(null);
    const mapRef = useRef(null);
    const pageRef = useRef(null);

    useScrollReveal(pageRef);

    useEffect(() => {
        document.body.classList.add('bl-landing');
        return () => document.body.classList.remove('bl-landing');
    }, []);

    const storyP = useRevealProgress(storyRef, scrollY);
    const mapP = useRevealProgress(mapRef, scrollY);

    const rooms = useMemo(
        () =>
            ROOM_DATA.map((room) => ({
                ...room,
                theme: ROOM_THEME[room.id] || DEFAULT_ROOM_THEME,
                tag: room.type === 'bungalow' ? 'BUNGALOW' : 'PHÒNG',
                short: `${room.capacity} khách · ${room.size}`,
                cover: room.images?.[0] || room.thumbnail,
            })),
        []
    );

    const list = useMemo(
        () =>
            category === 'all'
                ? rooms
                : rooms.filter((room) => room.type === category),
        [rooms, category]
    );

    const stats = useMemo(() => {
        const caps = ROOM_DATA.map((room) => room.capacity);
        const minPrice = Math.min(
            ...ROOM_DATA.map((room) => room.pricing.weekday)
        );
        return {
            count: ROOM_DATA.length,
            capacity: `${Math.min(...caps)}–${Math.max(...caps)}`,
            from: shortPrice(minPrice),
        };
    }, []);

    const phone = formatPhone(CONTACT_INFO.phone);
    const activeIndex = Math.min(active, Math.max(0, list.length - 1));
    const activeRoom = list[activeIndex] || rooms[0];
    const detail = detailId
        ? rooms.find((room) => room.id === detailId) || null
        : null;

    // --- parallax hero -----------------------------------------------------
    const p = clamp01(scrollY / viewportH);
    const ease = 1 - Math.pow(1 - p, 2);
    const heroScale = (1.02 + ease * 0.07).toFixed(3);
    const heroY = (-ease * 70).toFixed(0);
    const titleY = (-p * 96).toFixed(0);
    const titleOpacity = Math.max(0, 1 - Math.max(0, p - 0.62) * 3.4).toFixed(2);
    const veilOpacity = clamp01((p - 0.25) / 0.6).toFixed(2);
    const cueOpacity = p > 0.06 ? 0 : 1;

    useEffect(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        setPageProgress(max > 0 ? clamp01(scrollY / max) : 0);
    }, [scrollY]);

    // --- rail --------------------------------------------------------------
    const measure = useCallback(() => {
        const rail = railRef.current;
        if (!rail) return;
        const cards = Array.from(rail.children);
        if (!cards.length) return;
        const mid = rail.scrollLeft + rail.clientWidth / 2;
        let best = 0;
        let bestDistance = Infinity;
        cards.forEach((card, index) => {
            const distance = Math.abs(
                card.offsetLeft + card.offsetWidth / 2 - mid
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                best = index;
            }
        });
        setActive((prev) => (prev === best ? prev : best));
    }, []);

    const onRailScroll = useCallback(() => {
        requestAnimationFrame(measure);
    }, [measure]);

    const scrollToCard = useCallback((index) => {
        const rail = railRef.current;
        const card = rail && rail.children[index];
        if (!card) return;
        scrollRailTo(
            rail,
            card.offsetLeft + card.offsetWidth / 2 - rail.clientWidth / 2
        );
    }, []);

    const selectCategory = useCallback((key) => {
        setCategory(key);
        setActive(0);
        scrollRailTo(railRef.current, 0);
    }, []);

    // --- detail sheet ------------------------------------------------------
    const closeDetail = useCallback(() => setDetailId(null), []);

    useEffect(() => {
        if (!detail) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event) => {
            if (event.key === 'Escape') closeDetail();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [detail, closeDetail]);

    return (
        <div className="bl-page" ref={pageRef}>
            <div className="bl-progress">
                <span
                    style={{ width: `${(pageProgress * 100).toFixed(1)}%` }}
                />
            </div>

            {/* ================= HERO ================= */}
            <section className="bl-hero">
                <div
                    className="bl-hero__layer"
                    style={{
                        transform: `scale(${heroScale}) translateY(${heroY}px)`,
                    }}
                >
                    <img
                        className="bl-hero__img"
                        src={HERO_IMAGE}
                        alt="Bungalow Bằng Lăng Hill giữa đồi"
                    />
                    <div className="bl-hero__grade" />
                </div>

                <div
                    className="bl-hero__veil"
                    style={{ opacity: veilOpacity }}
                />

                <nav className="bl-nav">
                    <div className="bl-nav__pill">
                        <div className="bl-nav__brand">
                            <svg viewBox="0 0 28 28" aria-hidden="true">
                                <circle cx="14" cy="14" r="13" fill="#20301F" />
                                <path
                                    d="M21.6 7.2c1.2 6.8-1.8 13.2-7.6 14.4-2 .4-3.8-.2-5-1.4 2.4-4.4 5.6-7.9 9.5-10.4-4.8 1.9-8.3 5.1-10.2 9.3-1.6-4.2.4-9.3 4.8-11.2 2.8-1.2 6-1.3 8.5-.7z"
                                    fill="#F2EEE3"
                                />
                            </svg>
                            <span>BẰNG LĂNG HILL</span>
                        </div>
                        <div className="bl-nav__links">
                            <a href="#phong-nghi">Phòng nghỉ</a>
                            <a href="#trai-nghiem">Trải nghiệm</a>
                            <a
                                href={LOCATION.mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Đường đi
                            </a>
                            <a
                                className="bl-nav__cta"
                                href={`tel:${CONTACT_INFO.phone}`}
                            >
                                Gọi {phone}
                            </a>
                        </div>
                    </div>
                </nav>

                <div
                    className="bl-hero__title"
                    style={{
                        transform: `translateY(${titleY}px)`,
                        opacity: titleOpacity,
                    }}
                >
                    <h1 className="bl-wordmark">
                        {Array.from(WORDMARK).map((char, index) =>
                            char === ' ' ? (
                                <span
                                    key={`space-${index}`}
                                    className="bl-wordmark__space"
                                />
                            ) : (
                                <span
                                    key={`${char}-${index}`}
                                    className="bl-wordmark__char"
                                    style={{
                                        animationDelay: `${(
                                            0.08 +
                                            index * 0.045
                                        ).toFixed(2)}s`,
                                    }}
                                >
                                    {char}
                                </span>
                            )
                        )}
                    </h1>
                    <p className="bl-hero__place">{LOCATION.region}</p>
                </div>

                <div className="bl-hero__cue" style={{ opacity: cueOpacity }}>
                    <i />
                    <span>CUỘN XUỐNG ↓</span>
                </div>
            </section>

            {/* ================= CONTENT ================= */}
            <div className="bl-content">
                <div className="bl-marquee">
                    <div className="bl-marquee__track">
                        {[0, 1].map((copy) =>
                            MARQUEE_ITEMS.map((item) => (
                                <React.Fragment key={`${copy}-${item}`}>
                                    <span>{item}</span>
                                    <span className="bl-marquee__dot">✳</span>
                                </React.Fragment>
                            ))
                        )}
                    </div>
                </div>

                {/* ---- story ---- */}
                <section className="bl-story" ref={storyRef}>
                    <div
                        className="bl-story__text"
                        style={{
                            transform: `translateY(${((1 - storyP) * 46).toFixed(
                                0
                            )}px)`,
                            opacity: Math.min(1, 0.25 + storyP),
                        }}
                    >
                        <p className="bl-eyebrow">{STORY.eyebrow}</p>
                        <h2 className="bl-display">
                            {STORY.title[0]}
                            <br />
                            {STORY.title[1]}
                        </h2>
                        <p className="bl-body">{STORY.body}</p>
                        <div className="bl-stats">
                            <div>
                                <strong>{stats.count}</strong>
                                <span>CHỖ NGHỈ</span>
                            </div>
                            <div>
                                <strong>{stats.capacity}</strong>
                                <span>KHÁCH / PHÒNG</span>
                            </div>
                            <div>
                                <strong>{stats.from}</strong>
                                <span>GIÁ TỪ / ĐÊM</span>
                            </div>
                        </div>
                    </div>
                    <div
                        className="bl-story__media"
                        style={{
                            clipPath: `inset(${((1 - storyP) * 88).toFixed(
                                0
                            )}% 0 0 0)`,
                        }}
                    >
                        <img src={STORY_IMAGE} alt="Bãi cỏ trước nhà chính" />
                        <span className="bl-story__caption">
                            {STORY.caption}
                        </span>
                    </div>
                </section>

                {/* ---- rooms ---- */}
                <section className="bl-rooms" id="phong-nghi">
                    <div className="bl-rooms__bgs">
                        {list.map((room, index) => (
                            <div
                                key={room.id}
                                className={`bl-rooms__bg${
                                    index === activeIndex
                                        ? ' bl-rooms__bg--on'
                                        : ''
                                }`}
                                style={{
                                    background: room.theme,
                                    transform:
                                        index === activeIndex
                                            ? 'scale(1.04)'
                                            : `scale(1.12) translateX(${
                                                  index > activeIndex ? 3 : -3
                                              }%)`,
                                }}
                            >
                                <img src={room.cover} alt="" />
                            </div>
                        ))}
                        <div className="bl-rooms__scrim" />
                    </div>

                    <div className="bl-rooms__inner">
                        <div className="bl-rooms__head" data-reveal>
                            <div>
                                <p className="bl-eyebrow bl-eyebrow--light">
                                    CHỖ NGHỈ · {activeIndex + 1} / {list.length}
                                </p>
                                <h2 className="bl-display bl-display--light">
                                    {activeRoom.name}
                                </h2>
                                <p className="bl-rooms__meta">
                                    {activeRoom.capacity} khách ·{' '}
                                    {activeRoom.size} · {activeRoom.bedType} ·
                                    từ {formatPrice(activeRoom.pricing.weekday)}{' '}
                                    / đêm
                                </p>
                            </div>

                            <div className="bl-rooms__controls">
                                <div className="bl-tabs">
                                    {CATEGORIES.map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            className={`bl-tab${
                                                category === tab.key
                                                    ? ' bl-tab--on'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                selectCategory(tab.key)
                                            }
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="bl-round"
                                    aria-label="Phòng trước"
                                    onClick={() =>
                                        scrollToCard(Math.max(0, active - 1))
                                    }
                                >
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    className="bl-round"
                                    aria-label="Phòng kế tiếp"
                                    onClick={() =>
                                        scrollToCard(
                                            Math.min(list.length - 1, active + 1)
                                        )
                                    }
                                >
                                    ›
                                </button>
                            </div>
                        </div>

                        <div
                            className="bl-rail"
                            ref={railRef}
                            onScroll={onRailScroll}
                        >
                            {list.map((room, index) => (
                                <button
                                    type="button"
                                    key={room.id}
                                    className={`bl-card${
                                        index === activeIndex
                                            ? ' bl-card--on'
                                            : ''
                                    }${
                                        Math.abs(index - activeIndex) > 2
                                            ? ' bl-card--far'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        setActive(index);
                                        setDetailId(room.id);
                                    }}
                                >
                                    <span
                                        className="bl-card__frame"
                                        style={{ background: room.theme }}
                                    >
                                        <img src={room.cover} alt={room.name} />
                                        <span className="bl-card__scrim" />
                                        <span className="bl-card__tag">
                                            {room.tag}
                                        </span>
                                        <span className="bl-card__go">→</span>
                                        <span className="bl-card__foot">
                                            <span className="bl-card__name">
                                                {room.name}
                                            </span>
                                            <span className="bl-card__line">
                                                <span>{room.short}</span>
                                                <span>
                                                    {formatPrice(
                                                        room.pricing.weekday
                                                    )}
                                                </span>
                                            </span>
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="bl-dots">
                            {list.map((room, index) => (
                                <button
                                    type="button"
                                    key={room.id}
                                    aria-label={`Xem ${room.name}`}
                                    className={`bl-dot${
                                        index === activeIndex
                                            ? ' bl-dot--on'
                                            : ''
                                    }`}
                                    onClick={() => scrollToCard(index)}
                                />
                            ))}
                            <span className="bl-dots__hint">
                                Bấm thẻ để xem chi tiết
                            </span>
                        </div>
                    </div>
                </section>

                {/* ---- map ---- */}
                <section className="bl-map" ref={mapRef}>
                    <div className="bl-map__sticky">
                        <div data-reveal>
                            <p className="bl-eyebrow">ĐƯỜNG ĐI</p>
                            <h2 className="bl-display">Tìm đến đồi</h2>
                            <p className="bl-body">{DIRECTIONS_INTRO}</p>
                            <ol className="bl-steps" data-reveal data-delay="1">
                                {DIRECTIONS.map((step, index) => (
                                    <li key={step}>
                                        <span>
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ol>
                            <a
                                className="bl-btn bl-btn--dark"
                                href={LOCATION.mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Mở Google Maps →
                            </a>
                        </div>
                        <a
                            className="bl-map__card"
                            href={LOCATION.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                transform: `translateY(${(
                                    (1 - mapP) *
                                    40
                                ).toFixed(0)}px) scale(${(
                                    0.96 +
                                    mapP * 0.04
                                ).toFixed(3)})`,
                            }}
                        >
                            <HillMap />
                            <span className="bl-map__coords">
                                {LOCATION.coords}
                            </span>
                            <span className="bl-map__open">Mở chỉ đường</span>
                        </a>
                    </div>
                </section>

                {/* ---- a day on the hill ---- */}
                <section className="bl-day" id="trai-nghiem">
                    <p className="bl-eyebrow" data-reveal>
                        MỘT NGÀY TRÊN ĐỒI
                    </p>
                    <h2 className="bl-display" data-reveal>
                        Giờ nào cũng có việc để làm
                    </h2>
                    <div className="bl-day__grid" data-reveal>
                        {DAY_PLAN.map((item) => (
                            <article key={item.time} className="bl-day__item">
                                <p className="bl-day__time">{item.time}</p>
                                <h3 className="bl-day__title">{item.title}</h3>
                                <p className="bl-body bl-body--sm">
                                    {item.body}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* ---- footer ---- */}
                <footer className="bl-footer">
                    <div className="bl-footer__top" data-reveal>
                        <h2 className="bl-display bl-display--light">
                            {FOOTER.title[0]}
                            <br />
                            {FOOTER.title[1]}
                        </h2>
                        <div className="bl-footer__actions">
                            <a
                                className="bl-btn bl-btn--cream"
                                href={`tel:${CONTACT_INFO.phone}`}
                            >
                                Gọi {phone}
                            </a>
                            <a
                                className="bl-btn bl-btn--ghost"
                                href={CONTACT_INFO.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Facebook “Bằng Lăng Hill”
                            </a>
                        </div>
                    </div>
                    <div className="bl-footer__bottom" data-reveal data-delay="1">
                        <span>
                            © {new Date().getFullYear()} Bằng Lăng Hill · Hàm
                            Thuận Nam, Bình Thuận
                        </span>
                        <span>{FOOTER.policy}</span>
                    </div>
                </footer>
            </div>

            {/* ================= DETAIL SHEET ================= */}
            {detail && (
                <div className="bl-sheet" role="dialog" aria-modal="true">
                    <div className="bl-sheet__scrim" onClick={closeDetail} />
                    <div className="bl-sheet__panel">
                        <div
                            className="bl-sheet__hero"
                            style={{ background: detail.theme }}
                        >
                            <img src={detail.cover} alt={detail.name} />
                            <span className="bl-sheet__tag">{detail.tag}</span>
                            <button
                                type="button"
                                className="bl-sheet__close"
                                onClick={closeDetail}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <div className="bl-sheet__body">
                            <div className="bl-sheet__head">
                                <h2 className="bl-display bl-display--sm">
                                    {detail.name}
                                </h2>
                                <span className="bl-sheet__id">
                                    {detail.id}
                                </span>
                            </div>

                            <div className="bl-facts">
                                <div>
                                    <p>SỨC CHỨA</p>
                                    <strong>{detail.capacity} khách</strong>
                                </div>
                                <div>
                                    <p>DIỆN TÍCH</p>
                                    <strong>{detail.size}</strong>
                                </div>
                                <div>
                                    <p>GIƯỜNG</p>
                                    <strong>{detail.bedType}</strong>
                                </div>
                            </div>

                            <p className="bl-body">{detail.description}</p>

                            <div className="bl-chips">
                                {detail.amenities.map((amenity) => (
                                    <span key={amenity}>{amenity}</span>
                                ))}
                            </div>

                            <div className="bl-price">
                                <div className="bl-price__head">
                                    <span>BẢNG GIÁ</span>
                                    <span>MỖI ĐÊM</span>
                                </div>
                                <div className="bl-price__row">
                                    <span>Ngày thường</span>
                                    <span>
                                        {formatPrice(detail.pricing.weekday)}
                                    </span>
                                </div>
                                <div className="bl-price__row">
                                    <span>Cuối tuần</span>
                                    <span>
                                        {formatPrice(detail.pricing.weekend)}
                                    </span>
                                </div>
                                <div className="bl-price__row bl-price__row--hl">
                                    <span>Ngày lễ</span>
                                    <span>
                                        {formatPrice(detail.pricing.holiday)}
                                    </span>
                                </div>
                            </div>

                            <p className="bl-sheet__note">
                                Phụ thu {formatPrice(detail.extraPersonFee)} /
                                khách vượt sức chứa.
                            </p>

                            <div className="bl-sheet__actions">
                                <a
                                    className="bl-btn bl-btn--dark bl-btn--grow"
                                    href={`tel:${CONTACT_INFO.phone}`}
                                >
                                    Gọi {phone}
                                </a>
                                <a
                                    className="bl-btn bl-btn--outline"
                                    href={CONTACT_INFO.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Facebook
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomGallery;
