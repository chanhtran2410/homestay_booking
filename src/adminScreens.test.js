import '@testing-library/jest-dom';
import React from 'react';
import {
    render,
    screen,
    fireEvent,
    waitFor,
    within,
} from '@testing-library/react';
import dayjs from 'dayjs';
import { message } from 'antd';

const mockApiCall = jest.fn((fn) => fn());
const mockLogout = jest.fn();

// react-router-dom v7 chỉ khai báo "exports" map, jest 27 của CRA không phân giải được.
jest.mock(
    'react-router-dom',
    () => ({
        useNavigate: () => () => {},
        useLocation: () => ({ pathname: '/' }),
    }),
    { virtual: true }
);

jest.mock('./App', () => ({
    useAuth: () => ({
        isSignedIn: true,
        user: { email: 'bao@gmail.com' },
        loginTime: Date.now(),
        makeApiCall: mockApiCall,
        handleLogout: mockLogout,
    }),
}));

const Home = require('./Home/Home').default;
const Booking = require('./components/Booking').default;
const MonthChecker = require('./components/MonthChecker').default;
const RoomAvailability = require('./components/RoomAvailability').default;
const DateRoomChecker = require('./components/DateRoomChecker').default;
const RemoveBooking = require('./components/RemoveBooking').default;
const Reports = require('./components/Reports').default;
const { classify, parseCell, parseAmount } = require('./admin/sheets');
const { readMonth } = require('./admin/revenue');

// --- bảng tính giả: 6 phòng × mọi ngày của tháng hiện tại ------------------
const month = dayjs();
const days = Array.from({ length: month.endOf('month').date() }, (_, i) =>
    month.startOf('month').date(i + 1)
);
const headers = ['Tên phòng', 'Mã', ...days.map((d) => d.format('DD/MM/YYYY'))];

const today = dayjs();
const todayCol = 2 + (today.date() - 1);

const blank = () => days.map(() => '');

const rows = [
    ['Bungalow Bằng Lăng', '1001', ...blank()],
    ['Bungalow Nguyệt Quế', '1002', ...blank()],
    ['Bungalow Giáng Hương', '1003', ...blank()],
    ['Phòng số 2', '1005', ...blank()],
    ['Phòng số 3', '1006', ...blank()],
    // 1004 cố tình thiếu -> phải rơi vào nhóm "Không rõ"
];
rows[0][todayCol] = 'Anh Minh - Đã đặt cọc - 500.000';
rows[1][todayCol] = 'Chị Hằng - Đang đợi đặt cọc';

const SHEET = [headers, ...rows];

beforeAll(() => {
    window.matchMedia =
        window.matchMedia ||
        ((query) => ({
            matches: false,
            media: query,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }));
});

beforeEach(() => {
    mockApiCall.mockReset();
    mockApiCall.mockImplementation((fn) => fn());
    window.gapi = {
        client: {
            sheets: {
                spreadsheets: {
                    values: {
                        get: jest.fn(async () => ({
                            result: { values: SHEET },
                        })),
                        update: jest.fn(async () => ({})),
                    },
                    batchUpdate: jest.fn(async () => ({})),
                },
            },
        },
    };
});


// Nhập ngày vào DatePicker của antd.
const typeDate = (input, text) => {
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
};

const draw = (ui) => render(ui);

afterEach(() => message.destroy());

/* ========================================================================== */

