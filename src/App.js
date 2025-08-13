import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    memo,
    useMemo,
    useCallback,
} from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useNavigate,
} from 'react-router-dom';
import { Modal, Button, Typography, message, Spin, Flex } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import Booking from './components/Booking';
import './App.css'; // import the stylesheet
import RoomAvailability from './components/RoomAvailability';
import DateRoomChecker from './components/DateRoomChecker';
import RemoveBooking from './components/RemoveBooking';
import MonthChecker from './components/MonthChecker';

const { Title, Text } = Typography;

const CLIENT_ID =
    process.env.REACT_APP_GOOGLE_CLIENT_ID ||
    '311093634768-ps25fkb4hmm3d6bq86rdhh8cdi9hbd5o.apps.googleusercontent.com';
const API_KEY =
    process.env.REACT_APP_GOOGLE_API_KEY ||
    'AIzaSyDO1vCsfDoJRAPt4pQ6BnRjtxjf_fnG7zQ';
const DISCOVERY_DOCS = [
    'https://sheets.googleapis.com/$discovery/rest?version=v4',
];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// Create Authentication Context
const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Helper functions for localStorage (outside component to avoid dependency issues)
const saveAuthToStorage = (token, userInfo) => {
    try {
        localStorage.setItem('homestay_access_token', token);
        localStorage.setItem('homestay_user', JSON.stringify(userInfo));
        localStorage.setItem('homestay_login_time', Date.now().toString());
    } catch (error) {
        console.error('Failed to save auth to localStorage:', error);
    }
};

const getAuthFromStorage = () => {
    try {
        const token = localStorage.getItem('homestay_access_token');
        const userStr = localStorage.getItem('homestay_user');
        const loginTime = localStorage.getItem('homestay_login_time');

        if (!token || !userStr || !loginTime) {
            return null;
        }

        // Check if token is older than 1 hour (3600000 ms)
        const tokenAge = Date.now() - parseInt(loginTime);
        const MAX_TOKEN_AGE = 60 * 60 * 1000; // 1 hour

        if (tokenAge > MAX_TOKEN_AGE) {
            clearAuthFromStorage();
            return null;
        }

        return {
            token,
            user: JSON.parse(userStr),
            loginTime: parseInt(loginTime),
        };
    } catch (error) {
        console.error('Failed to get auth from localStorage:', error);
        clearAuthFromStorage();
        return null;
    }
};

const clearAuthFromStorage = () => {
    try {
        localStorage.removeItem('homestay_access_token');
        localStorage.removeItem('homestay_user');
        localStorage.removeItem('homestay_login_time');
    } catch (error) {
        console.error('Failed to clear auth from localStorage:', error);
    }
};

