import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getLastSync, DATA_SOURCE } from './api';
import { BottomSheet, useBodyClass } from './ui';
import useScrollReveal from '../hooks/useScrollReveal';
import './admin.css';

export const NAV_ITEMS = [
    { label: 'Tổng quan', path: '/' },
    { label: 'Đặt phòng', path: '/booking' },
    { label: 'Lịch tháng', path: '/month-checking' },
    { label: 'Kiểm tra phòng', path: '/availability' },
    { label: 'Phòng trống theo ngày', path: '/date_checking' },
    { label: 'Xoá đặt phòng', path: '/remove-booking' },
    { label: 'Báo cáo', path: '/reports' },
    { label: 'Quản lý phòng', path: '/rooms', badge: '6' },
];

const TAB_ITEMS = [
    { icon: '◆', label: 'Tổng quan', path: '/' },
    { icon: '▦', label: 'Lịch', path: '/month-checking' },
    { icon: '+', label: 'Đặt phòng', path: '/booking' },
    { icon: '◎', label: 'Kiểm tra', path: '/availability' },
];

const MORE_ITEMS = [
    { icon: '☷', label: 'Phòng trống theo ngày', path: '/date_checking' },
    { icon: '✕', label: 'Xoá đặt phòng', path: '/remove-booking' },
    { icon: '▤', label: 'Báo cáo', path: '/reports' },
    { icon: '⌂', label: 'Trang phòng công khai', path: '/rooms' },
];

const BrandMark = ({ circle = '#2B3A2C' }) => (
    <svg viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="13" fill={circle} />
        <path
            d="M21.6 7.2c1.2 6.8-1.8 13.2-7.6 14.4-2 .4-3.8-.2-5-1.4 2.4-4.4 5.6-7.9 9.5-10.4-4.8 1.9-8.3 5.1-10.2 9.3-1.6-4.2.4-9.3 4.8-11.2 2.8-1.2 6-1.3 8.5-.7z"
            fill="#F2EEE3"
        />
    </svg>
);

// admin_users.full_name nếu có, không thì suy ra từ phần trước @ của email.
export const displayName = (user) => {
    if (user?.fullName) return user.fullName;
    const local = user?.email?.split('@')[0];
    if (!local) return 'bạn';
    return local.charAt(0).toUpperCase() + local.slice(1);
};

const minutesAgo = (timestamp) =>
    Math.max(0, Math.round((Date.now() - timestamp) / 60000));

const SyncLine = () => {
    const [, force] = useState(0);

    useEffect(() => {
        const id = setInterval(() => force((n) => n + 1), 30000);
        return () => clearInterval(id);
    }, []);

    const last = getLastSync();
    return (
        <div className="ad-src">
            <div className="ad-src__k">NGUỒN DỮ LIỆU</div>
            <a
                className="ad-src__v"
                href={DATA_SOURCE.url}
                target="_blank"
                rel="noopener noreferrer"
            >
                {DATA_SOURCE.label}
            </a>
            <div className="ad-src__sync">
                <i />
                <span>
                    {last
                        ? `Đồng bộ ${minutesAgo(last)} phút trước`
                        : 'Chưa đọc dữ liệu'}
                </span>
            </div>
        </div>
    );
};

const SessionLine = ({ expiresAt }) => {
    const [, force] = useState(0);

    useEffect(() => {
        const id = setInterval(() => force((n) => n + 1), 30000);
        return () => clearInterval(id);
    }, []);

    // Supabase tự gia hạn token nền, nên đây chỉ là thông tin tham khảo.
    if (!expiresAt) return 'Đang hoạt động';
    const left = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
    return left > 0 ? `Phiên còn ${left} phút` : 'Đang gia hạn…';
};

