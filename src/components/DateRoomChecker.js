import React, { useCallback, useState } from 'react';
import { message } from 'antd';
import AdminShell from '../admin/AdminShell';
import { Btn, DateField, useBusy } from '../admin/ui';
import { getAvailability, toApiDate, shortRoomName } from '../admin/api';

const GROUPS = [
    { kind: 'free', label: 'Phòng trống', icon: '✓' },
    { kind: 'wait', label: 'Đang đợi cọc', icon: '◐' },
    { kind: 'booked', label: 'Đã đặt', icon: '●' },
    { kind: 'unknown', label: 'Không rõ', icon: '?' },
];

// Tên biến màu trong admin.css không trùng khít với tên bucket.
const FG = { free: 'free', wait: 'wait', booked: 'book', unknown: 'unk' };

const DateRoomChecker = () => {
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
                const data = await getAvailability(date);
                setRows(data.rooms);
                setScannedDate(toApiDate(date));

                const free = data.rooms.filter((r) => r.kind === 'free').length;
                const taken = data.rooms.filter(
                    (r) => r.kind === 'booked' || r.kind === 'wait'
                ).length;
                message.success(
                    `Đã quét ${data.rooms.length} phòng: ${free} trống, ${taken} đã đặt`
                );
            } catch (error) {
                console.error('Error checking rooms:', error);
                message.error(
                    error.message || 'Lỗi khi kiểm tra phòng. Vui lòng thử lại.'
                );
            }
        });
    }, [date, run]);

    return (
        <AdminShell
            back
            eyebrow="QUÉT CẢ 6 PHÒNG"
            title="Phòng trống theo ngày"
            headerExtra={
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
            }
            actions={
                <>
                    <div style={{ minWidth: 200 }}>
                        <DateField value={date} onChange={setDate} />
                    </div>
                    <Btn
                        variant="accent"
                        size="sm"
                        loading={busy}
                        onClick={onScan}
                    >
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
                                <div className="ad-group">
                                    <span
                                        style={{
                                            color: `var(--ad-${FG[kind]}-fg)`,
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
                                                    {shortRoomName(room.label)}
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
