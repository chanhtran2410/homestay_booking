import React, { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../App';
import AdminShell, { displayName } from '../admin/AdminShell';
import { Btn, Loading } from '../admin/ui';
import {
    cellLabel,
    compactVnd,
    findDateColumn,
    findRoomRow,
    parseCell,
    readSheet,
    STATUS_LABEL,
} from '../admin/sheets';
import { readMonth } from '../admin/revenue';
import { ROOM_OPTIONS } from '../constants/roomOptions';

const WEEKDAYS = [
    'CHỦ NHẬT',
    'THỨ HAI',
    'THỨ BA',
    'THỨ TƯ',
    'THỨ NĂM',
    'THỨ SÁU',
    'THỨ BẢY',
];

const Home = memo(() => {
    const navigate = useNavigate();
    const { isSignedIn, user, makeApiCall } = useAuth();

    const [loading, setLoading] = useState(true);
    const [today, setToday] = useState([]);
    const [summary, setSummary] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, headers } = await readSheet(makeApiCall);
            const now = dayjs();

            const { index: dateIndex } = findDateColumn(headers, now);
            const rows = ROOM_OPTIONS.map((room) => {
                const rowIndex = findRoomRow(data, room.value);
                if (rowIndex === -1 || dateIndex === -1) {
                    return { room, kind: 'unknown', status: STATUS_LABEL.unknown };
                }
                const value = data?.[rowIndex]?.[dateIndex] || '';
                const parsed = parseCell(value);
                return {
                    room,
                    kind: parsed.kind,
                    status:
                        parsed.kind === 'free'
                            ? STATUS_LABEL.free
                            : `${parsed.customerName || cellLabel(value)} · ${
                                  parsed.kind === 'booked'
                                      ? 'đã cọc'
                                      : 'chờ cọc'
                              }`,
                };
            });

            setToday(rows);
            setSummary(readMonth(data, headers, now));
        } catch (error) {
            console.error('Error loading dashboard:', error);
            message.error(
                error.message || 'Lỗi khi tải dữ liệu. Vui lòng thử lại.'
            );
        } finally {
            setLoading(false);
        }
    }, [makeApiCall]);

    useEffect(() => {
        if (isSignedIn) load();
    }, [isSignedIn, load]);

    const now = dayjs();
    const freeToday = today.filter((row) => row.kind === 'free').length;
    const name = displayName(user);

    const headerExtra = (
        <div className="ad-stats" style={{ marginTop: 18 }}>
            <div className="ad-stat">
                <div className="ad-stat__k">Trống hôm nay</div>
                <div className="ad-stat__v ad-num">
                    {freeToday}
                    <small>/{today.length || ROOM_OPTIONS.length}</small>
                </div>
            </div>
            <div className="ad-stat ad-stat--wait">
                <div className="ad-stat__k">Chờ cọc</div>
                <div className="ad-stat__v ad-num">
                    {summary ? summary.counts.wait : '—'}
                </div>
            </div>
            <div className="ad-stat ad-stat--book">
                <div className="ad-stat__k">Đã cọc</div>
                <div className="ad-stat__v ad-num">
                    {summary ? summary.counts.booked : '—'}
                </div>
            </div>
        </div>
    );

    return (
        <AdminShell
            dark
            eyebrow={`${WEEKDAYS[now.day()]} · ${now.format('DD/MM/YYYY')}`}
            title={`Chào ${name}`}
            headerExtra={headerExtra}
            actions={
                <Btn size="sm" onClick={() => navigate('/booking')}>
                    + Đặt phòng
                </Btn>
            }
        >
            <div className="ad-stats ad-stats--top" data-reveal>
                <div className="ad-stat ad-stat--dark">
                    <div className="ad-stat__k">Trống hôm nay</div>
                    <div className="ad-stat__v ad-num">
                        {freeToday}
                        <small>/{today.length || ROOM_OPTIONS.length}</small>
                    </div>
                </div>
                <div className="ad-stat ad-stat--book">
                    <div className="ad-stat__k">Đã đặt cọc</div>
                    <div className="ad-stat__v ad-num">
                        {summary ? summary.counts.booked : '—'}
                    </div>
                </div>
                <div className="ad-stat ad-stat--wait">
                    <div className="ad-stat__k">Đang đợi cọc</div>
                    <div className="ad-stat__v ad-num">
                        {summary ? summary.counts.wait : '—'}
                    </div>
                </div>
                <div className="ad-stat">
                    <div className="ad-stat__k">Doanh thu tháng</div>
                    <div className="ad-stat__v ad-num">
                        {summary ? compactVnd(summary.revenue) : '—'}
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    margin: '18px 0 12px',
                }}
            >
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                    Tình trạng hôm nay
                </span>
                <button
                    type="button"
                    className="ad-hint"
                    onClick={() => navigate('/month-checking')}
                >
                    Lịch tháng →
                </button>
            </div>

            {loading ? (
                <Loading />
            ) : (
                <div className="ad-list" data-reveal>
                    {today.map(({ room, kind, status }) => (
                        <button
                            key={room.value}
                            type="button"
                            className={`ad-row is-${kind}`}
                            onClick={() => navigate('/month-checking')}
                        >
                            <span className="ad-row__bar" />
                            <span className="ad-row__main">
                                <span className="ad-row__name">
                                    {room.label.split(' - ')[1] || room.label}
                                </span>
                                <span className="ad-row__meta">{status}</span>
                            </span>
                            <span className="ad-row__side ad-num">
                                {room.value}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <Btn
                variant="primary"
                block
                style={{ marginTop: 16 }}
                onClick={() => navigate('/booking')}
            >
                + Đặt phòng mới
            </Btn>
        </AdminShell>
    );
});

export default Home;