const AdminShell = ({
    eyebrow,
    title,
    dark,
    back,
    actions,
    headerExtra,
    flush,
    children,
}) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user, handleLogout, expiresAt } = useAuth();
    const [moreOpen, setMoreOpen] = useState(false);
    const contentRef = useRef(null);

    useBodyClass('ad-on');
    useScrollReveal(contentRef, [pathname]);

    // mỗi lần đổi trang thì cuộn lên đầu để hiệu ứng vào trang nhìn đúng
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, [pathname]);

    const name = displayName(user);
    const go = (path) => {
        setMoreOpen(false);
        navigate(path);
    };

    return (
        <div className="ad ad-shell">
            <aside className="ad-side">
                <div className="ad-side__brand">
                    <BrandMark />
                    <span>BẰNG LĂNG HILL</span>
                </div>

                <nav className="ad-nav">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.path}
                            type="button"
                            className={`ad-nav__item${
                                pathname === item.path ? ' ad-nav__item--on' : ''
                            }`}
                            onClick={() => go(item.path)}
                        >
                            <span className="ad-nav__dot" />
                            <span className="ad-nav__label">{item.label}</span>
                            {item.badge && (
                                <span className="ad-nav__badge">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="ad-side__foot">
                    <SyncLine />
                    <div className="ad-user">
                        <span className="ad-avatar">{name.charAt(0)}</span>
                        <span className="ad-user__meta">
                            <span className="ad-user__name">{name}</span>
                            <span className="ad-user__sub">
                                <SessionLine expiresAt={expiresAt} />
                            </span>
                        </span>
                        <button
                            type="button"
                            className="ad-user__out"
                            onClick={handleLogout}
                        >
                            Thoát
                        </button>
                    </div>
                </div>
            </aside>

            <div className="ad-main">
                <div className="ad-top">
                    <div>
                        {eyebrow && <div className="ad-eyebrow">{eyebrow}</div>}
                        <h1 className="ad-top__h">{title}</h1>
                    </div>
                    {actions && <div className="ad-top__actions">{actions}</div>}
                </div>

                <header className={`ad-mhead${dark ? ' ad-mhead--dark' : ''}`}>
                    <div className="ad-mhead__row">
                        {back && (
                            <button
                                type="button"
                                className="ad-back"
                                aria-label="Quay lại"
                                onClick={() => navigate('/')}
                            >
                                ‹
                            </button>
                        )}
                        <div className="ad-mhead__titles">
                            {eyebrow && (
                                <div className="ad-eyebrow">{eyebrow}</div>
                            )}
                            <div className="ad-mhead__title">{title}</div>
                        </div>
                    </div>
                    {headerExtra}
                </header>

                <main
                    key={pathname}
                    ref={contentRef}
                    className={`ad-content${flush ? ' ad-content--flush' : ''}`}
                >
                    {children}
                </main>
            </div>

            <nav className="ad-tabbar">
                {TAB_ITEMS.map((tab) => (
                    <button
                        key={tab.path}
                        type="button"
                        className={`ad-tab${
                            pathname === tab.path ? ' ad-tab--on' : ''
                        }`}
                        onClick={() => go(tab.path)}
                    >
                        <span className="ad-tab__icon">{tab.icon}</span>
                        <span className="ad-tab__label">{tab.label}</span>
                    </button>
                ))}
                <button
                    type="button"
                    className={`ad-tab${moreOpen ? ' ad-tab--on' : ''}`}
                    onClick={() => setMoreOpen(true)}
                >
                    <span className="ad-tab__icon">⋯</span>
                    <span className="ad-tab__label">Thêm</span>
                </button>
            </nav>

            {moreOpen && (
                <BottomSheet title="Thêm" onClose={() => setMoreOpen(false)}>
                    <div className="ad-sheet__menu">
                        {MORE_ITEMS.map((item) => (
                            <button
                                key={item.path}
                                type="button"
                                onClick={() => go(item.path)}
                            >
                                <span className="ad-tab__icon">{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="ad-danger-text"
                            onClick={handleLogout}
                        >
                            <span className="ad-tab__icon">⏻</span>
                            Đăng xuất
                        </button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
};

export default AdminShell;
