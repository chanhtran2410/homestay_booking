import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
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
    const [loginTime, setLoginTime] = useState(null);
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
                    setLoginTime(storedAuth.loginTime);
                    setIsSignedIn(true);
                    console.log('Authentication restored from localStorage');
                } else {
                    // Check if user is already signed in via gapi
                    const token = window.gapi.client.getToken();
                    if (token) {
                        setIsSignedIn(true);
                        setAccessToken(token.access_token);
                        setLoginTime(Date.now());
                    }
                }

                console.log('Google services initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Google services:', error);
                message.error('Failed to initialize Google services');
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
                    setLoginTime(Date.now());
                    setIsSignedIn(true);
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
        setLoginTime(null);
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
        setLoginTime(null);

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
            loginTime,
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
            loginTime,
            makeApiCall,
            handleTokenExpiration,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {isLoading ? (
                <AdminSplash />
            ) : isSignedIn ? (
                children
            ) : (
                <LoginScreen onLogin={handleLogin} />
            )}
        </AuthContext.Provider>
    );
};

const App = () => {
    return (
        <ConfigProvider theme={ADMIN_THEME}>
            <Router>
                <Routes>
                    {/* Public routes - no authentication required */}
                    <Route path="/rooms" element={<RoomGallery />} />

                    {/* Protected routes - authentication required */}
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