// Authentication Provider Component
const AuthProvider = ({ children }) => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [apiInitialized, setApiInitialized] = useState(false);

    // Initialize Google Services
    useEffect(() => {
        const initializeGoogleServices = async () => {
            try {
                // Check for stored authentication first
                const storedAuth = getAuthFromStorage();

                // Wait for both gapi and google to be available
                await new Promise((resolve) => {
                    const checkLibraries = () => {
                        if (window.gapi && window.google) {
                            resolve();
                        } else {
                            setTimeout(checkLibraries, 100);
                        }
                    };
                    checkLibraries();
                });

                // Initialize GAPI client
                await new Promise((resolve, reject) => {
                    window.gapi.load('client', async () => {
                        try {
                            await window.gapi.client.init({
                                apiKey: API_KEY,
                                discoveryDocs: DISCOVERY_DOCS,
                            });
                            setApiInitialized(true);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                // Restore authentication if available
                if (storedAuth) {
                    // Set the access token for gapi requests
                    window.gapi.client.setToken({
                        access_token: storedAuth.token,
                    });

                    setAccessToken(storedAuth.token);
                    setUser(storedAuth.user);
                    setIsSignedIn(true);
                    setShowLoginModal(false);
                    console.log('Authentication restored from localStorage');
                } else {
                    // Check if user is already signed in via gapi
                    const token = window.gapi.client.getToken();
                    if (token) {
                        setIsSignedIn(true);
                        setAccessToken(token.access_token);
                        setShowLoginModal(false);
                    } else {
                        setShowLoginModal(true);
                    }
                }

                console.log('Google services initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Google services:', error);
                message.error('Failed to initialize Google services');
                setShowLoginModal(true);
            } finally {
                setIsLoading(false);
            }
        };

        initializeGoogleServices();
    }, []);

    const handleLogin = useCallback(async () => {
        try {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('OAuth error:', response.error);
                        message.error(`Login failed: ${response.error}`);
                        return;
                    }

                    console.log(
                        'Access token received:',
                        response.access_token
                    );

                    const userInfo = { email: 'user@gmail.com' }; // You can enhance this to get actual user info

                    // Save to localStorage
                    saveAuthToStorage(response.access_token, userInfo);

                    // Update state
                    setAccessToken(response.access_token);
                    setUser(userInfo);
                    setIsSignedIn(true);
                    setShowLoginModal(false);
                    message.success('Đăng nhập thành công!');

                    // Set the access token for gapi requests
                    window.gapi.client.setToken({
                        access_token: response.access_token,
                    });
                },
            });

            tokenClient.requestAccessToken();
        } catch (error) {
            console.error('Login failed:', error);
            message.error('Đăng nhập thất bại. Vui lòng thử lại.');
        }
    }, []);

    const handleLogout = useCallback(() => {
        if (accessToken) {
            window.google.accounts.oauth2.revoke(accessToken);
        }
        window.gapi.client.setToken(null);

        // Clear localStorage
        clearAuthFromStorage();

        // Clear state
        setAccessToken(null);
        setIsSignedIn(false);
        setUser(null);
        setShowLoginModal(true);
        message.success('Đăng xuất thành công');
    }, [accessToken]);

    // Function to handle token expiration and force re-login
    const handleTokenExpiration = useCallback(() => {
        console.warn('Token expired or invalid, forcing re-login');

        // Clear stored authentication
        clearAuthFromStorage();
        window.gapi.client.setToken(null);

        // Clear state
        setAccessToken(null);
        setIsSignedIn(false);
        setUser(null);
        setShowLoginModal(true);

        message.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }, []);

    // Centralized API call wrapper with token expiration handling
    const makeApiCall = useCallback(
        async (apiCallFunction) => {
            if (!apiInitialized || !isSignedIn || !accessToken) {
                throw new Error('Not authenticated or API not initialized');
            }

            try {
                return await apiCallFunction();
            } catch (error) {
                console.error('API call error:', error);

                // Check for various token expiration indicators
                const isTokenExpired =
                    error.status === 401 ||
                    error.status === 403 ||
                    (error.result &&
                        error.result.error &&
                        (error.result.error.code === 401 ||
                            error.result.error.code === 403 ||
                            error.result.error.message?.includes(
                                'Invalid Credentials'
                            ) ||
                            error.result.error.message?.includes(
                                'Request had invalid credentials'
                            ) ||
                            error.result.error.message?.includes(
                                'invalid_token'
                            ) ||
                            error.result.error.message?.includes(
                                'token_expired'
                            ))) ||
                    (error.message &&
                        (error.message.includes('Invalid Credentials') ||
                            error.message.includes(
                                'Request had invalid credentials'
                            ) ||
                            error.message.includes('invalid_token') ||
                            error.message.includes('token_expired'))) ||
                    (typeof error === 'string' &&
                        (error.includes('Invalid Credentials') ||
                            error.includes('Request had invalid credentials') ||
                            error.includes('invalid_token') ||
                            error.includes('token_expired')));

                if (isTokenExpired) {
                    handleTokenExpiration();
                    throw new Error(
                        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                    );
                }

                // Re-throw the original error if it's not related to token expiration
                throw error;
            }
        },
        [apiInitialized, isSignedIn, accessToken, handleTokenExpiration]
    );

    const value = useMemo(
        () => ({
            isSignedIn,
            user,
            accessToken,
            apiInitialized,
            handleLogin,
            handleLogout,
            isLoading,
            makeApiCall,
            handleTokenExpiration,
        }),
        [
            isSignedIn,
            user,
            accessToken,
            apiInitialized,
            handleLogin,
            handleLogout,
            isLoading,
            makeApiCall,
            handleTokenExpiration,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}

            {/* Global Login Modal */}
            <Modal
                title={
                    <div style={{ textAlign: 'center' }}>
                        <GoogleOutlined
                            style={{
                                fontSize: 24,
                                color: '#4285f4',
                                marginRight: 8,
                            }}
                        />
                        <Title
                            level={4}
                            style={{ margin: 0, display: 'inline' }}
                        >
                            Đăng nhập để tiếp tục
                        </Title>
                    </div>
                }
                open={showLoginModal}
                onCancel={null}
                footer={null}
                closable={false}
                centered
                width={400}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text
                        style={{
                            fontSize: 16,
                            color: '#666',
                            display: 'block',
                            marginBottom: 24,
                        }}
                    >
                        Bạn cần đăng nhập Google để sử dụng ứng dụng quản lý
                        homestay
                    </Text>

                    <Button
                        type="primary"
                        size="large"
                        icon={<GoogleOutlined />}
                        onClick={handleLogin}
                        style={{
                            backgroundColor: '#4285f4',
                            borderColor: '#4285f4',
                            height: 48,
                            fontSize: 16,
                            paddingLeft: 24,
                            paddingRight: 24,
                        }}
                    >
                        Đăng nhập với Google
                    </Button>

                    <div style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
                        Ứng dụng cần quyền truy cập Google Sheets để quản lý dữ
                        liệu đặt phòng
                    </div>
                </div>
            </Modal>
        </AuthContext.Provider>
    );
};

