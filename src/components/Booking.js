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
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useAuth } from '../App';
import './styles.css';

// Extend dayjs with the isSameOrBefore plugin
dayjs.extend(isSameOrBefore);

const { Title } = Typography;

const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const Booking = () => {
    const [form] = Form.useForm();
    const [roomStatus, setRoomStatus] = useState(null);
    const { isSignedIn } = useAuth();
    const navigate = useNavigate();

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

    const onFinish = async ({
        fromDate,
        toDate,
        roomId,
        name,
        value,
        price,
    }) => {
        try {
            if (!isSignedIn) {
                message.error('Please sign in first');
                return;
            }

            if (!fromDate || !toDate) {
                message.error('Vui lòng chọn cả ngày bắt đầu và ngày kết thúc');
                return;
            }

            if (toDate.isBefore(fromDate)) {
                message.error('Ngày kết thúc phải sau ngày bắt đầu');
                return;
            }

            // Generate array of dates from fromDate to toDate
            const dateRange = [];
            let currentDate = fromDate.clone();
            while (currentDate.isSameOrBefore(toDate)) {
                dateRange.push(currentDate.format('DD/MM/YYYY'));
                currentDate = currentDate.add(1, 'day');
            }

            message.info(
                `Đang cập nhật ${dateRange.length} ngày: ${dateRange.join(
                    ', '
                )}`
            );

            const readRes =
                await window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}`,
                });

            const data = readRes.result.values;
            const headers = data[0];

            const roomRowIndex = data.findIndex(
                (row) => row && row[1] === roomId
            );

            if (roomRowIndex === -1) {
                message.error(
                    `Không tìm thấy phòng "${roomId}" trong bảng tính`
                );
                return;
            }

            // Check which dates exist in the sheet
            const validDates = [];
            const invalidDates = [];
            const datesToUpdate = [];

            for (const formattedDate of dateRange) {
                const dateIndex = headers.indexOf(formattedDate);
                if (dateIndex === -1) {
                    invalidDates.push(formattedDate);
                } else {
                    validDates.push(formattedDate);
                    const currentValue =
                        data?.[roomRowIndex]?.[dateIndex] || '';
                    datesToUpdate.push({
                        date: formattedDate,
                        dateIndex,
                        currentValue,
                        columnLetter: getColumnLetter(dateIndex),
                        range: `${SHEET_NAME}!${getColumnLetter(dateIndex)}${
                            roomRowIndex + 1
                        }`,
                    });
                }
            }

            if (invalidDates.length > 0) {
                message.warning(
                    `Các ngày không tồn tại trong bảng tính sẽ bị bỏ qua: ${invalidDates.join(
                        ', '
                    )}`
                );
            }

            if (datesToUpdate.length === 0) {
                message.error('Không có ngày hợp lệ nào để cập nhật');
                return;
            }

            // Check for existing values and ask for confirmation if needed
            const existingValues = datesToUpdate.filter(
                (item) => item.currentValue.trim() !== ''
            );
            if (existingValues.length > 0) {
                const existingDates = existingValues
                    .map((item) => item.date)
                    .join(', ');
                const confirmed = await new Promise((resolve) => {
                    Modal.confirm({
                        title: 'Có dữ liệu đã tồn tại',
                        content: `Các ngày sau đã có dữ liệu: ${existingDates}. Bạn có chắc muốn ghi đè không?`,
                        okText: 'Ghi đè tất cả',
                        cancelText: 'Hủy',
                        onOk: () => resolve(true),
                        onCancel: () => resolve(false),
                    });
                });
                if (!confirmed) return;
            }

            // Prepare batch update data
            const composedValue = `${name} - ${value}${
                value === 'Đã đặt cọc' && price ? ` - ${price}` : ''
            }`;

            const batchUpdateData = {
                requests: datesToUpdate.map((item) => ({
                    updateCells: {
                        range: {
                            sheetId: 0, // Assuming first sheet
                            startRowIndex: roomRowIndex,
                            endRowIndex: roomRowIndex + 1,
                            startColumnIndex: item.dateIndex,
                            endColumnIndex: item.dateIndex + 1,
                        },
                        rows: [
                            {
                                values: [
                                    {
                                        userEnteredValue: {
                                            stringValue: composedValue,
                                        },
                                    },
                                ],
                            },
                        ],
                        fields: 'userEnteredValue',
                    },
                })),
            };

            // Execute batch update
            await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: batchUpdateData,
            });

            message.success(
                `Đã cập nhật thành công ${datesToUpdate.length} ngày cho phòng ${roomId}!`
            );
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
                    name="fromDate"
                    label="Ngày bắt đầu"
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng chọn ngày bắt đầu',
                        },
                    ]}
                >
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày bắt đầu"
                        size="large"
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item
                    name="toDate"
                    label="Ngày kết thúc"
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng chọn ngày kết thúc',
                        },
                    ]}
                >
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày kết thúc"
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
