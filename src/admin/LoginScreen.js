import React from 'react';
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

const LoginScreen = ({ onLogin }) => {
    useBodyClass('ad-on');

    return (
        <div className="ad ad-login">
            <img className="ad-login__img" src={HERO_IMAGE} alt="" />
            <div className="ad-login__grade" />

            <div className="ad-login__body">
                <svg
                    className="ad-login__mark"
                    viewBox="0 0 28 28"
                    aria-hidden="true"
                >
                    <circle
                        cx="14"
                        cy="14"
                        r="13"
                        fill="rgba(242,238,227,.16)"
                    />
                    <path
                        d="M21.6 7.2c1.2 6.8-1.8 13.2-7.6 14.4-2 .4-3.8-.2-5-1.4 2.4-4.4 5.6-7.9 9.5-10.4-4.8 1.9-8.3 5.1-10.2 9.3-1.6-4.2.4-9.3 4.8-11.2 2.8-1.2 6-1.3 8.5-.7z"
                        fill="#F2EEE3"
                    />
                </svg>

                <div className="ad-eyebrow">TRANG QUẢN LÝ</div>
                <h1 className="ad-login__title">
                    BẰNG LĂNG
                    <br />
                    HILL
                </h1>
                <p className="ad-login__text">
                    Đăng nhập bằng Google để đọc và ghi dữ liệu đặt phòng trên
                    Google Sheets.
                </p>

                <button
                    type="button"
                    className="ad-login__google"
                    onClick={onLogin}
                >
                    <span className="ad-login__g">G</span>
                    Đăng nhập với Google
                </button>

                <a className="ad-login__alt" href="/rooms">
                    Xem trang phòng công khai
                </a>

                <div className="ad-login__foot">
                    <i />
                    Phiên đăng nhập tự hết hạn sau 1 giờ
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
