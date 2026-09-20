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
        user: { email: 'bao@example.com', role: 'owner', fullName: 'Bảo' },
        expiresAt: Date.now() + 3600_000,
        handleLogout: () => {},
    }),
}));

// Tầng dữ liệu giờ là HTTP tới /api, không còn window.gapi.
// Mock đúng module này thay vì giả lập mạng.
jest.mock('./admin/api', () => {
    const actual = jest.requireActual('./admin/api');
    return {
        ...actual,
        getRooms: jest.fn(),
        getMonth: jest.fn(),
        getDashboard: jest.fn(),
        getAvailability: jest.fn(),
        findBooking: jest.fn(),
        createBooking: jest.fn(),
        deleteNight: jest.fn(),
        deleteBooking: jest.fn(),
        getPublicRooms: jest.fn(),
    };
});

const api = require('./admin/api');

const Home = require('./Home/Home').default;
const Booking = require('./components/Booking').default;
const MonthChecker = require('./components/MonthChecker').default;
const RoomAvailability = require('./components/RoomAvailability').default;
const DateRoomChecker = require('./components/DateRoomChecker').default;
const RemoveBooking = require('./components/RemoveBooking').default;
const Reports = require('./components/Reports').default;
const RoomGallery = require('./components/RoomGallery').default;

/* ------------------------------------------------------------------ *
 * Dữ liệu giả — đúng hình dạng mà /api trả về
 * ------------------------------------------------------------------ */

const OPTIONS = [
    { value: '1001', label: '1001 - Bungalow Bằng Lăng', type: 'bungalow' },
    { value: '1002', label: '1002 - Bungalow Nguyệt Quế', type: 'bungalow' },
    { value: '1005', label: '1005 - Phòng số 2', type: 'room' },
];

const PUBLIC_ROOMS = [
    {
        id: '1001',
        name: 'Bungalow Bằng Lăng',
        type: 'bungalow',
        bedType: '2 giường',
        pricing: { weekday: 800000, weekend: 1000000, holiday: 1500000 },
        extraPersonFee: 150000,
        currency: 'VND',
        capacity: 4,
        size: '45m²',
        description: 'Bungalow lớn nhất.',
        amenities: ['WiFi miễn phí'],
        images: ['https://example.test/a.jpg'],
        thumbnail: 'https://example.test/a-small.jpg',
    },
];

const today = dayjs();
const month = today.format('YYYY-MM');
const todayStr = today.format('YYYY-MM-DD');

const cell = (date, overrides = {}) => ({
    date: dayjs(date),
    value: '',
    kind: 'free',
    ...overrides,
});

const monthView = () => {
    const days = Array.from({ length: today.daysInMonth() }, (_, i) =>
        today.startOf('month').add(i, 'day').format('YYYY-MM-DD')
    );
    return {
        month,
        columns: days.map((date, index) => ({ date: dayjs(date), index })),
        rows: OPTIONS.map((room, roomIndex) => ({
            room,
            missing: false,
            cells: days.map((date) =>
                roomIndex === 0 && date === todayStr
                    ? cell(date, {
                          kind: 'booked',
                          value: 'Anh Minh - Đã đặt cọc - 500.000',
                          guestName: 'Anh Minh',
                          deposit: 500000,
                          nightlyRate: 800000,
                          bookingId: 'b-1',
                      })
                    : cell(date)
            ),
        })),
        counts: { free: 100, wait: 0, booked: 1, unknown: 0 },
        total: 101,
        revenue: 800000,
        perRoom: OPTIONS.map((room, i) => ({
            room,
            revenue: i === 0 ? 800000 : 0,
        })),
        nightsSold: 1,
        occupancy: 1,
    };
};

