import { useEffect, useState } from 'react';
import { Form, Input, Button, message, Typography, Modal, Select } from 'antd';

const { Title } = Typography;

const CLIENT_ID =
    process.env.REACT_APP_GOOGLE_CLIENT_ID ||
    '311093634768-ps25fkb4hmm3d6bq86rdhh8cdi9hbd5o.apps.googleusercontent.com';
const API_KEY =
    process.env.REACT_APP_GOOGLE_API_KEY ||
    'AIzaSyDO1vCsfDoJRAPt4pQ6BnRjtxjf_fnG7zQ';
const DISCOVERY_DOCS = [
    'https://sheets.googleapis.com/$discovery/rest?version=v4',
];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const SPREADSHEET_ID =
    process.env.REACT_APP_SPREADSHEET_ID ||
    '1re26jyCc2_gebIn5BRW7DTHAR6QmFTB7k5iSC3UhRrc';
const SHEET_NAME = 'Sheet1';

const Booking = () => {
    const [form] = Form.useForm();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [accessToken, setAccessToken] = useState(null);
    const [roomStatus, setRoomStatus] = useState(null);

    useEffect(() => {
        const initializeGoogleServices = async () => {
            try {
                await new Promise((resolve) => {
                    const checkLibraries = () => {
                        if (window.gapi && window.google) {
                            resolve();
                        } else {
                            setTimeout(checkLibraries, 100);
                        }
                    };
                    checkLibraries();
                });

                await new Promise((resolve, reject) => {
                    window.gapi.load('client', async () => {
                        try {
                            await window.gapi.client.init({
                                apiKey: API_KEY,
                                discoveryDocs: DISCOVERY_DOCS,
                            });
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: () => {},
                });

                console.log('Google services initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Google services:', error);
                message.error('Failed to initialize Google services');
            }
        };

        initializeGoogleServices();
    }, []);

    const handleLogin = async () => {
        try {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('OAuth error:', response.error);
                        message.error(`Login failed: ${response.error}`);
                        return;
                    }

                    console.log(
                        'Access token received:',
                        response.access_token
                    );
                    setAccessToken(response.access_token);
                    setIsSignedIn(true);
                    message.success('Signed in with Google successfully!');

                    window.gapi.client.setToken({
                        access_token: response.access_token,
                    });
                },
            });

            tokenClient.requestAccessToken();
        } catch (error) {
            console.error('Login failed:', error);
            message.error('Login failed. Please try again.');
        }
    };

    const handleLogout = () => {
        if (accessToken) {
            window.google.accounts.oauth2.revoke(accessToken);
        }
        window.gapi.client.setToken(null);
        setAccessToken(null);
        setIsSignedIn(false);
        message.success('Signed out successfully');
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

            const readRes =
                await window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}`,
                });

            const data = readRes.result.values;
            const headers = data[0];
            const dateIndex = headers.indexOf(date);
            const roomRowIndex = data.findIndex((row) => row[1] === roomId);

            if (dateIndex === -1 || roomRowIndex === -1) {
                message.error('Invalid date or room ID');
                return;
            }

            const range = `${SHEET_NAME}!${String.fromCharCode(
                65 + dateIndex
            )}${roomRowIndex + 1}`;
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

    return (
        <div style={{ maxWidth: 500, margin: '40px auto' }}>
            <Title level={3}>Update Booking for Room</Title>

            {!isSignedIn ? (
                <Button
                    type="primary"
                    onClick={handleLogin}
                    style={{ marginBottom: 16 }}
                >
                    Sign in with Google
                </Button>
            ) : (
                <div style={{ marginBottom: 16 }}>
                    <Button onClick={handleLogout} style={{ marginRight: 8 }}>
                        Sign out
                    </Button>
                    <span style={{ color: 'green' }}>
                        ✓ Signed in with Google
                    </span>
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    name="roomId"
                    label="Room ID"
                    rules={[
                        { required: true, message: 'Please enter Room ID' },
                    ]}
                >
                    <Input placeholder="e.g. 1001" />
                </Form.Item>

                <Form.Item
                    name="date"
                    label="Date (column header)"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter a date like 1/5',
                        },
                    ]}
                >
                    <Input placeholder="e.g. 1/5" />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="Tên khách hàng"
                    rules={[{ required: true, message: 'Please enter name' }]}
                >
                    <Input placeholder="e.g. mh" />
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
                        <Input placeholder="e.g. 500" />
                    </Form.Item>
                )}

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        disabled={!isSignedIn}
                    >
                        Update Cell
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default Booking;
