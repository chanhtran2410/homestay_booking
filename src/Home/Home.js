import React, { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Card, Row, Col, Typography } from 'antd';
import {
    HomeOutlined,
    BookOutlined,
    CalendarOutlined,
    BarChartOutlined,
    DeleteOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../App';
import './Home.css';

const { Title, Paragraph } = Typography;

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

    if (isLoading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
                <div className="loading-text">Đang khởi tạo...</div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="loading-container">
                <div className="loading-text">
                    Vui lòng đăng nhập để tiếp tục...
                </div>
            </div>
        );
    }

    const menuItems = [
        {
            icon: <HomeOutlined />,
            title: 'Xem phòng homestay',
            description: 'Khám phá các phòng đẹp và tiện nghi',
            onClick: () => navigate('/rooms'),
            color: '#52c41a',
        },
        {
            icon: <BookOutlined />,
            title: 'Đặt phòng',
            description: 'Tạo đặt phòng mới cho khách hàng',
            onClick: handleNavigateToBooking,
            color: '#1890ff',
        },
        {
            icon: <CalendarOutlined />,
            title: 'Kiểm tra phòng',
            description: 'Xem tình trạng phòng theo ngày',
            onClick: handleNavigateToAvailability,
            color: '#722ed1',
        },
        {
            icon: <BarChartOutlined />,
            title: 'Kiểm tra phòng trống trong ngày',
            description: 'Thống kê phòng trống theo ngày cụ thể',
            onClick: handleNavigateToDateChecking,
            color: '#fa8c16',
        },
        {
            icon: <BarChartOutlined />,
            title: 'Kiểm tra phòng trống trong tháng',
            description: 'Thống kê phòng trống theo tháng',
            onClick: handleNavigateToMonthChecking,
            color: '#eb2f96',
        },
        {
            icon: <DeleteOutlined />,
            title: 'Xóa đặt phòng',
            description: 'Hủy hoặc xóa đặt phòng hiện có',
            onClick: () => navigate('/remove-booking'),
            color: '#f5222d',
        },
    ];

    return (
        <div className="home-page">
            {/* Hero Section */}
            {/* <div className="home-hero-section">
                <div className="home-hero-content">
                    <Title level={1} className="home-hero-title">
                        Quản Lý Homestay
                    </Title>
                    <Paragraph className="home-hero-description">
                        Hệ thống quản lý đặt phòng và kiểm tra tình trạng phòng
                        trống chuyên nghiệp
                    </Paragraph>
                </div>
            </div> */}

            {/* Menu Cards */}
            <div className="home-container">
                <Title level={2} className="home-section-title">
                    Chức Năng Quản Lý
                </Title>

                <Row gutter={[24, 24]}>
                    {menuItems.map((item, index) => (
                        <Col xs={24} sm={12} lg={8} key={index}>
                            <Card
                                className="home-menu-card"
                                hoverable
                                onClick={item.onClick}
                                style={{
                                    borderTop: `4px solid ${item.color}`,
                                }}
                            >
                                <div className="menu-card-content">
                                    <div
                                        className="menu-icon"
                                        style={{ color: item.color }}
                                    >
                                        {item.icon}
                                    </div>
                                    <Title level={4} className="menu-title">
                                        {item.title}
                                    </Title>
                                    <Paragraph className="menu-description">
                                        {item.description}
                                    </Paragraph>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Logout Button */}
                <div className="home-logout-container">
                    <Button
                        type="primary"
                        size="large"
                        icon={<LogoutOutlined />}
                        onClick={handleLogout}
                        className="home-logout-button"
                    >
                        Đăng xuất
                    </Button>
                </div>
            </div>
        </div>
    );
});

export default Home;
