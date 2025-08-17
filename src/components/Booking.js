import React, { useState, memo, useCallback } from 'react';
import {
    Form,
    Input,
    InputNumber,
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
import { ROOM_OPTIONS } from '../constants/roomOptions';
import './styles.css';

// Extend dayjs with the isSameOrBefore plugin
dayjs.extend(isSameOrBefore);

const { Title } = Typography;

const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const Booking = memo(() => {
    const [form] = Form.useForm();
    const [roomStatus, setRoomStatus] = useState(null);
    const navigate = useNavigate();
    const { makeApiCall } = useAuth();

    // Function to convert column index to Excel column letter(s) - memoized
    const getColumnLetter = useCallback((columnIndex) => {
        let result = '';
        let index = columnIndex;

        while (index >= 0) {
            result = String.fromCharCode(65 + (index % 26)) + result;
            index = Math.floor(index / 26) - 1;
        }

        return result;
    }, []);

    const onFinish = useCallback(
        async ({ fromDate, numberOfNights, roomIds, name, value, price }) => {
            try {
                if (
                    !fromDate ||
                    !numberOfNights ||
                    !roomIds ||
                    roomIds.length === 0
                ) {
                    message.error(
                        'Vui lòng chọn ngày nhận phòng, số đêm lưu trú và ít nhất một phòng'
                    );
                    return;
                }

                if (numberOfNights <= 0) {
                    message.error('Số đêm lưu trú phải lớn hơn 0');
                    return;
                }

                // Generate array of dates from fromDate for numberOfNights
                const dateRange = [];
                let currentDate = fromDate.clone();
                for (let i = 0; i < numberOfNights; i++) {
                    dateRange.push(currentDate.format('DD/MM/YYYY'));
                    currentDate = currentDate.add(1, 'day');
                }

                const endDate = fromDate.clone().add(numberOfNights - 1, 'day');

                message.info(
                    `Đang cập nhật ${numberOfNights} đêm cho ${
                        roomIds.length
                    } phòng (${fromDate.format(
                        'DD/MM/YYYY'
                    )} - ${endDate.format('DD/MM/YYYY')}): ${dateRange.join(
                        ', '
                    )}`
                );

                const readRes = await makeApiCall(() =>
                    window.gapi.client.sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${SHEET_NAME}`,
                    })
                );

                const data = readRes.result.values;
                const headers = data[0];

                // Process each room
                const allDataToUpdate = [];
                const invalidRooms = [];

                for (const roomId of roomIds) {
                    const roomRowIndex = data.findIndex(
                        (row) => row && row[1] === roomId
                    );

                    if (roomRowIndex === -1) {
                        invalidRooms.push(roomId);
                        continue;
                    }

                    // Check which dates exist in the sheet for this room
                    const validDates = [];
                    const invalidDates = [];

                    for (const formattedDate of dateRange) {
                        const dateIndex = headers.indexOf(formattedDate);
                        if (dateIndex === -1) {
                            invalidDates.push(formattedDate);
                        } else {
                            validDates.push(formattedDate);
                            const currentValue =
                                data?.[roomRowIndex]?.[dateIndex] || '';
                            allDataToUpdate.push({
                                roomId,
                                date: formattedDate,
                                dateIndex,
                                currentValue,
                                roomRowIndex,
                                columnLetter: getColumnLetter(dateIndex),
                                range: `${SHEET_NAME}!${getColumnLetter(
                                    dateIndex
                                )}${roomRowIndex + 1}`,
                            });
                        }
                    }

                    if (invalidDates.length > 0) {
                        message.warning(
                            `Phòng ${roomId} - Các ngày không tồn tại trong bảng tính: ${invalidDates.join(
                                ', '
                            )}`
                        );
                    }
                }

                if (invalidRooms.length > 0) {
                    message.error(
                        `Không tìm thấy các phòng sau trong bảng tính: ${invalidRooms.join(
                            ', '
                        )}`
                    );
                }

                if (allDataToUpdate.length === 0) {
                    message.error('Không có dữ liệu hợp lệ nào để cập nhật');
                    return;
                }

                // Check for existing values and ask for confirmation if needed
                const existingValues = allDataToUpdate.filter(
                    (item) => item.currentValue.trim() !== ''
                );
                if (existingValues.length > 0) {
                    const existingInfo = existingValues
                        .map((item) => `${item.roomId}: ${item.date}`)
                        .join(', ');
                    const confirmed = await new Promise((resolve) => {
                        Modal.confirm({
                            title: 'Có dữ liệu đã tồn tại',
                            content: `Các phòng và ngày sau đã có dữ liệu: ${existingInfo}. Bạn có chắc muốn ghi đè không?`,
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
                    requests: allDataToUpdate.map((item) => ({
                        updateCells: {
                            range: {
                                sheetId: 0, // Assuming first sheet
                                startRowIndex: item.roomRowIndex,
                                endRowIndex: item.roomRowIndex + 1,
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
                await makeApiCall(() =>
                    window.gapi.client.sheets.spreadsheets.batchUpdate({
                        spreadsheetId: SPREADSHEET_ID,
                        resource: batchUpdateData,
                    })
                );

                message.success(
                    `Đã đặt phòng thành công ${numberOfNights} đêm cho ${roomIds.length} phòng! (${allDataToUpdate.length} ô đã cập nhật)`
                );
                form.resetFields();
                setRoomStatus(null);
            } catch (error) {
                console.error('Sheet update failed:', error);
                message.error('Failed to update sheet');
            }
        },
        [makeApiCall, getColumnLetter, form]
    );

    const handleNavigateHome = useCallback(() => navigate('/'), [navigate]);

    return (
        <div className="content-container">
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleNavigateHome}
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
            <Title level={3} className="booking-title">
                Đặt phòng
            </Title>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                className="booking-form"
            >
                <Form.Item
                    name="roomIds"
                    label="Phòng cần đặt (có thể chọn nhiều)"
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng chọn ít nhất một phòng',
                        },
                    ]}
                >
                    <Select
                        mode="multiple"
                        placeholder="Chọn phòng cần đặt (có thể chọn nhiều)"
                        size="large"
                        maxTagCount="responsive"
                    >
                        {ROOM_OPTIONS.map((room) => (
                            <Select.Option key={room.value} value={room.value}>
                                {room.label}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="fromDate"
                    label="Ngày nhận phòng"
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng chọn ngày nhận phòng',
                        },
                    ]}
                >
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày nhận phòng"
                        size="large"
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item
                    name="numberOfNights"
                    label="Số đêm lưu trú"
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng nhập số đêm lưu trú',
                        },
                        {
                            type: 'number',
                            min: 1,
                            max: 30,
                            message: 'Số đêm phải từ 1 đến 30',
                        },
                    ]}
                >
                    <InputNumber
                        placeholder="Ví dụ: 3"
                        size="large"
                        min={1}
                        max={30}
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
                        className="booking-button"
                        size="large"
                        block
                    >
                        Xác nhận đặt phòng
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
});

export default Booking;