const dayRows = () => [
    {
        room: OPTIONS[0],
        kind: 'booked',
        value: 'Anh Minh - Đã đặt cọc - 500.000',
        detail: 'Anh Minh - Đã đặt cọc - 500.000',
        meta: '4 khách · 45m²',
        booking: {
            id: 'b-1',
            guestName: 'Anh Minh',
            guestPhone: null,
            note: null,
            status: 'booked',
            deposit: 500000,
            checkIn: todayStr,
            nights: 3,
        },
    },
    {
        room: OPTIONS[1],
        kind: 'free',
        value: '',
        detail: '2 khách · 30m²',
        meta: '2 khách · 30m²',
        booking: null,
    },
    {
        room: OPTIONS[2],
        kind: 'wait',
        value: 'Chị Hằng - Đang đợi đặt cọc',
        detail: 'Chị Hằng - Đang đợi đặt cọc',
        meta: '3 khách · 35m²',
        booking: {
            id: 'b-2',
            guestName: 'Chị Hằng',
            status: 'wait',
            deposit: 0,
            checkIn: todayStr,
            nights: 1,
        },
    },
];

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
    // CRA bật resetMocks:true nên phải cài lại implementation mỗi test.
    api.getRooms.mockReset().mockResolvedValue({ ok: true, options: OPTIONS });
    api.getMonth.mockReset().mockResolvedValue(monthView());
    api.getDashboard.mockReset().mockResolvedValue({
        ok: true,
        date: todayStr,
        month,
        today: dayRows(),
        summary: monthView(),
    });
    api.getAvailability
        .mockReset()
        .mockResolvedValue({ ok: true, date: todayStr, rooms: dayRows() });
    api.getPublicRooms.mockReset().mockResolvedValue(PUBLIC_ROOMS);
    api.findBooking.mockReset();
    api.createBooking.mockReset();
    api.deleteNight.mockReset();
    api.deleteBooking.mockReset();
});

afterEach(() => message.destroy());

const typeDate = (input, text) => {
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
};

/* ================================================================== */

describe('hàm thuần', () => {
    test('đọc số tiền', () => {
        expect(api.parseAmount('500.000')).toBe(500000);
        expect(api.parseAmount('500')).toBe(500000);
        expect(api.parseAmount('')).toBe(0);
    });

    test('rút gọn tên phòng', () => {
        expect(api.shortRoomName('1001 - Bungalow Bằng Lăng')).toBe(
            'Bungalow Bằng Lăng'
        );
        expect(api.shortRoomName('')).toBe('');
    });

    test('định dạng tiền', () => {
        expect(api.formatVnd(500000)).toBe('500.000₫');
        expect(api.compactVnd(24600000)).toBe('24,6tr');
        expect(api.compactVnd(600000)).toBe('600k');
    });

    test('gửi ngày lên API luôn là YYYY-MM-DD', () => {
        // Server chạy ở UTC, người dùng ở UTC+7 -> client phải nói rõ ngày.
        expect(api.toApiDate(dayjs('2026-09-12'))).toBe('2026-09-12');
        expect(api.toApiMonth(dayjs('2026-09-12'))).toBe('2026-09');
    });
});

describe('các màn hình quản lý', () => {
    test('Tổng quan hiển thị tình trạng hôm nay', async () => {
        render(<Home />);
        expect(await screen.findByText('Tình trạng hôm nay')).toBeInTheDocument();
        expect(await screen.findByText(/Anh Minh · đã cọc/)).toBeInTheDocument();
        expect(await screen.findByText(/Chị Hằng · chờ cọc/)).toBeInTheDocument();
        expect(document.querySelectorAll('.ad-row.is-free')).toHaveLength(1);

        // Ngày được gửi tường minh, không để server tự đoán.
        expect(api.getDashboard).toHaveBeenCalled();
    });

    test('Lịch tháng vẽ ma trận và mở chi tiết ô', async () => {
        render(<MonthChecker />);
        await waitFor(() =>
            expect(document.querySelector('.ad-mx__cell')).toBeInTheDocument()
        );
        expect(document.querySelectorAll('.ad-mx__row')).toHaveLength(3);

        fireEvent.click(document.querySelector('.ad-mx__cell.is-booked'));

        expect(await screen.findByText('CHI TIẾT Ô ĐANG CHỌN')).toBeInTheDocument();
        const card = document.querySelector('.ad-card');
        expect(within(card).getByText('Anh Minh')).toBeInTheDocument();
        expect(within(card).getByText('500.000₫')).toBeInTheDocument();
    });

    test('Báo cáo tính doanh thu theo phòng', async () => {
        render(<Reports />);
        expect(await screen.findByText('Doanh thu theo phòng')).toBeInTheDocument();
        expect(document.querySelectorAll('.ad-bars__fill')).toHaveLength(3);
    });

    test('Phòng trống theo ngày nhóm theo trạng thái', async () => {
        const { container } = render(<DateRoomChecker />);
        expect(screen.getByText(/Chọn một ngày rồi bấm/)).toBeInTheDocument();

        typeDate(
            container.querySelector('.ad-date input'),
            today.format('DD/MM/YYYY')
        );
        // Nút "Quét" nằm trong thanh tiêu đề, không nằm trong phần nội dung.
        fireEvent.click(container.querySelector('.ad-top__actions .ad-btn--accent'));

        expect(await screen.findByText('Phòng trống')).toBeInTheDocument();
        expect(screen.getByText('Đã đặt')).toBeInTheDocument();
        expect(screen.getByText('Đang đợi cọc')).toBeInTheDocument();
    });

    test('Kiểm tra phòng yêu cầu chọn phòng trước', async () => {
        const { container } = render(<RoomAvailability />);
        fireEvent.click(container.querySelector('.ad-content .ad-btn--accent'));
        expect(await screen.findByText('Vui lòng chọn phòng')).toBeInTheDocument();
        expect(api.getAvailability).not.toHaveBeenCalled();
    });
});

