import { useState } from 'react';
import {
    Form,
    Button,
    Typography,
    Select,
    DatePicker,
    Card,
    message,
    Modal,
} from 'antd';
import {
    DeleteOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROOM_OPTIONS } from '../constants/roomOptions';
// import { useAuth } from '../App';

const { Title, Text } = Typography;
const { confirm } = Modal;

const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const RemoveBooking = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [currentBooking, setCurrentBooking] = useState(null);
    const [bookingFound, setBookingFound] = useState(false);
    const navigate = useNavigate();
    // const { makeApiCall } = useAuth();

    // Function to convert column index to Excel column letter(s)
    const getColumnLetter = (columnIndex) => {
        let result = '';
        let index = columnIndex;

        while (index >= 0) {
            result = String.fromCharCode(65 + (index % 26)) + result;
            index = Math.floor(index / 26) - 1;
        }

        return result;
    };

    const checkCurrentBooking = async ({ date, roomId }) => {
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
        setCurrentBooking(null);
        setBookingFound(false);

        try {
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

            const roomRowIndex = data.findIndex(
                (row) => row && row[1] === roomId
            );

            console.log('Matched date format:', matchedFormat);
            console.log('Date index:', dateIndex);
            console.log('Room row index:', roomRowIndex);

            if (dateIndex === -1) {
                message.error(
                    `Không tìm thấy ngày trong bảng tính. Đã thử các định dạng: ${possibleFormats.join(
                        ', '
                    )}. Các cột có sẵn: ${headers.slice(2).join(', ')}`
                );
                return;
            }

            if (roomRowIndex === -1) {
                message.error(
                    `Không tìm thấy phòng "${roomId}" trong bảng tính`
                );
                return;
            }

            const cellValue = data?.[roomRowIndex]?.[dateIndex] || '';

            if (
                cellValue.trim() === '' ||
                cellValue === undefined ||
                cellValue === null
            ) {
                setCurrentBooking(null);
                setBookingFound(false);
                message.info(
                    `Phòng ${roomId} ngày ${matchedFormat} hiện đang trống`
                );
            } else {
                const roomInfo = ROOM_OPTIONS.find(
                    (room) => room.value === roomId
                );
                setCurrentBooking({
                    roomId,
                    roomLabel: roomInfo?.label || roomId,
                    date: matchedFormat,
                    dateIndex,
                    roomRowIndex,
                    value: cellValue,
                    columnLetter: getColumnLetter(dateIndex),
                });
                setBookingFound(true);
                message.success('Đã tìm thấy booking cần xóa');
            }
        } catch (error) {
            console.error('Error checking booking:', error);
            message.error('Lỗi khi kiểm tra booking. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const confirmRemoval = () => {
        confirm({
            title: 'Xác nhận xóa booking',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>
                        <strong>Bạn có chắc chắn muốn xóa booking này?</strong>
                    </p>
                    <div
                        style={{
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 6,
                            margin: '12px 0',
                        }}
                    >
                        <p>
                            <strong>Phòng:</strong> {currentBooking?.roomLabel}
                        </p>
                        <p>
                            <strong>Ngày:</strong> {currentBooking?.date}
                        </p>
                        <p>
                            <strong>Thông tin booking:</strong>{' '}
                            {currentBooking?.value}
                        </p>
                    </div>
                    <p style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                        Hành động này không thể hoàn tác!
                    </p>
                </div>
            ),
            okText: 'Xóa booking',
            okType: 'danger',
            cancelText: 'Hủy',
            width: 500,
            onOk: performRemoval,
        });
    };

    const performRemoval = async () => {
        if (!currentBooking) return;

        setLoading(true);
        try {
            const range = `${SHEET_NAME}!${currentBooking.columnLetter}${
                currentBooking.roomRowIndex + 1
            }`;

            console.log('Removing booking from range:', range);

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range,
                valueInputOption: 'RAW',
                resource: {
                    values: [['']], // Empty string to clear the cell
                },
            });

            message.success('Đã xóa booking thành công!');

            // Reset form and states
            form.resetFields();
            setCurrentBooking(null);
            setBookingFound(false);
        } catch (error) {
            console.error('Error removing booking:', error);
            message.error('Lỗi khi xóa booking. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

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
                <DeleteOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                Xóa đặt phòng
            </Title>

            <Form form={form} layout="vertical" onFinish={checkCurrentBooking}>
                <Form.Item
                    name="roomId"
                    label="Phòng"
                    rules={[{ required: true, message: 'Vui lòng chọn phòng' }]}
                >
                    <Select
                        placeholder="Chọn phòng cần xóa booking"
                        size="large"
                    >
                        {ROOM_OPTIONS.map((room) => (
                            <Select.Option key={room.value} value={room.value}>
                                {room.label}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="date"
                    label="Ngày đặt phòng"
                    rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày cần xóa booking"
                        size="large"
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={loading}
                        style={{ marginBottom: 8 }}
                    >
                        {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm booking'}
                    </Button>
                </Form.Item>
            </Form>

            {bookingFound && currentBooking && (
                <Card
                    title={
                        <span style={{ color: '#ff4d4f' }}>
                            <ExclamationCircleOutlined
                                style={{ marginRight: 8 }}
                            />
                            Booking được tìm thấy
                        </span>
                    }
                    style={{ marginBottom: 16 }}
                >
                    <div
                        style={{
                            background: '#fff2f0',
                            padding: 16,
                            borderRadius: 8,
                            border: '1px solid #ffccc7',
                        }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <Text
                                strong
                                style={{ display: 'block', marginBottom: 4 }}
                            >
                                Thông tin booking:
                            </Text>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '120px 1fr',
                                    gap: '8px',
                                    marginBottom: 8,
                                }}
                            >
                                <Text strong>Phòng:</Text>
                                <Text>{currentBooking.roomLabel}</Text>
                                <Text strong>Ngày:</Text>
                                <Text>{currentBooking.date}</Text>
                                <Text strong>Chi tiết:</Text>
                                <Text style={{ color: '#1890ff' }}>
                                    {currentBooking.value}
                                </Text>
                            </div>
                        </div>

                        <Button
                            type="primary"
                            danger
                            size="large"
                            block
                            icon={<DeleteOutlined />}
                            onClick={confirmRemoval}
                            loading={loading}
                        >
                            Xóa booking này
                        </Button>
                    </div>
                </Card>
            )}

            {!bookingFound &&
                currentBooking === null &&
                form.getFieldsValue().roomId &&
                form.getFieldsValue().date && (
                    <Card>
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <CheckCircleOutlined
                                style={{
                                    fontSize: 48,
                                    color: '#52c41a',
                                    marginBottom: 16,
                                }}
                            />
                            <Title level={4} style={{ color: '#52c41a' }}>
                                Phòng đang trống
                            </Title>
                            <Text>
                                Không có booking nào cần xóa cho phòng và ngày
                                đã chọn.
                            </Text>
                        </div>
                    </Card>
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
                <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
                    <li>Chọn phòng và ngày cần xóa booking</li>
                    <li>Nhấn "Tìm kiếm booking" để kiểm tra</li>
                    <li>
                        Nếu có booking, xác nhận xóa bằng cách nhấn "Xóa booking
                        này"
                    </li>
                    <li>Xác nhận lần nữa trong popup để hoàn tất</li>
                </ol>
            </Card>
        </div>
    );
};

export default RemoveBooking;
