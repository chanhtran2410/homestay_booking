import { useState } from 'react';
import { Form, Button, Typography, Select, message, DatePicker } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { ROOM_OPTIONS } from '../constants/roomOptions';
import './styles.css';

const { Title } = Typography;

const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const RoomAvailability = () => {
    const [form] = Form.useForm();
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { makeApiCall } = useAuth();

    const onFinish = async ({ date, roomId }) => {
        setLoading(true);
        setResult(''); // Clear previous result

        try {
            const formattedDate = date.format('DD/MM/YYYY');

            const readRes = await makeApiCall(() =>
                window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}`,
                })
            );

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
        <div className="content-container">
            <div className="page-wrapper">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/')}
                    type="text"
                    className="back-button"
                >
                    Về trang chủ
                </Button>
                <Title level={3} className="page-title">
                    📅 Kiểm tra tình trạng phòng
                </Title>

                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        name="roomId"
                        label="Phòng"
                        rules={[{ required: true, message: 'Chọn phòng' }]}
                    >
                        <Select placeholder="Chọn phòng" size="large">
                            {ROOM_OPTIONS.map((room) => (
                                <Select.Option
                                    key={room.value}
                                    value={room.value}
                                >
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
                            loading={loading}
                        >
                            {loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
                        </Button>
                    </Form.Item>
                </Form>

                {result && (
                    <div className="result-display">
                        <div className="result-text">
                            ✅ Trạng thái: {result}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomAvailability;
