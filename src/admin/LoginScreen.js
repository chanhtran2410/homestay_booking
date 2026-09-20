import React, { useEffect, useState } from 'react';
import { HERO_IMAGE } from '../constants/landingContent';
import { useBodyClass } from './ui';
import './admin.css';

export const AdminSplash = ({ label = 'ĐANG KHỞI TẠO…' }) => {
    useBodyClass('ad-on');
    return (
        <div className="ad ad-splash">
            <i />
            <span>{label}</span>
        </div>
    );
};

// Supabase trả lỗi OAuth về qua URL — có khi ở hash, có khi ở query.
const readOAuthError = () => {
    const grab = (text) => new URLSearchParams(text.replace(/^[#?]/, ''));
    const hash = grab(window.location.hash || '');
    const query = grab(window.location.search || '');
    const code = hash.get('error') || query.get('error');
    const description =
        hash.get('error_description') || query.get('error_description');
    if (!code && !description) return null;

    // Trigger enforce_admin_allowlist chặn ở tầng CSDL nên Postgres chỉ trả về
    // câu chung chung này. Dịch sang thứ người dùng hiểu được.
    if (/Database error saving new user/i.test(description || '')) {
        return 'Tài khoản Google này chưa được cấp quyền vào trang quản lý.';
    }
    if (code === 'access_denied') {
        return 'Bạn đã huỷ đăng nhập bằng Google.';
    }
    return description || `Đăng nhập thất bại (${code}).`;
};

const BrandMark = () => (
    <svg className="ad-login__mark" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="13" fill="rgba(242,238,227,.16)" />
        <path
            d="M21.6 7.2c1.2 6.8-1.8 13.2-7.6 14.4-2 .4-3.8-.2-5-1.4 2.4-4.4 5.6-7.9 9.5-10.4-4.8 1.9-8.3 5.1-10.2 9.3-1.6-4.2.4-9.3 4.8-11.2 2.8-1.2 6-1.3 8.5-.7z"
            fill="#F2EEE3"
        />
    </svg>
);

const LoginScreen = ({
    onGoogle,
    onPassword,
    onSignOut,
    deniedReason,
    configured = true,
}) => {
    useBodyClass('ad-on');

    const [mode, setMode] = useState('google');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [oauthError, setOauthError] = useState(null);

    useEffect(() => {
        const problem = readOAuthError();
        if (!problem) return;
        setOauthError(problem);
        // Dọn URL để tải lại trang không hiện lại lỗi cũ.
        window.history.replaceState({}, '', window.location.pathname);
    }, []);

    const submit = async (event) => {
        event.preventDefault();
        if (!email.trim() || !password) return;
        setBusy(true);
        try {
            await onPassword(email, password);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="ad ad-login">
            <img className="ad-login__img" src={HERO_IMAGE} alt="" />
            <div className="ad-login__grade" />

            <div className="ad-login__body">
                <BrandMark />

                <div className="ad-eyebrow">TRANG QUẢN LÝ</div>
                <h1 className="ad-login__title">
                    BẰNG LĂNG
                    <br />
                    HILL
                </h1>

                {!configured ? (
                    <div className="ad-login__alert">
                        <b>Chưa cấu hình kết nối.</b>
                        <br />
                        Thiếu <code>REACT_APP_SUPABASE_URL</code> hoặc{' '}
                        <code>REACT_APP_SUPABASE_PUBLISHABLE_KEY</code>. Sao chép{' '}
                        <code>.env.example</code> thành <code>.env.local</code>{' '}
                        rồi khởi động lại.
                    </div>
                ) : deniedReason || oauthError ? (
                    <>
                        <div className="ad-login__alert">
                            <b>Không vào được trang quản lý.</b>
                            <br />
                            {deniedReason || oauthError} Liên hệ chủ nhà để được
                            thêm vào danh sách quản trị.
                        </div>
                        <button
                            type="button"
                            className="ad-login__alt"
                            onClick={() => {
                                setOauthError(null);
                                if (deniedReason) onSignOut();
                            }}
                        >
                            Thử tài khoản khác
                        </button>
                    </>
                ) : (
                    <>
                        <p className="ad-login__text">
                            Đăng nhập để xem và cập nhật dữ liệu đặt phòng.
                        </p>

                        {mode === 'google' ? (
                            <>
                                <button
                                    type="button"
                                    className="ad-login__google"
                                    onClick={onGoogle}
                                >
                                    <span className="ad-login__g">G</span>
                                    Đăng nhập với Google
                                </button>
                                <button
                                    type="button"
                                    className="ad-login__alt"
                                    onClick={() => setMode('password')}
                                >
                                    Dùng email và mật khẩu
                                </button>
                            </>
                        ) : (
                            <>
                                <form className="ad-login__form" onSubmit={submit}>
                                    <label className="ad-login__label">
                                        Email
                                        <input
                                            className="ad-login__input"
                                            type="email"
                                            autoComplete="username"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            placeholder="ban@example.com"
                                        />
                                    </label>
                                    <label className="ad-login__label">
                                        Mật khẩu
                                        <input
                                            className="ad-login__input"
                                            type="password"
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }
                                            placeholder="••••••••"
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        className="ad-login__google"
                                        disabled={busy}
                                    >
                                        {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
                                    </button>
                                </form>
                                <button
                                    type="button"
                                    className="ad-login__alt"
                                    onClick={() => setMode('google')}
                                >
                                    Quay lại đăng nhập với Google
                                </button>
                            </>
                        )}
                    </>
                )}

                <div className="ad-login__foot">
                    <i />
                    Chỉ tài khoản trong danh sách quản trị mới vào được
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
