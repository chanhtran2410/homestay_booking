import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, message } from 'antd';
import Booking from './components/Booking';
import './App.css'; // import the stylesheet
import RoomAvailability from './components/RoomAvailability';
import DateRoomChecker from './components/DateRoomChecker';
import RemoveBooking from './components/RemoveBooking';
import MonthChecker from './components/MonthChecker';
import Reports from './components/Reports';
import RoomGallery from './components/RoomGallery';
import Home from './Home/Home';
import LoginScreen, { AdminSplash } from './admin/LoginScreen';
import { ADMIN_THEME } from './admin/theme';
import { supabase, isConfigured } from './lib/supabaseClient';
import { getMe, setUnauthorizedHandler } from './admin/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * Quản lý phiên đăng nhập bằng Supabase Auth.
 *
 * So với bản cũ (Google OAuth trực tiếp từ trình duyệt để ghi Google Sheets):
 *   - Không còn gapi/GIS, không còn access token của Google trong localStorage.
 *   - supabase-js tự lưu phiên và tự gia hạn, nên bỏ hẳn đoạn tự đếm hạn 1 giờ
 *     viết tay — nó luôn bị lệch và đá người dùng ra giữa chừng.
 *   - Đăng nhập được KHÔNG đồng nghĩa với có quyền: /api/me kiểm tra tiếp
 *     bảng admin_users. Đây là chỗ vá lỗ hổng "ai cũng thành admin".
 */
const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [admin, setAdmin] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deniedReason, setDeniedReason] = useState(null);

    // Xác minh quyền quản trị với máy chủ.
    const verify = useCallback(async () => {
        try {
            const me = await getMe();
            setAdmin(me);
            setDeniedReason(null);
        } catch (error) {
            setAdmin(null);
            if (error.status === 403) {
                setDeniedReason(error.message);
            } else if (error.status !== 401) {
                message.error(error.message || 'Không xác minh được tài khoản.');
            }
        }
    }, []);

    useEffect(() => {
        if (!isConfigured) {
            setIsLoading(false);
            return undefined;
        }

        let alive = true;

        supabase.auth.getSession().then(async ({ data }) => {
            if (!alive) return;
            setSession(data.session);
            if (data.session) await verify();
            if (alive) setIsLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange(
            async (event, next) => {
                if (!alive) return;
                setSession(next);
                if (next) {
                    await verify();
                } else {
                    setAdmin(null);
                    setDeniedReason(null);
                }
            }
        );

        return () => {
            alive = false;
            sub?.subscription?.unsubscribe();
        };
    }, [verify]);

    const handleLogout = useCallback(async () => {
        await supabase?.auth.signOut();
        setAdmin(null);
        setDeniedReason(null);
        message.success('Đã đăng xuất');
    }, []);

    // Token hết hạn giữa chừng -> đăng xuất, quay về màn hình đăng nhập.
    useEffect(() => {
        setUnauthorizedHandler(() => {
            supabase?.auth.signOut();
            setAdmin(null);
        });
        return () => setUnauthorizedHandler(null);
    }, []);

    const loginWithGoogle = useCallback(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/` },
        });
        if (error) message.error(error.message);
    }, []);

    const loginWithPassword = useCallback(async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (error) {
            message.error(
                error.message === 'Invalid login credentials'
                    ? 'Email hoặc mật khẩu không đúng.'
                    : error.message
            );
            return false;
        }
        return true;
    }, []);

    const isSignedIn = Boolean(session && admin);

    const value = useMemo(
        () => ({
            isSignedIn,
            user: admin,
            session,
            isLoading,
            loginTime: session?.expires_at
                ? session.expires_at * 1000 - 60 * 60 * 1000
                : null,
            expiresAt: session?.expires_at ? session.expires_at * 1000 : null,
            handleLogout,
            loginWithGoogle,
            loginWithPassword,
        }),
        [
            isSignedIn,
            admin,
            session,
            isLoading,
            handleLogout,
            loginWithGoogle,
            loginWithPassword,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {isLoading ? (
                <AdminSplash />
            ) : isSignedIn ? (
                children
            ) : (
                <LoginScreen
                    onGoogle={loginWithGoogle}
                    onPassword={loginWithPassword}
                    onSignOut={handleLogout}
                    deniedReason={deniedReason}
                    configured={isConfigured}
                />
            )}
        </AuthContext.Provider>
    );
};

const App = () => {
    return (
        <ConfigProvider theme={ADMIN_THEME}>
            <Router>
                <Routes>
                    {/* Công khai — không cần đăng nhập */}
                    <Route path="/rooms" element={<RoomGallery />} />

                    {/* Cần quyền quản trị */}
                    <Route
                        path="/*"
                        element={
                            <AuthProvider>
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route
                                        path="/booking"
                                        element={<Booking />}
                                    />
                                    <Route
                                        path="/availability"
                                        element={<RoomAvailability />}
                                    />
                                    <Route
                                        path="/date_checking"
                                        element={<DateRoomChecker />}
                                    />
                                    <Route
                                        path="/month-checking"
                                        element={<MonthChecker />}
                                    />
                                    <Route
                                        path="/remove-booking"
                                        element={<RemoveBooking />}
                                    />
                                    <Route
                                        path="/reports"
                                        element={<Reports />}
                                    />
                                </Routes>
                            </AuthProvider>
                        }
                    />
                </Routes>
            </Router>
        </ConfigProvider>
    );
};

export default App;
