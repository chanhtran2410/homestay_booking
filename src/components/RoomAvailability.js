import { useState } from 'react';
import { Form, Button, Typography, Select, message, DatePicker } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const { Title } = Typography;

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

const RoomAvailability = () => {
    const [form] = Form.useForm();
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const { isSignedIn, apiInitialized } = useAuth();
    const navigate = useNavigate();

    const onFinish = async ({ date, roomId }) => {
        if (!apiInitialized) {
            message.error(
                'Google API is still initializing. Please wait a moment.'
            );
            return;
        }

        if (!isSignedIn) {
            message.error('Please sign in first to check room availability');
            return;
        }

        if (!window.gapi || !window.gapi.client || !window.gapi.client.sheets) {
            message.error('Google Sheets API is not initialized');
            return;
        }

        setLoading(true);
        setResult(''); // Clear previous result

        try {
            const formattedDate = date.format('DD/MM/YYYY');

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
            const dateIndex = headers.indexOf(formattedDate);
            const roomRowIndex = data.findIndex(
                (row) => row && row[1] === roomId
            );

            if (dateIndex === -1) {
                message.error(
                    `Không tìm thấy ngày "${formattedDate}" trong bảng tính`
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

            // Enhanced result display with more context
            if (
                cellValue.trim() === '' ||
                cellValue === undefined ||
                cellValue === null
            ) {
                setResult('🟢 Phòng trống');
            } else {
                setResult(`🔴 Đã đặt: ${cellValue}`);
            }

            console.log(`Room ${roomId} on ${date}: "${cellValue}"`);
        } catch (error) {
            console.error('Error reading sheet:', error);
            message.error('Lỗi khi kiểm tra phòng. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 500, margin: '40px auto' }}>
            <div style={{ marginBottom: 16 }}>
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
            </div>
            <Title level={3}>📅 Kiểm tra tình trạng phòng</Title>

            {!isSignedIn ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: 40,
                        background: '#f5f5f5',
                        borderRadius: 8,
                        marginBottom: 16,
                    }}
                >
                    <p>Vui lòng đăng nhập để sử dụng chức năng này</p>
                </div>
            ) : (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: 6,
                        textAlign: 'center',
                    }}
                >
                    ✓ Đã kết nối với Google Sheets
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    name="roomId"
                    label="Phòng"
                    rules={[{ required: true, message: 'Chọn phòng' }]}
                >
                    <Select
                        placeholder="Chọn phòng"
                        size="large"
                        disabled={!isSignedIn}
                    >
                        {roomOptions.map((room) => (
                            <Select.Option key={room.value} value={room.value}>
                                {room.label}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="date"
                    label="Ngày (tiêu đề cột)"
                    rules={[{ required: true, message: 'Nhập ngày' }]}
                    extra="Nhập ngày theo định dạng trong bảng tính (ví dụ: 1/5, 2/1, etc.)"
                >
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày"
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
                        disabled={!isSignedIn}
                        loading={loading}
                    >
                        {loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
                    </Button>
                </Form.Item>
            </Form>

            {result && (
                <div
                    style={{
                        marginTop: 24,
                        padding: 16,
                        backgroundColor: result.includes('🟢')
                            ? '#f6ffed'
                            : '#fff2f0',
                        border: `1px solid ${
                            result.includes('🟢') ? '#b7eb8f' : '#ffb3b3'
                        }`,
                        borderRadius: 8,
                        fontSize: 18,
                        fontWeight: 500,
                        textAlign: 'center',
                    }}
                >
                    ✅ Trạng thái: {result}
                </div>
            )}
        </div>
    );
};

export default RoomAvailability;
