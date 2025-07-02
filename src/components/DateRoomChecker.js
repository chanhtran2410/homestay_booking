import { useState } from 'react';
import {
    Form,
    Button,
    Typography,
    DatePicker,
    Card,
    Tag,
    message,
    List,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { useAuth } from '../App';
import './styles.css';

const { Title, Text } = Typography;

const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const roomOptions = [
    { value: '1001', label: '1001 - Bungalow Lớn', type: 'bungalow' },
    { value: '1002', label: '1002 - Bungalow Nhỏ 1', type: 'bungalow' },
    { value: '1003', label: '1003 - Bungalow Nhỏ 2', type: 'bungalow' },
    { value: '1004', label: '1004 - Phòng Nhỏ', type: 'room' },
    { value: '1005', label: '1005 - Phòng Lớn 1', type: 'room' },
    { value: '1006', label: '1006 - Phòng Lớn 2', type: 'room' },
];

const DateRoomChecker = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [roomStatuses, setRoomStatuses] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const { isSignedIn } = useAuth();

    const checkRoomsForDate = async ({ date }) => {
        // Try multiple date formats to match the spreadsheet headers
        const possibleFormats = [
            date.format('DD/MM/YYYY'), // 01/05/2025
            date.format('D/M/YYYY'), // 1/5/2025
            date.format('DD/MM'), // 01/05
            date.format('D/M'), // 1/5
            date.format('MM/DD/YYYY'), // 05/01/2025
            date.format('M/D/YYYY'), // 5/1/2025
            date.format('YYYY-MM-DD'), // 2025-01-05
        ];

        setLoading(true);
        setSelectedDate(date.format('DD/MM/YYYY'));
        setRoomStatuses([]);

        try {
            if (!isSignedIn) {
                message.error('Vui lòng đăng nhập trước');
                return;
            }

            const readRes =
                await window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}`,
                });

            const data = readRes.result.values;

            if (!data || data.length === 0) {
                message.error('Không có dữ liệu trong bảng tính');
                return;
            }

            const headers = data[0];
            console.log('Available headers:', headers);
            console.log('Trying date formats:', possibleFormats);

            // Try to find the date in any of the possible formats
            let dateIndex = -1;
            let matchedFormat = '';

            for (const format of possibleFormats) {
                dateIndex = headers.indexOf(format);
                if (dateIndex !== -1) {
                    matchedFormat = format;
                    break;
                }
            }

            if (dateIndex === -1) {
                message.error(
                    `Không tìm thấy ngày trong bảng tính. Đã thử các định dạng: ${possibleFormats.join(
                        ', '
                    )}. Các cột có sẵn: ${headers.slice(2).join(', ')}`
                );
                return;
            }

            console.log(
                'Found date format:',
                matchedFormat,
                'at index:',
                dateIndex
            );

            // Check each room's status for this date
            const roomStatusList = roomOptions.map((room) => {
                const roomRowIndex = data.findIndex(
                    (row) => row && row[1] === room.value
                );

                if (roomRowIndex === -1) {
                    return {
                        ...room,
                        status: 'unknown',
                        value: 'Không tìm thấy phòng trong bảng tính',
                        available: false,
                    };
                }

                const cellValue = data?.[roomRowIndex]?.[dateIndex] || '';
                const isAvailable =
                    cellValue.trim() === '' ||
                    cellValue === undefined ||
                    cellValue === null;

                return {
                    ...room,
                    status: isAvailable ? 'available' : 'occupied',
                    value: isAvailable ? '' : cellValue,
                    available: isAvailable,
                };
            });

            setRoomStatuses(roomStatusList);

            const availableCount = roomStatusList.filter(
                (room) => room.available
            ).length;
            const occupiedCount = roomStatusList.filter(
                (room) => !room.available && room.status !== 'unknown'
            ).length;

            message.success(
                `Đã kiểm tra ${roomStatusList.length} phòng: ${availableCount} trống, ${occupiedCount} đã đặt`
            );
        } catch (error) {
            console.error('Error checking rooms:', error);
            message.error('Lỗi khi kiểm tra phòng. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'available':
                return 'success';
            case 'occupied':
                return 'error';
            case 'unknown':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'available':
                return <CheckCircleOutlined />;
            case 'occupied':
                return <CloseCircleOutlined />;
            default:
                return <CalendarOutlined />;
        }
    };

    const getStatusText = (room) => {
        if (room.status === 'available') {
            return 'Phòng trống';
        } else if (room.status === 'occupied') {
            return `Đã đặt: ${room.value}`;
        } else {
            return room.value;
        }
    };

    const availableRooms = roomStatuses.filter((room) => room.available);
    const occupiedRooms = roomStatuses.filter((room) => !room.available);

    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
            <Title level={3}>📅 Kiểm tra phòng trống trong ngày</Title>

            {!isSignedIn && (
                <Card style={{ marginBottom: 16, textAlign: 'center' }}>
                    <Text type="warning">
                        Vui lòng đăng nhập để sử dụng chức năng này
                    </Text>
                </Card>
            )}

            <Card style={{ marginBottom: 24 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={checkRoomsForDate}
                >
                    <Form.Item
                        name="date"
                        label="Chọn ngày kiểm tra"
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày' },
                        ]}
                    >
                        <DatePicker
                            format="DD/MM/YYYY"
                            placeholder="Chọn ngày"
                            size="large"
                            style={{ width: '100%' }}
                            disabled={!isSignedIn}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            loading={loading}
                            disabled={!isSignedIn}
                            icon={<CalendarOutlined />}
                        >
                            {loading
                                ? 'Đang kiểm tra...'
                                : 'Kiểm tra tất cả phòng'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {roomStatuses.length > 0 && (
                <>
                    <div
                        style={{
                            marginBottom: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Title level={4} style={{ margin: 0 }}>
                            Kết quả cho ngày: {selectedDate}
                        </Title>
                        <div>
                            <Tag color="success" style={{ marginRight: 8 }}>
                                {availableRooms.length} phòng trống
                            </Tag>
                            <Tag color="error">
                                {occupiedRooms.length} phòng đã đặt
                            </Tag>
                        </div>
                    </div>

                    {/* Available Rooms */}
                    {availableRooms.length > 0 && (
                        <Card
                            title={
                                <span style={{ color: '#52c41a' }}>
                                    <CheckCircleOutlined
                                        style={{ marginRight: 8 }}
                                    />
                                    Phòng trống ({availableRooms.length})
                                </span>
                            }
                            style={{ marginBottom: 16 }}
                        >
                            <List
                                dataSource={availableRooms}
                                renderItem={(room) => (
                                    <List.Item
                                        style={{
                                            border: 'none',
                                            padding: '8px 0',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <Text
                                                    strong
                                                    style={{ fontSize: 16 }}
                                                >
                                                    {room.label}
                                                </Text>
                                                <br />
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 14 }}
                                                >
                                                    {room.type === 'bungalow'
                                                        ? 'Bungalow'
                                                        : 'Phòng thường'}
                                                </Text>
                                            </div>
                                            <Tag
                                                color={getStatusColor(
                                                    room.status
                                                )}
                                                icon={getStatusIcon(
                                                    room.status
                                                )}
                                                style={{
                                                    fontSize: 14,
                                                    padding: '4px 12px',
                                                }}
                                            >
                                                {getStatusText(room)}
                                            </Tag>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    )}

                    {/* Occupied Rooms */}
                    {occupiedRooms.length > 0 && (
                        <Card
                            title={
                                <span style={{ color: '#ff4d4f' }}>
                                    <CloseCircleOutlined
                                        style={{ marginRight: 8 }}
                                    />
                                    Phòng đã đặt ({occupiedRooms.length})
                                </span>
                            }
                        >
                            <List
                                dataSource={occupiedRooms}
                                renderItem={(room) => (
                                    <List.Item
                                        style={{
                                            border: 'none',
                                            padding: '8px 0',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <Text
                                                    strong
                                                    style={{ fontSize: 16 }}
                                                >
                                                    {room.label}
                                                </Text>
                                                <br />
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 14 }}
                                                >
                                                    {room.type === 'bungalow'
                                                        ? 'Bungalow'
                                                        : 'Phòng thường'}
                                                </Text>
                                            </div>
                                            <div
                                                style={{
                                                    textAlign: 'right',
                                                    maxWidth: '200px',
                                                }}
                                            >
                                                <Tag
                                                    color={getStatusColor(
                                                        room.status
                                                    )}
                                                    icon={getStatusIcon(
                                                        room.status
                                                    )}
                                                    style={{
                                                        fontSize: 12,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    Đã đặt
                                                </Tag>
                                                <br />
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#666',
                                                    }}
                                                >
                                                    {room.value}
                                                </Text>
                                            </div>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default DateRoomChecker;
