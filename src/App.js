import { useEffect, useState } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';

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

const UpdateRoomBooking = () => {
    const [form] = Form.useForm();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [accessToken, setAccessToken] = useState(null);

    // Initialize Google API and Identity Services
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

                // Initialize Google Identity Services
                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: handleCredentialResponse,
                });

                console.log('Google services initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Google services:', error);
                message.error('Failed to initialize Google services');
            }
        };

        initializeGoogleServices();
    }, []);

    const handleCredentialResponse = (response) => {
        console.log('Credential response:', response);
        // This handles the ID token, but we need an access token for API calls
    };

    const handleLogin = async () => {
        try {
            // Use Google Identity Services for OAuth2 with access token
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

                    // Set the access token for gapi requests
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

    const onFinish = async ({ date, roomId, value }) => {
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

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range,
                valueInputOption: 'RAW',
                resource: {
                    values: [[value]],
                },
            });

            message.success('Booking updated successfully!');
            form.resetFields();
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
                    name="value"
                    label="Value to update in the cell"
                    rules={[
                        { required: true, message: 'Please enter a value' },
                    ]}
                >
                    <Input placeholder="e.g. mh - đã nhận cọc - 500" />
                </Form.Item>

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

export default UpdateRoomBooking;