const Home = memo(() => {
    const navigate = useNavigate();
    const { isSignedIn, handleLogout, isLoading } = useAuth();

    const handleNavigateToBooking = useCallback(
        () => navigate('/booking'),
        [navigate]
    );
    const handleNavigateToAvailability = useCallback(
        () => navigate('/availability'),
        [navigate]
    );
    const handleNavigateToDateChecking = useCallback(
        () => navigate('/date_checking'),
        [navigate]
    );
    const handleNavigateToMonthChecking = useCallback(
        () => navigate('/month-checking'),
        [navigate]
    );
    // const handleNavigateToRemoveBooking = useCallback(
    //     () => navigate('/remove-booking'),
    //     [navigate]
    // );

    if (isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                }}
            >
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Đang khởi tạo...</div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                }}
            >
                <div>Vui lòng đăng nhập để tiếp tục...</div>
            </div>
        );
    }

    return (
        <Flex
            vertical
            gap={40}
            align="center"
            className="home-container content-container"
        >
            <h2 className="home-heading">Quản lý Homestay</h2>

            <div className="button-group">
                <button
                    className="nav-button"
                    onClick={handleNavigateToBooking}
                >
                    📘 Đặt phòng
                </button>
                <button
                    className="nav-button"
                    onClick={handleNavigateToAvailability}
                >
                    📅 Kiểm tra phòng
                </button>
                <button
                    className="nav-button"
                    onClick={handleNavigateToDateChecking}
                >
                    📊 Kiểm tra phòng trống trong ngày
                </button>
                <button
                    className="nav-button"
                    onClick={handleNavigateToMonthChecking}
                >
                    📊 Kiểm tra phòng trống trong tháng
                </button>
                <button
                    className="nav-button"
                    onClick={() => navigate('/remove-booking')}
                >
                    ⚙️ Xóa đặt phòng
                </button>
            </div>
            <Button size="big" onClick={handleLogout}>
                Đăng xuất
            </Button>
        </Flex>
    );
});

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/booking" element={<Booking />} />
                    <Route
                        path="/availability"
                        element={<RoomAvailability />}
                    />
                    <Route
                        path="/date_checking"
                        element={<DateRoomChecker />}
                    />
                    <Route path="/month-checking" element={<MonthChecker />} />
                    <Route path="/remove-booking" element={<RemoveBooking />} />
                    <Route
                        path="/reports"
                        element={<Placeholder title="Reports" />}
                    />
                    <Route
                        path="/settings"
                        element={<Placeholder title="Settings" />}
                    />
                    <Route
                        path="/about"
                        element={<Placeholder title="About" />}
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

// Temporary placeholder component
const Placeholder = ({ title }) => (
    <div className="placeholder-page">
        <h2>{title} Page</h2>
        <p>Coming soon...</p>
    </div>
);

export default App;
