import { ROOM_OPTIONS } from '../constants/roomOptions';
import { getRoomById } from '../constants/roomData';
import { classify, findRoomRow } from './sheets';

// Bảng tính không đánh dấu ngày lễ, nên chỉ phân biệt ngày thường / cuối tuần.
const nightPrice = (roomId, date) => {
    const room = getRoomById(roomId);
    if (!room) return 0;
    const dow = date.day(); // 0 = CN, 6 = T7
    return dow === 0 || dow === 6
        ? room.pricing.weekend
        : room.pricing.weekday;
};

// Lưới ngày trong tháng kèm mọi định dạng tiêu đề có thể khớp.
export const monthDays = (month) => {
    const days = [];
    const total = month.endOf('month').date();
    for (let day = 1; day <= total; day += 1) {
        days.push(month.startOf('month').date(day));
    }
    return days;
};

// Chỉ số cột của từng ngày trong tháng, -1 nếu bảng tính không có cột đó.
export const monthColumns = (headers, month) =>
    monthDays(month).map((date) => {
        const candidates = [
            date.format('DD/MM/YYYY'),
            date.format('D/M/YYYY'),
            date.format('DD/MM'),
            date.format('D/M'),
            date.format('MM/DD/YYYY'),
            date.format('M/D/YYYY'),
        ];
        for (const candidate of candidates) {
            const index = headers.indexOf(candidate);
            if (index !== -1) return { date, index };
        }
        return { date, index: -1 };
    });

/**
 * Đọc toàn bộ tháng: trạng thái từng ô, số liệu tổng hợp và doanh thu.
 * Doanh thu chỉ tính các ô "đã đặt cọc" theo bảng giá của từng phòng.
 */
export const readMonth = (data, headers, month) => {
    const columns = monthColumns(headers, month);

    const rows = ROOM_OPTIONS.map((room) => {
        const rowIndex = findRoomRow(data, room.value);
        const missing = rowIndex === -1;
        const cells = columns.map(({ date, index }) => {
            const value = missing || index === -1
                ? ''
                : data?.[rowIndex]?.[index] || '';
            return {
                date,
                value,
                kind: missing ? 'unknown' : classify(value),
            };
        });
        return { room, missing, cells };
    });

    const counts = { free: 0, wait: 0, booked: 0, unknown: 0 };
    let revenue = 0;
    const perRoom = [];

    rows.forEach(({ room, cells }) => {
        let roomRevenue = 0;
        cells.forEach((cell) => {
            counts[cell.kind] += 1;
            if (cell.kind === 'booked') {
                roomRevenue += nightPrice(room.value, cell.date);
            }
        });
        revenue += roomRevenue;
        perRoom.push({ room, revenue: roomRevenue });
    });

    const total = rows.length * columns.length;

    return {
        columns,
        rows,
        counts,
        total,
        revenue,
        perRoom: perRoom.sort((a, b) => b.revenue - a.revenue),
        nightsSold: counts.booked,
        occupancy: total ? Math.round((counts.booked / total) * 100) : 0,
    };
};