describe('luồng ghi dữ liệu', () => {
    test('Đặt phòng gửi đúng dữ liệu lên API', async () => {
        api.createBooking.mockResolvedValue({
            ok: true,
            bookingIds: ['b-9'],
            nightsWritten: 3,
        });

        const { container } = render(<Booking />);

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
            container.querySelector('input[placeholder="0903 664 474"]'),
            { target: { value: '0912345678' } }
        );
        fireEvent.change(container.querySelector('input[placeholder="500.000"]'), {
            target: { value: '700.000' },
        });

        fireEvent.click(screen.getByText('Lưu đặt phòng'));

        await waitFor(() => expect(api.createBooking).toHaveBeenCalled());
        const payload = api.createBooking.mock.calls[0][0];
        expect(payload.roomIds).toEqual(['1001']);
        expect(payload.checkIn).toBe(todayStr);
        expect(payload.guestName).toBe('Chị Vy');
        expect(payload.guestPhone).toBe('0912345678');
        expect(payload.status).toBe('booked');
        expect(payload.deposit).toBe(700000);
        expect(payload.overwrite).toBe(false); // lần đầu KHÔNG ghi đè
    });

    test('Đặt phòng: xung đột phải hỏi trước, ghi đè phải kèm token', async () => {
        api.createBooking
            .mockResolvedValueOnce({
                ok: false,
                code: 'conflict',
                conflictToken: 'tok-abc',
                conflicts: [
                    {
                        roomCode: '1001',
                        date: todayStr,
                        guestName: 'Anh Minh',
                        status: 'booked',
                    },
                ],
            })
            .mockResolvedValueOnce({ ok: true, nightsWritten: 1 });

        const { container } = render(<Booking />);

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
        fireEvent.change(container.querySelector('input[placeholder="500.000"]'), {
            target: { value: '700.000' },
        });

        fireEvent.click(screen.getByText('Lưu đặt phòng'));

        // Hộp xác nhận hiện ra, chưa ghi gì thêm
        const overwrite = await screen.findByText('Ghi đè tất cả');
        expect(api.createBooking).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Anh Minh/)).toBeInTheDocument();

        fireEvent.click(overwrite);

        await waitFor(() => expect(api.createBooking).toHaveBeenCalledTimes(2));
        const second = api.createBooking.mock.calls[1][0];
        expect(second.overwrite).toBe(true);
        // Token của lần 1 phải được gửi lại, nếu không máy chủ có thể xoá
        // nhầm booking mà người dùng chưa từng nhìn thấy.
        expect(second.conflictToken).toBe('tok-abc');
    });

    test('Xoá đặt phòng: tìm rồi xoá đúng một đêm', async () => {
        api.findBooking.mockResolvedValue({
            ok: true,
            found: true,
            room: OPTIONS[0],
            date: todayStr,
            value: 'Anh Minh - Đã đặt cọc - 500.000',
            booking: {
                id: 'b-1',
                guestName: 'Anh Minh',
                status: 'booked',
                deposit: 500000,
                checkIn: todayStr,
                nights: 3,
            },
        });
        api.deleteNight.mockResolvedValue({
            ok: true,
            bookingDeleted: false,
            nightsLeft: 2,
        });

        const { container } = render(<RemoveBooking />);

        await waitFor(() =>
            expect(container.querySelectorAll('select option').length).toBeGreaterThan(1)
        );
        fireEvent.change(container.querySelector('select'), {
            target: { value: '1001' },
        });
        typeDate(
            container.querySelector('.ad-date input'),
            today.format('DD/MM/YYYY')
        );
        fireEvent.click(screen.getByText('Tìm booking'));

        expect(await screen.findByText('TÌM THẤY BOOKING')).toBeInTheDocument();

        // Kỳ 3 đêm -> phải có cả lựa chọn xoá cả kỳ
        expect(screen.getByText('Xoá cả 3 đêm')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Xoá đêm này'));
        fireEvent.click(await screen.findByText('Xoá', { selector: '.ad-btn' }));

        await waitFor(() => expect(api.deleteNight).toHaveBeenCalled());
        expect(api.deleteNight).toHaveBeenCalledWith('1001', expect.anything());
        expect(api.deleteBooking).not.toHaveBeenCalled();
    });
});

