import React, { useCallback, useState } from 'react';
import { message } from 'antd';
import { useAuth } from '../App';
import AdminShell from '../admin/AdminShell';
import { Btn, DateField, useBusy } from '../admin/ui';
import {
    availableDates,
    cellAt,
    findDateColumn,
    findRoomRow,
    readSheet,
    classify,
} from '../admin/sheets';
import { ROOM_OPTIONS } from '../constants/roomOptions';
import { getRoomById } from '../constants/roomData';

const GROUPS = [
    { kind: 'free', label: 'Phòng trống', icon: '✓' },
    { kind: 'wait', label: 'Đang đợi cọc', icon: '◐' },
    { kind: 'booked', label: 'Đã đặt', icon: '●' },
    { kind: 'unknown', label: 'Không rõ', icon: '?' },
];

const roomMeta = (room) => {
    const detail = getRoomById(room.value);
    if (!detail) return room.type === 'bungalow' ? 'Bungalow' : 'Phòng';
    return `${detail.capacity} khách · ${detail.size}`;
};

const DateRoomChecker = () => {
    const { makeApiCall } = useAuth();
    const [date, setDate] = useState(null);
    const [rows, setRows] = useState([]);
    const [scannedDate, setScannedDate] = useState('');
    const [busy, run] = useBusy();

    const onScan = useCallback(async () => {
        if (!date) {
            message.error('Vui lòng chọn ngày');
            return;
        }

        await run(async () => {
            setRows([]);
            try {
                const { data, headers } = await readSheet(makeApiCall);
                const { index: dateIndex, format } = findDateColumn(
                    headers,
                    date
                );

                if (dateIndex === -1) {
                    message.error(
                        `Không tìm thấy ngày trong bảng tính. Các cột đang có: ${availableDates(
                            headers
                        )
                            .slice(0, 12)
                            .join(', ')}`
                    );
                    return;
                }

                const scanned = ROOM_OPTIONS.map((room) => {
                    const roomRowIndex = findRoomRow(data, room.value);
                    if (roomRowIndex === -1) {
                        return {
                            room,
                            kind: 'unknown',
                            detail: `Không có mã ${room.value} trong bảng tính`,
                        };
                    }
                    const value = cellAt(data, roomRowIndex, dateIndex);
                    const kind = classify(value);
                    return {
                        room,
                        kind,
                        detail: kind === 'free' ? roomMeta(room) : value,
                    };
                });

                setRows(scanned);
                setScannedDate(format || date.format('DD/MM/YYYY'));

                const free = scanned.filter((r) => r.kind === 'free').length;
                const busyCount = scanned.filter(
                    (r) => r.kind === 'booked' || r.kind === 'wait'
                ).length;
                message.success(
                    `Đã quét ${scanned.length} phòng: ${free} trống, ${busyCount} đã đặt`
                );
            } catch (error) {
                console.error('Error checking rooms:', error);
                message.error(
                    error.message || 'Lỗi khi kiểm tra phòng. Vui lòng thử lại.'
                );
            }
        });
    }, [date, makeApiCall, run]);

    const headerExtra = (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <DateField value={date} onChange={setDate} />
            </div>
            <Btn
                variant="accent"
                size="sm"
                loading={busy}
                onClick={onScan}
                style={{ borderRadius: 12 }}
            >
                {busy ? 'Đang quét…' : 'Quét'}
            </Btn>
        </div>
    );

    return (
        <AdminShell
            back
            eyebrow="QUÉT CẢ 6 PHÒNG"
            title="Phòng trống theo ngày"
            headerExtra={headerExtra}
            actions={
                <>
                    <div style={{ minWidth: 200 }}>
                        <DateField value={date} onChange={setDate} />
                    </div>
                    <Btn variant="accent" size="sm" loading={busy} onClick={onScan}>
                        {busy ? 'Đang quét…' : 'Quét'}
                    </Btn>
                </>
            }
        >
            {rows.length === 0 ? (
                <div className="ad-empty">
                    Chọn một ngày rồi bấm “Quét” để xem tình trạng cả 6 phòng.
                </div>
            ) : (
                <>
                    <p className="ad-hint ad-num" style={{ marginBottom: 4 }}>
                        Kết quả ngày {scannedDate}
                    </p>
                    {GROUPS.map(({ kind, label, icon }) => {
                        const group = rows.filter((row) => row.kind === kind);
                        if (!group.length) return null;
                        return (
                            <div key={kind}>
                                <div className={`ad-group`}>
                                    <span
                                        style={{
                                            color: `var(--ad-${
                                                kind === 'booked'
                                                    ? 'book'
                                                    : kind === 'unknown'
                                                    ? 'unk'
                                                    : kind
                                            }-fg)`,
                                        }}
                                    >
                                        {label}
                                    </span>
                                    <span className={`ad-count is-${kind}`}>
                                        {group.length}
                                    </span>
                                </div>
                                <div className="ad-list" data-reveal>
                                    {group.map(({ room, detail }) => (
                                        <div key={room.value} className="ad-row">
                                            <span
                                                className={`ad-row__ico is-${kind}`}
                                            >
                                                {icon}
                                            </span>
                                            <span className="ad-row__main">
                                                <span className="ad-row__name">
                                                    {room.label.split(
                                                        ' - '
                                                    )[1] || room.label}
                                                </span>
                                                <span className="ad-row__meta">
                                                    {detail}
                                                </span>
                                            </span>
                                            <span className="ad-row__side">
                                                {room.type === 'bungalow'
                                                    ? 'Bungalow'
                                                    : 'Phòng'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </AdminShell>
    );
};

export default DateRoomChecker;
