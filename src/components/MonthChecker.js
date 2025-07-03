import { useState, useEffect } from 'react';
import {
    Typography,
    DatePicker,
    Card,
    message,
    Table,
    Tag,
    Spin,
    Modal,
    Button,
} from 'antd';
import {
    CalendarOutlined,
    InfoCircleOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import dayjs from 'dayjs';
import './styles.css';

const { Title } = Typography;
const { MonthPicker } = DatePicker;

const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const roomOptions = [
    { value: '1001', label: '1001 - Bungalow Lớn' },
    { value: '1002', label: '1002 - Bungalow Nhỏ 1' },
    { value: '1003', label: '1003 - Bungalow Nhỏ 2' },
    { value: '1004', label: '1004 - Phòng Nhỏ' },
    { value: '1005', label: '1005 - Phòng Lớn 1' },
    { value: '1006', label: '1006 - Phòng Lớn 2' },
];

const MonthChecker = () => {
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [monthData, setMonthData] = useState([]);
    const [tableColumns, setTableColumns] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCellInfo, setSelectedCellInfo] = useState(null);
    const { isSignedIn } = useAuth();
    const navigate = useNavigate();

    const parseBookingDetails = (value, roomId, date) => {
        if (!value || value.trim() === '') {
            return {
                status: 'Trống',
                customerName: '',
                depositAmount: '',
                fullInfo: '',
                statusType: 'available',
            };
        }

        const lowerValue = value.toLowerCase();
        let status,
            statusType,
            customerName = '',
            depositAmount = '';

        // Determine status
        if (
            lowerValue.includes('đã đặt cọc') ||
            lowerValue.includes('đã nhận cọc')
        ) {
            status = 'Đã đặt cọc';
            statusType = 'confirmed';
        } else if (
            lowerValue.includes('đang đợi') ||
            lowerValue.includes('chờ')
        ) {
            status = 'Đang đợi đặt cọc';
            statusType = 'pending';
        } else {
            status = 'Đã đặt';
            statusType = 'booked';
        }

        // Extract customer name (usually the first part before the dash)
        const parts = value.split(' - ');
        if (parts.length > 0) {
            customerName = parts[0].trim();
        }

        // Extract deposit amount (look for numbers)
        const moneyMatch = value.match(/(\d+(?:\.\d+)?)/);
        if (moneyMatch && statusType === 'confirmed') {
            depositAmount = parseFloat(moneyMatch[1]);
        }

        return {
            status,
            statusType,
            customerName,
            depositAmount,
            fullInfo: value,
            roomId,
            date,
        };
    };

    const handleCellClick = (value, roomId, day) => {
        const date = selectedMonth.date(day).format('DD/MM/YYYY');
        const roomInfo = roomOptions.find((room) => room.value === roomId);
        const bookingDetails = parseBookingDetails(value, roomId, date);

        setSelectedCellInfo({
            ...bookingDetails,
            roomLabel: roomInfo?.label || roomId,
            day: day,
        });
        setModalVisible(true);
    };

    const getStatusColor = (value) => {
        if (!value || value.trim() === '') {
            return null; // Available - no tag
        }

        const lowerValue = value.toLowerCase();
        if (
            lowerValue.includes('đã đặt cọc') ||
            lowerValue.includes('đã nhận cọc')
        ) {
            return 'error'; // Red for confirmed bookings
        } else if (
            lowerValue.includes('đang đợi') ||
            lowerValue.includes('chờ')
        ) {
            return 'warning'; // Yellow for pending bookings
        } else {
            return 'processing'; // Blue for other bookings
        }
    };

    const getStatusText = (value) => {
        if (!value || value.trim() === '') {
            return '';
        }

        // Extract money amount if present
        const moneyMatch = value.match(/(\d+)/);
        const amount = moneyMatch ? moneyMatch[1] : '';

        const lowerValue = value.toLowerCase();
        if (
            lowerValue.includes('đã đặt cọc') ||
            lowerValue.includes('đã nhận cọc')
        ) {
            return amount ? `Đã cọc (${amount})` : 'Đã cọc';
        } else if (
            lowerValue.includes('đang đợi') ||
            lowerValue.includes('chờ')
        ) {
            return 'Đang chờ cọc';
        } else {
            return value.length > 15 ? value.substring(0, 15) + '...' : value;
        }
    };

    const generateDatesForMonth = (month) => {
        const startOfMonth = month.startOf('month');
        const endOfMonth = month.endOf('month');
        const daysInMonth = endOfMonth.date();

        const dates = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = startOfMonth.date(i);
            dates.push({
                day: i,
                date: date,
                formats: [
                    date.format('DD/MM/YYYY'),
                    date.format('D/M/YYYY'),
                    date.format('DD/MM'),
                    date.format('D/M'),
                    date.format('MM/DD/YYYY'),
                    date.format('M/D/YYYY'),
                ],
            });
        }
        return dates;
    };

    const loadMonthData = async (month) => {
        setLoading(true);
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
            const monthDates = generateDatesForMonth(month);

            // Create columns for the table
            const columns = [
                {
                    title: 'Phòng',
                    dataIndex: 'roomLabel',
                    key: 'room',
                    fixed: 'left',
                    width: 120,
                    render: (text, record) => (
                        <div>
                            <strong>{record.roomId}</strong>
                            <br />
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                {text.split(' - ')[1]}
                            </span>
                        </div>
                    ),
                },
            ];

            // Add date columns
            monthDates.forEach((dateInfo) => {
                columns.push({
                    title: (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold' }}>
                                {dateInfo.day}
                            </div>
                            <div style={{ fontSize: '10px', color: '#666' }}>
                                {dateInfo.date.format('ddd')}
                            </div>
                        </div>
                    ),
                    dataIndex: `day_${dateInfo.day}`,
                    key: `day_${dateInfo.day}`,
                    width: 80,
                    align: 'center',
                    render: (value, record) => {
                        const color = getStatusColor(value);
                        const text = getStatusText(value);

                        const cellStyle = {
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        };

                        const handleCellClickLocal = () => {
                            handleCellClick(value, record.roomId, dateInfo.day);
                        };

                        if (!color) {
                            return (
                                <div
                                    style={{
                                        ...cellStyle,
                                        backgroundColor: '#f6ffed',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: '#52c41a',
                                    }}
                                    onClick={handleCellClickLocal}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor =
                                            '#d9f7be';
                                        e.target.style.transform =
                                            'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor =
                                            '#f6ffed';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    Trống
                                </div>
                            );
                        }

                        return (
                            <div
                                style={cellStyle}
                                onClick={handleCellClickLocal}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'scale(1)';
                                }}
                            >
                                <Tag
                                    color={color}
                                    style={{
                                        margin: 0,
                                        fontSize: '10px',
                                        textAlign: 'center',
                                        maxWidth: '70px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={value} // Show full text on hover
                                >
                                    {text}
                                </Tag>
                            </div>
                        );
                    },
                });
            });

            setTableColumns(columns);

            // Create data for each room
            const tableData = roomOptions.map((room) => {
                const roomRowIndex = data.findIndex(
                    (row) => row && row[1] === room.value
                );
                const rowData = {
                    key: room.value,
                    roomId: room.value,
                    roomLabel: room.label,
                };

                // Add data for each day
                monthDates.forEach((dateInfo) => {
                    let cellValue = '';

                    // Try to find the date in headers with different formats
                    if (roomRowIndex !== -1) {
                        for (const format of dateInfo.formats) {
                            const dateIndex = headers.indexOf(format);
                            if (dateIndex !== -1) {
                                cellValue = data[roomRowIndex][dateIndex] || '';
                                break;
                            }
                        }
                    }

                    rowData[`day_${dateInfo.day}`] = cellValue;
                });

                return rowData;
            });

            setMonthData(tableData);

            const monthName = month.format('MMMM YYYY');
            message.success(`Đã tải dữ liệu tháng ${monthName}`);
        } catch (error) {
            console.error('Error loading month data:', error);
            message.error('Lỗi khi tải dữ liệu tháng. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSignedIn) {
            loadMonthData(selectedMonth);
        }
    }, [isSignedIn, selectedMonth]);

    const handleMonthChange = (month) => {
        if (month) {
            setSelectedMonth(month);
        }
    };

    // Calculate summary statistics
    const totalCells =
        monthData.length * generateDatesForMonth(selectedMonth).length;
    let bookedCells = 0;
    let pendingCells = 0;
    let availableCells = 0;

    monthData.forEach((room) => {
        generateDatesForMonth(selectedMonth).forEach((dateInfo) => {
            const value = room[`day_${dateInfo.day}`];
            if (!value || value.trim() === '') {
                availableCells++;
            } else if (
                value.toLowerCase().includes('đang đợi') ||
                value.toLowerCase().includes('chờ')
            ) {
                pendingCells++;
            } else {
                bookedCells++;
            }
        });
    });

    return (
        <div className="content-container">
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/')}
                type="text"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    color: '#1890ff',
                }}
            >
                Về trang chủ
            </Button>
            <Title level={3}>
                <CalendarOutlined
                    style={{ marginRight: 8, color: '#1890ff' }}
                />
                Dashboard tháng - Tình trạng phòng
            </Title>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                }}
            >
                <div>
                    <MonthPicker
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        format="MM/YYYY"
                        placeholder="Chọn tháng"
                        size="large"
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                    }}
                >
                    <Tag color="success" style={{ margin: 0 }}>
                        Trống: {availableCells}
                    </Tag>
                    <Tag color="warning" style={{ margin: 0 }}>
                        Đang chờ: {pendingCells}
                    </Tag>
                    <Tag color="error" style={{ margin: 0 }}>
                        Đã đặt: {bookedCells}
                    </Tag>
                    <Tag color="default" style={{ margin: 0 }}>
                        Tổng: {totalCells}
                    </Tag>
                </div>
            </div>
            <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ marginBottom: 8 }}>
                    Tháng {selectedMonth.format('MM/YYYY')}
                </Title>
                <div
                    style={{
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: 8,
                    }}
                >
                    <Tag color="success">Xanh = Trống</Tag>
                    <Tag color="warning">Vàng = Đang chờ cọc</Tag>
                    <Tag color="error">Đỏ = Đã đặt cọc</Tag>
                </div>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>Đang tải dữ liệu...</div>
                </div>
            ) : (
                <Table
                    columns={tableColumns}
                    dataSource={monthData}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    bordered
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        overflow: 'hidden',
                    }}
                />
            )}
            <Card
                style={{
                    marginTop: 16,
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                }}
            >
                <Title level={5} style={{ color: '#389e0d', marginBottom: 8 }}>
                    💡 Hướng dẫn sử dụng:
                </Title>
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    <li>Chọn tháng muốn xem từ dropdown</li>
                    <li>Dữ liệu sẽ tự động tải và hiển thị trong bảng</li>
                    <li>Click vào ô để xem thông tin chi tiết</li>
                    <li>Màu sắc: Xanh = Trống, Vàng = Chờ cọc, Đỏ = Đã cọc</li>
                </ul>
            </Card>
            {/* Modal for booking details */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <InfoCircleOutlined
                            style={{ marginRight: 8, color: '#1890ff' }}
                        />
                        Chi tiết đặt phòng
                    </div>
                }
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={500}
            >
                {selectedCellInfo && (
                    <div style={{ padding: '16px 0' }}>
                        <div style={{ marginBottom: 16 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <strong>Ngày:</strong>
                                <span>{selectedCellInfo.date}</span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <strong>Phòng:</strong>
                                <span>{selectedCellInfo.roomLabel}</span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <strong>Trạng thái:</strong>
                                <Tag
                                    color={
                                        selectedCellInfo.statusType ===
                                        'available'
                                            ? 'success'
                                            : selectedCellInfo.statusType ===
                                              'pending'
                                            ? 'warning'
                                            : selectedCellInfo.statusType ===
                                              'confirmed'
                                            ? 'error'
                                            : 'processing'
                                    }
                                >
                                    {selectedCellInfo.status}
                                </Tag>
                            </div>

                            {selectedCellInfo.customerName && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: 8,
                                    }}
                                >
                                    <strong>Thông tin người đặt:</strong>
                                    <span>{selectedCellInfo.customerName}</span>
                                </div>
                            )}

                            {selectedCellInfo.depositAmount &&
                                selectedCellInfo.statusType === 'confirmed' && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: 8,
                                        }}
                                    >
                                        <strong>Tiền đặt cọc:</strong>
                                        <span
                                            style={{
                                                color: '#52c41a',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {selectedCellInfo.depositAmount.toLocaleString()}{' '}
                                            VNĐ
                                        </span>
                                    </div>
                                )}

                            {selectedCellInfo.fullInfo &&
                                selectedCellInfo.fullInfo.trim() !== '' && (
                                    <div
                                        style={{
                                            marginTop: 16,
                                            padding: 12,
                                            backgroundColor: '#f5f5f5',
                                            borderRadius: 4,
                                        }}
                                    >
                                        <strong style={{ color: '#666' }}>
                                            Thông tin đầy đủ:
                                        </strong>
                                        <div
                                            style={{
                                                marginTop: 8,
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            "{selectedCellInfo.fullInfo}"
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MonthChecker;
