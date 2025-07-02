import { useState } from 'react';
import {
    Form,
    Input,
    Button,
    message,
    Typography,
    Modal,
    Select,
    DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../App';

import './styles.css';
const { Title } = Typography;

const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const Booking = () => {
    const [form] = Form.useForm();
    const [roomStatus, setRoomStatus] = useState(null);
    const { isSignedIn } = useAuth();

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

    const confirmOverwrite = () =>
        new Promise((resolve) => {
            Modal.confirm({
                title: 'Ô này đã được cập nhật trước đó',
                content: 'Bạn có chắc muốn ghi đè lên thông tin cũ?',
                okText: 'Cập nhật',
                cancelText: 'Hủy',
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });

    const onFinish = async ({ date, roomId, name, value, price }) => {
        try {
            if (!isSignedIn) {
                message.error('Please sign in first');
                return;
            }

            const formattedDate = date.format('DD/MM/YYYY');

            const readRes =
                await window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}`,
                });

            const data = readRes.result.values;
            const headers = data[0];

            const dateIndex = headers.indexOf(formattedDate);
            const roomRowIndex = data.findIndex(
                (row) => row && row[1] === roomId
            );

            if (dateIndex === -1) {
                message.error(
                    `Không tìm thấy ngày "${formattedDate}" trong bảng tính. Các cột có sẵn: ${headers
                        .slice(2)
                        .join(', ')}`
                );
                return;
            }

            if (roomRowIndex === -1) {
                message.error(
                    `Không tìm thấy phòng "${roomId}" trong bảng tính`
                );
                return;
            }

            const columnLetter = getColumnLetter(dateIndex);
            const range = `${SHEET_NAME}!${columnLetter}${roomRowIndex + 1}`;
            const currentValue = data?.[roomRowIndex]?.[dateIndex] || '';

            if (currentValue.trim() !== '') {
                const confirmed = await confirmOverwrite();
                if (!confirmed) return;
            }

            const composedValue = `${name} - ${value}${
                value === 'Đã đặt cọc' && price ? ` - ${price}` : ''
            }`;

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range,
                valueInputOption: 'RAW',
                resource: {
                    values: [[composedValue]],
                },
            });

            message.success('Booking updated successfully!');
            form.resetFields();
            setRoomStatus(null);
        } catch (error) {
            console.error('Sheet update failed:', error);
            message.error('Failed to update sheet');
        }
    };

    const roomOptions = [
        { value: '1001', label: '1001 - Bungalow Lớn' },
        { value: '1002', label: '1002 - Bungalow Nhỏ 1' },
        { value: '1003', label: '1003 - Bungalow Nhỏ 2' },
        { value: '1004', label: '1004 - Phòng Nhỏ' },
        { value: '1005', label: '1005 - Phòng Lớn 1' },
        { value: '1006', label: '1006 - Phòng Lớn 2' },
    ];

    return (
        <div className="booking-container">
            <Title level={3} className="booking-title">
                Update Booking for Room
            </Title>

            {!isSignedIn && (
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
            )}

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                className="booking-form"
            >
                <Form.Item
                    name="roomId"
                    label="Số phòng"
                    rules={[
                        { required: true, message: 'Please select a Room ID' },
                    ]}
                >
                    <Select placeholder="Select a room" size="large">
                        {roomOptions.map((room) => (
                            <Select.Option key={room.value} value={room.value}>
                                {room.label}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="date"
                    label="Ngày đặt phòng"
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng chọn ngày đặt phòng',
                        },
                    ]}
                >
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày"
                        size="large"
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Tên khách hàng"
                    rules={[{ required: true, message: 'Please enter name' }]}
                >
                    <Input placeholder="e.g. mh" size="large" />
                </Form.Item>

                <Form.Item
                    name="value"
                    label="Trạng thái phòng"
                    rules={[
                        {
                            required: true,
                            message: 'Please chọn trạng thái phòng',
                        },
                    ]}
                >
                    <Select
                        placeholder="Chọn trạng thái"
                        onChange={(val) => setRoomStatus(val)}
                        options={[
                            { label: 'Đã đặt cọc', value: 'Đã đặt cọc' },
                            {
                                label: 'Đang đợi đặt cọc',
                                value: 'Đang đợi đặt cọc',
                            },
                        ]}
                        size="large"
                    />
                </Form.Item>

                {roomStatus === 'Đã đặt cọc' && (
                    <Form.Item
                        name="price"
                        label="Tiền đặt cọc"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập tiền cọc',
                            },
                        ]}
                    >
                        <Input placeholder="e.g. 500" size="large" />
                    </Form.Item>
                )}

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        disabled={!isSignedIn}
                        className="booking-button"
                        size="large"
                        block
                    >
                        Update Cell
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default Booking;