describe('logic dùng chung', () => {
    test('phân loại nội dung ô', () => {
        expect(classify('')).toBe('free');
        expect(classify('   ')).toBe('free');
        expect(classify('Anh Minh - Đã đặt cọc - 500.000')).toBe('booked');
        expect(classify('Chị Hằng - Đang đợi đặt cọc')).toBe('wait');
        expect(classify('Chị Hằng - chờ cọc')).toBe('wait');
    });

    test('tách tên khách và tiền cọc', () => {
        const parsed = parseCell('Anh Minh - Đã đặt cọc - 500.000');
        expect(parsed.customerName).toBe('Anh Minh');
        expect(parsed.deposit).toBe('500.000');
        expect(parsed.status).toBe('Đã đặt cọc');
    });

    test('đọc số tiền', () => {
        expect(parseAmount('500.000')).toBe(500000);
        expect(parseAmount('500')).toBe(500000);
        expect(parseAmount('')).toBe(0);
    });

    test('tổng hợp tháng: đếm ô và tính doanh thu', () => {
        const view = readMonth(SHEET, headers, month);
        expect(view.rows).toHaveLength(6);
        expect(view.columns).toHaveLength(days.length);

        // phòng 1004 không có trong bảng tính -> cả tháng là "không rõ"
        expect(view.counts.unknown).toBe(days.length);
        expect(view.counts.booked).toBe(1);
        expect(view.counts.wait).toBe(1);

        // doanh thu = giá 1 đêm của 1001 theo thứ trong tuần
        const weekend = today.day() === 0 || today.day() === 6;
        expect(view.revenue).toBe(weekend ? 1000000 : 800000);
        expect(view.nightsSold).toBe(1);
    });
});

