import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useNavigate,
} from 'react-router-dom';
import { Modal, Button, Typography, message, Spin } from 'antd';
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

                // Check if user is already signed in
                const token = window.gapi.client.getToken();
                if (token) {
                    setIsSignedIn(true);
                    setAccessToken(token.access_token);
                } else {
                    setShowLoginModal(true);
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

    const handleLogin = async () => {
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
                    setAccessToken(response.access_token);
                    setIsSignedIn(true);
                    setShowLoginModal(false);
                    message.success('Đăng nhập thành công!');

                    // Set the access token for gapi requests
                    window.gapi.client.setToken({
                        access_token: response.access_token,
                    });

                    // Get user info if available
                    setUser({ email: 'user@gmail.com' }); // You can enhance this to get actual user info
                },
            });

            tokenClient.requestAccessToken();
        } catch (error) {
            console.error('Login failed:', error);
            message.error('Đăng nhập thất bại. Vui lòng thử lại.');
        }
    };

    const handleLogout = () => {
        if (accessToken) {
            window.google.accounts.oauth2.revoke(accessToken);
        }
        window.gapi.client.setToken(null);
        setAccessToken(null);
        setIsSignedIn(false);
        setUser(null);
        setShowLoginModal(true);
        message.success('Đăng xuất thành công');
    };

    const value = {
        isSignedIn,
        user,
        accessToken,
        apiInitialized,
        handleLogin,
        handleLogout,
        isLoading,
    };

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

const Home = () => {
    const navigate = useNavigate();
    const { isSignedIn, user, handleLogout, isLoading } = useAuth();

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
        <div className="home-container">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }}
            >
                <h2 className="home-heading">
                    🏠 Home - Select a Functionality
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button size="small" onClick={handleLogout}>
                        Đăng xuất
                    </Button>
                </div>
            </div>

            <div className="button-group">
                <button
                    className="nav-button"
                    onClick={() => navigate('/booking')}
                >
                    📘 Đặt phòng
                </button>
                <button
                    className="nav-button"
                    onClick={() => navigate('/availability')}
                >
                    📅 Kiểm tra phòng
                </button>
                <button
                    className="nav-button"
                    onClick={() => navigate('/date_checking')}
                >
                    📊 Kiểm tra phòng trống trong ngày
                </button>
                <button
                    className="nav-button"
                    onClick={() => navigate('/month-checking')}
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
        </div>
    );
};

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
