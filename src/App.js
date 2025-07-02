import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useNavigate,
} from 'react-router-dom';
import Booking from './components/Booking';
import './App.css'; // import the stylesheet

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <h2 className="home-heading">🏠 Home - Select a Functionality</h2>
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
                    onClick={() => navigate('/reports')}
                >
                    📊 Kiểm tra phòng trống trong ngày
                </button>
                <button
                    className="nav-button"
                    onClick={() => navigate('/settings')}
                >
                    ⚙️ Xóa đặt phòng
                </button>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/booking" element={<Booking />} />
                <Route
                    path="/availability"
                    element={<Placeholder title="Availability" />}
                />
                <Route
                    path="/reports"
                    element={<Placeholder title="Reports" />}
                />
                <Route
                    path="/settings"
                    element={<Placeholder title="Settings" />}
                />
                <Route path="/about" element={<Placeholder title="About" />} />
            </Routes>
        </Router>
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
