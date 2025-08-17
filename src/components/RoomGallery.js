import React, { useState } from 'react';
import {
    Card,
    Row,
    Col,
    Typography,
    Tag,
    Button,
    Modal,
    Carousel,
    List,
    Space,
    Divider,
    Badge,
    BackTop,
} from 'antd';
import {
    UserOutlined,
    ExpandOutlined,
    EnvironmentOutlined,
    HomeOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    PhoneOutlined,
    FacebookOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { ROOM_DATA, formatPrice, CONTACT_INFO } from '../constants/roomData';
import './RoomGallery.css';

const { Title, Text, Paragraph } = Typography;
const { Meta } = Card;

const RoomGallery = () => {
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const handleViewDetails = (room) => {
        setSelectedRoom(room);
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedRoom(null);
    };

    const getRoomTypeColor = (type) => {
        return type === 'bungalow' ? '#52c41a' : '#1890ff';
    };

    const getRoomTypeIcon = (type) => {
        return type === 'bungalow' ? <HomeOutlined /> : <EnvironmentOutlined />;
    };

    return (
        <div className="room-gallery">
            {/* Navigation Header */}
            {/* <div className="navigation-header">
                <div className="nav-content">
                    <Button
                        type="link"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => window.history.back()}
                        className="back-button"
                    >
                        Trở về
                    </Button>
                    <Title level={3} className="nav-title">
                        Homestay Gallery
                    </Title>
                </div>
            </div> */}

            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-content">
                    <Title level={1} className="hero-title">
                        Khám Phá Các Phòng Homestay
                    </Title>
                    <Paragraph className="hero-description">
                        Trải nghiệm không gian ấm cúng và thoải mái với 6 phòng
                        được thiết kế đặc biệt, mang đến cảm giác như ở nhà cho
                        kỳ nghỉ của bạn.
                    </Paragraph>
                </div>
            </div>

            {/* Room Cards Grid */}
            <div className="rooms-container">
                <Title level={1} className="section-title">
                    Lựa Chọn Phòng Của Chúng Tôi
                </Title>

                <Row gutter={[24, 24]}>
                    {ROOM_DATA.map((room) => (
                        <Col xs={24} sm={12} lg={8} key={room.id}>
                            <Badge.Ribbon
                                text={
                                    room.type === 'bungalow'
                                        ? 'Bungalow'
                                        : 'Standard Room'
                                }
                                color={getRoomTypeColor(room.type)}
                            >
                                <Card
                                    className="room-card"
                                    hoverable
                                    cover={
                                        <div className="card-image-container">
                                            <img
                                                alt={room.name}
                                                src={room.thumbnail}
                                                className="card-image"
                                            />
                                            <div className="image-overlay">
                                                <Button
                                                    type="primary"
                                                    icon={<EyeOutlined />}
                                                    onClick={() =>
                                                        handleViewDetails(room)
                                                    }
                                                    className="view-details-btn"
                                                >
                                                    Xem Chi Tiết
                                                </Button>
                                            </div>
                                        </div>
                                    }
                                    actions={[
                                        <Button
                                            type="link"
                                            icon={<ExpandOutlined />}
                                            onClick={() =>
                                                handleViewDetails(room)
                                            }
                                        >
                                            Chi Tiết
                                        </Button>,
                                    ]}
                                >
                                    <Meta
                                        title={
                                            <div className="card-title">
                                                {getRoomTypeIcon(room.type)}
                                                <span className="room-name">
                                                    {room.name}
                                                </span>
                                            </div>
                                        }
                                        description={
                                            <div className="card-content">
                                                <div className="room-info">
                                                    <Space
                                                        direction="vertical"
                                                        size="small"
                                                        style={{
                                                            width: '100%',
                                                        }}
                                                    >
                                                        <div className="room-stats">
                                                            <Space>
                                                                <Tag
                                                                    icon={
                                                                        <UserOutlined />
                                                                    }
                                                                    color="blue"
                                                                >
                                                                    {
                                                                        room.capacity
                                                                    }{' '}
                                                                    người
                                                                </Tag>
                                                                <Tag color="green">
                                                                    {room.size}
                                                                </Tag>
                                                            </Space>
                                                        </div>

                                                        <Paragraph
                                                            ellipsis={{
                                                                rows: 2,
                                                            }}
                                                            className="room-description"
                                                        >
                                                            {room.description}
                                                        </Paragraph>

                                                        <div className="room-features">
                                                            <Space wrap>
                                                                {room.features
                                                                    .slice(0, 3)
                                                                    .map(
                                                                        (
                                                                            feature,
                                                                            index
                                                                        ) => (
                                                                            <Tag
                                                                                key={
                                                                                    index
                                                                                }
                                                                                className="feature-tag"
                                                                            >
                                                                                {
                                                                                    feature
                                                                                }
                                                                            </Tag>
                                                                        )
                                                                    )}
                                                                {room.features
                                                                    .length >
                                                                    3 && (
                                                                    <Tag className="feature-tag">
                                                                        +
                                                                        {room
                                                                            .features
                                                                            .length -
                                                                            3}{' '}
                                                                        more
                                                                    </Tag>
                                                                )}
                                                            </Space>
                                                        </div>

                                                        <div className="pricing-section">
                                                            <div className="pricing-info">
                                                                <div className="price-row">
                                                                    <CalendarOutlined className="price-icon" />
                                                                    <span className="price-label">
                                                                        Ngày
                                                                        thường:
                                                                    </span>
                                                                    <span className="price-value">
                                                                        {formatPrice(
                                                                            room
                                                                                .pricing
                                                                                .weekday
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="price-row">
                                                                    <CalendarOutlined className="price-icon" />
                                                                    <span className="price-label">
                                                                        Cuối
                                                                        tuần:
                                                                    </span>
                                                                    <span className="price-value">
                                                                        {formatPrice(
                                                                            room
                                                                                .pricing
                                                                                .weekend
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="price-row">
                                                                    <CalendarOutlined className="price-icon" />
                                                                    <span className="price-label">
                                                                        Ngày lễ:
                                                                    </span>
                                                                    <span className="price-value">
                                                                        {formatPrice(
                                                                            room
                                                                                .pricing
                                                                                .holiday
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Space>
                                                </div>
                                            </div>
                                        }
                                    />
                                </Card>
                            </Badge.Ribbon>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* Room Details Modal */}
            <Modal
                title={null}
                open={modalVisible}
                onCancel={handleCloseModal}
                footer={null}
                width={800}
                className="room-modal"
            >
                {selectedRoom && (
                    <div className="modal-content">
                        {/* Room Images Carousel */}
                        <div className="modal-carousel">
                            <Carousel
                                autoplay
                                effect="fade"
                                arrows={true}
                                dots={true}
                                infinite={true}
                            >
                                {selectedRoom.images.map((image, index) => (
                                    <div key={index}>
                                        <img
                                            src={image}
                                            alt={`${selectedRoom.name} ${
                                                index + 1
                                            }`}
                                            className="modal-image"
                                        />
                                    </div>
                                ))}
                            </Carousel>
                        </div>

                        {/* Room Information */}
                        <div className="modal-info">
                            <div className="modal-header">
                                <Title level={1} className="modal-title">
                                    {getRoomTypeIcon(selectedRoom.type)}
                                    {selectedRoom.name}
                                </Title>
                                <Tag
                                    color={getRoomTypeColor(selectedRoom.type)}
                                    className="room-type-tag"
                                >
                                    {selectedRoom.type === 'bungalow'
                                        ? 'Bungalow'
                                        : 'Standard Room'}
                                </Tag>
                            </div>

                            <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <div className="info-item">
                                        <UserOutlined className="info-icon" />
                                        <span>
                                            Sức chứa: {selectedRoom.capacity}{' '}
                                            người
                                        </span>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="info-item">
                                        <ExpandOutlined className="info-icon" />
                                        <span>
                                            Diện tích: {selectedRoom.size}
                                        </span>
                                    </div>
                                </Col>
                            </Row>

                            <Divider />

                            <div className="modal-description">
                                <Title level={3}>Mô Tả</Title>
                                <Paragraph>
                                    {selectedRoom.description}
                                </Paragraph>
                            </div>

                            <div className="modal-features">
                                <Title level={3}>Đặc Điểm</Title>
                                <Space wrap>
                                    {selectedRoom.features.map(
                                        (feature, index) => (
                                            <Tag
                                                key={index}
                                                color="geekblue"
                                                className="feature-tag-large"
                                            >
                                                <CheckCircleOutlined />{' '}
                                                {feature}
                                            </Tag>
                                        )
                                    )}
                                </Space>
                            </div>

                            <div className="modal-amenities">
                                <Title level={3}>Tiện Nghi</Title>
                                <List
                                    grid={{
                                        gutter: 16,
                                        xs: 1,
                                        sm: 2,
                                        md: 2,
                                        lg: 2,
                                    }}
                                    dataSource={selectedRoom.amenities}
                                    renderItem={(amenity) => (
                                        <List.Item>
                                            <div className="amenity-item">
                                                <CheckCircleOutlined className="amenity-icon" />
                                                <span>{amenity}</span>
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            </div>

                            <Divider />

                            {/* Detailed Pricing */}
                            <div className="modal-pricing">
                                <Title level={3}>Bảng Giá</Title>
                                <div className="pricing-table">
                                    <div className="pricing-row">
                                        <CalendarOutlined className="pricing-icon" />
                                        <span className="pricing-label">
                                            Ngày thường (T2-T6):
                                        </span>
                                        <span className="pricing-value">
                                            {formatPrice(
                                                selectedRoom.pricing.weekday
                                            )}
                                        </span>
                                    </div>
                                    <div className="pricing-row">
                                        <CalendarOutlined className="pricing-icon" />
                                        <span className="pricing-label">
                                            Cuối tuần (T7-CN):
                                        </span>
                                        <span className="pricing-value">
                                            {formatPrice(
                                                selectedRoom.pricing.weekend
                                            )}
                                        </span>
                                    </div>
                                    <div className="pricing-row">
                                        <CalendarOutlined className="pricing-icon" />
                                        <span className="pricing-label">
                                            Ngày lễ:
                                        </span>
                                        <span className="pricing-value">
                                            {formatPrice(
                                                selectedRoom.pricing.holiday
                                            )}
                                        </span>
                                    </div>
                                    {/* <div className="pricing-row extra-fee">
                                        <UserOutlined className="pricing-icon" />
                                        <span className="pricing-label">
                                            Phụ thu mỗi người thêm nếu vượt quá
                                            sức chứa:
                                        </span>
                                        <span className="pricing-value">
                                            {formatPrice(
                                                selectedRoom.extraPersonFee
                                            )}
                                        </span>
                                    </div> */}
                                </div>
                            </div>

                            <Divider />

                            {/* Contact Information */}
                            <div className="contact-section">
                                <Title level={3}>Liên Hệ Đặt Phòng</Title>
                                <div className="contact-info">
                                    <div className="contact-item">
                                        <PhoneOutlined className="contact-icon" />
                                        <span>Điện thoại: </span>
                                        <a
                                            href={`tel:${CONTACT_INFO.phone}`}
                                            className="contact-link"
                                        >
                                            {CONTACT_INFO.phone} - Bảo
                                        </a>
                                    </div>
                                    <div className="contact-item">
                                        <FacebookOutlined className="contact-icon" />
                                        <span>Facebook: </span>
                                        <a
                                            href={CONTACT_INFO.facebook}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="contact-link"
                                        >
                                            Bằng Lăng Hill
                                        </a>
                                    </div>
                                </div>
                                <div className="contact-note">
                                    <Text type="secondary">
                                        Vui lòng liên hệ trực tiếp để đặt phòng
                                        và kiểm tra tình trạng phòng trống
                                    </Text>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <BackTop />
        </div>
    );
};

export default RoomGallery;