describe('trang landing công khai', () => {
    // Trước đây danh sách phòng là hằng số biên dịch sẵn nên luôn tồn tại.
    // Giờ nó đến từ /api nên lần render đầu tiên mảng còn rỗng — chính chỗ
    // này từng làm trang /rooms sập với "Cannot read properties of undefined".
    test('không sập khi dữ liệu phòng chưa về', async () => {
        api.getPublicRooms.mockReturnValue(new Promise(() => {})); // treo mãi
        render(<RoomGallery />);
        expect(
            await screen.findByText(/Đang tải danh sách phòng/)
        ).toBeInTheDocument();
        // Phần tĩnh của trang vẫn phải hiện bình thường
        expect(screen.getByText('Tìm đến đồi')).toBeInTheDocument();
    });

    test('hiện tên phòng sau khi dữ liệu về', async () => {
        render(<RoomGallery />);
        expect(
            await screen.findByRole('heading', { name: 'Bungalow Bằng Lăng' })
        ).toBeInTheDocument();
        // "4 khách" có ở cả thẻ phòng lẫn dòng mô tả -> chỉ xét dòng mô tả
        expect(document.querySelector('.bl-rooms__meta').textContent).toMatch(
            /4 khách/
        );
        expect(
            screen.queryByText(/Đang tải danh sách phòng/)
        ).not.toBeInTheDocument();
    });

    // Mỗi ký tự của wordmark là một <span> riêng để chạy animation. Nếu không
    // gom theo từ, trình duyệt ngắt dòng được ở giữa từ ("BẰNG LĂNG H / ILL").
    test('wordmark gom theo từ để không ngắt giữa chừng', async () => {
        render(<RoomGallery />);
        await screen.findByText('Tìm đến đồi');

        const words = [...document.querySelectorAll('.bl-wordmark__word')];
        expect(words.map((w) => w.textContent)).toEqual([
            'BẰNG',
            'LĂNG',
            'HILL',
        ]);

        // Độ trễ animation vẫn tăng liên tục xuyên qua các từ
        const chars = [...document.querySelectorAll('.bl-wordmark__char')];
        expect(chars).toHaveLength(12);
        const delays = chars.map((c) =>
            parseFloat(c.style.animationDelay)
        );
        expect(delays).toEqual([...delays].sort((a, b) => a - b));
    });

    test('gọi API hỏng thì báo lỗi kèm nút thử lại, không sập', async () => {
        api.getPublicRooms.mockRejectedValue(new Error('mạng lỗi'));
        render(<RoomGallery />);
        expect(
            await screen.findByText(/Không tải được danh sách phòng/)
        ).toBeInTheDocument();
        expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });
});