describe('các màn hình quản lý', () => {
    test('Tổng quan hiển thị tình trạng hôm nay', async () => {
        draw(<Home />);
        expect(await screen.findByText('Tình trạng hôm nay')).toBeInTheDocument();
        expect(await screen.findByText(/Anh Minh · đã cọc/)).toBeInTheDocument();
        expect(await screen.findByText(/Chị Hằng · chờ cọc/)).toBeInTheDocument();
        // 3 phòng trống + 1 phòng không có trong sheet
        expect(document.querySelectorAll('.ad-row.is-free')).toHaveLength(3);
        expect(document.querySelectorAll('.ad-row.is-unknown')).toHaveLength(1);
    });

    test('Lịch tháng vẽ ma trận và mở chi tiết ô', async () => {
        draw(<MonthChecker />);
        await waitFor(() =>
            expect(document.querySelector('.ad-mx__cell')).toBeInTheDocument()
        );
        expect(document.querySelectorAll('.ad-mx__row')).toHaveLength(6);

        const booked = document.querySelector('.ad-mx__cell.is-booked');
        expect(booked).toBeInTheDocument();
        fireEvent.click(booked);

        expect(await screen.findByText('CHI TIẾT Ô ĐANG CHỌN')).toBeInTheDocument();
        // "Anh Minh" có ở cả ô trong lịch lẫn thẻ chi tiết -> chỉ xét thẻ chi tiết
        const card = document.querySelector('.ad-card');
        expect(within(card).getByText('Anh Minh')).toBeInTheDocument();
        expect(within(card).getByText('500.000₫')).toBeInTheDocument();
        expect(within(card).getByText('1001 - Bungalow Bằng Lăng')).toBeInTheDocument();
    });

    test('Báo cáo tính doanh thu theo phòng', async () => {
        draw(<Reports />);
        expect(await screen.findByText('Doanh thu theo phòng')).toBeInTheDocument();
        expect(document.querySelectorAll('.ad-bars__fill')).toHaveLength(6);
    });

    test('Đặt phòng: chọn phòng, xem trước, chặn thiếu dữ liệu', async () => {
        draw(<Booking />);

        fireEvent.click(screen.getByText('+ Chọn phòng'));
        fireEvent.click(await screen.findByText('1001 - Bungalow Bằng Lăng'));
        fireEvent.click(screen.getByText(/^Xong/));

        expect(await screen.findByText(/1 ô/)).toBeInTheDocument();

        // chưa chọn ngày -> không được gọi API
        fireEvent.click(screen.getByText(/Ghi vào Sheet1/));
        await waitFor(() =>
            expect(
                screen.getByText('Vui lòng chọn ngày nhận phòng')
            ).toBeInTheDocument()
        );
        expect(window.gapi.client.sheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });

    test('Kiểm tra phòng yêu cầu chọn phòng trước', async () => {
        const { container } = draw(<RoomAvailability />);
        fireEvent.click(container.querySelector('.ad-content .ad-btn--accent'));
        expect(await screen.findByText('Vui lòng chọn phòng')).toBeInTheDocument();
    });

    test('Phòng trống theo ngày hiện trạng thái rỗng ban đầu', () => {
        draw(<DateRoomChecker />);
        expect(
            screen.getByText(/Chọn một ngày rồi bấm/)
        ).toBeInTheDocument();
    });

    test('Xoá đặt phòng yêu cầu chọn phòng trước', async () => {
        draw(<RemoveBooking />);
        fireEvent.click(screen.getByText('Tìm booking'));
        expect(await screen.findByText('Vui lòng chọn phòng')).toBeInTheDocument();
        expect(
            window.gapi.client.sheets.spreadsheets.values.update
        ).not.toHaveBeenCalled();
    });
    test('Đặt phòng ghi đúng chuỗi xuống Sheet', async () => {
        const { container } = draw(<Booking />);

        fireEvent.click(screen.getByText('+ Chọn phòng'));
        fireEvent.click(await screen.findByText('1001 - Bungalow Bằng Lăng'));
        fireEvent.click(screen.getByText(/^Xong/));

        typeDate(
            container.querySelector('.ad-date input'),
            today.format('DD/MM/YYYY')
        );
        fireEvent.change(
            container.querySelector('input[placeholder="Ví dụ: Anh Minh"]'),
            { target: { value: 'Chị Vy' } }
        );
        fireEvent.change(
            container.querySelector('input[placeholder="500.000"]'),
            { target: { value: '700.000' } }
        );

        fireEvent.click(screen.getByText(/Ghi vào Sheet1/));

        // ô hôm nay của 1001 đã có khách -> phải hỏi ghi đè trước
        const overwrite = await screen.findByText('Ghi đè tất cả');
        expect(
            window.gapi.client.sheets.spreadsheets.batchUpdate
        ).not.toHaveBeenCalled();

        fireEvent.click(overwrite);

        await waitFor(() =>
            expect(
                window.gapi.client.sheets.spreadsheets.batchUpdate
            ).toHaveBeenCalled()
        );
        const [[args]] =
            window.gapi.client.sheets.spreadsheets.batchUpdate.mock.calls;
        const requests = args.resource.requests;
        expect(requests).toHaveLength(1);
        expect(
            requests[0].updateCells.rows[0].values[0].userEnteredValue
                .stringValue
        ).toBe('Chị Vy - Đã đặt cọc - 700.000');
        expect(requests[0].updateCells.range.startRowIndex).toBe(1); // hàng 1001
        expect(requests[0].updateCells.range.startColumnIndex).toBe(todayCol);
    });

    test('Xoá đặt phòng ghi rỗng đúng ô', async () => {
        const { container } = draw(<RemoveBooking />);

        fireEvent.change(container.querySelector('select'), {
            target: { value: '1001' },
        });
        typeDate(
            container.querySelector('.ad-date input'),
            today.format('DD/MM/YYYY')
        );
        fireEvent.click(screen.getByText('Tìm booking'));

        expect(await screen.findByText('TÌM THẤY BOOKING')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Xoá booking này'));

        fireEvent.click(await screen.findByText('Xoá', { selector: '.ad-btn' }));

        await waitFor(() =>
            expect(
                window.gapi.client.sheets.spreadsheets.values.update
            ).toHaveBeenCalled()
        );
        const [[args]] =
            window.gapi.client.sheets.spreadsheets.values.update.mock.calls;
        expect(args.resource.values).toEqual([['']]);
        expect(args.range).toMatch(/^Sheet1![A-Z]+2$/); // 1001 nằm ở hàng 2
    });
});
