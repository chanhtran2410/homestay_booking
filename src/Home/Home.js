import React, { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../App';
import AdminShell, { displayName } from '../admin/AdminShell';
import { Btn, Loading } from '../admin/ui';
import { compactVnd, getDashboard, shortRoomName } from '../admin/api';

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
    const { isSignedIn, user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [today, setToday] = useState([]);
    const [summary, setSummary] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Ngày do CLIENT xác định. Server chạy ở UTC nên nếu để nó tự tính
            // "hôm nay" thì từ 00:00 đến 07:00 giờ Việt Nam sẽ ra ngày hôm trước.
            const data = await getDashboard(dayjs());
            setToday(data.today);
            setSummary(data.summary);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            message.error(
                error.message || 'Lỗi khi tải dữ liệu. Vui lòng thử lại.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isSignedIn) load();
    }, [isSignedIn, load]);

    const now = dayjs();
    const freeToday = today.filter((row) => row.kind === 'free').length;
    const name = displayName(user);

    // Mô tả ngắn cho từng dòng phòng.
    const statusText = (row) => {
        if (row.kind === 'free') return 'Trống';
        if (row.kind === 'unknown') return 'Đã ngừng khai thác';
        const who = row.booking?.guestName || 'Có khách';
        return `${who} · ${row.kind === 'booked' ? 'đã cọc' : 'chờ cọc'}`;
    };

    const headerExtra = (
        <div className="ad-stats" style={{ marginTop: 18 }}>
            <div className="ad-stat">
                <div className="ad-stat__k">Trống hôm nay</div>
                <div className="ad-stat__v ad-num">
                    {freeToday}
                    <small>/{today.length || 6}</small>
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
                        <small>/{today.length || 6}</small>
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
                    {today.map((row) => (
                        <button
                            key={row.room.value}
                            type="button"
                            className={`ad-row is-${row.kind}`}
                            onClick={() => navigate('/month-checking')}
                        >
                            <span className="ad-row__bar" />
                            <span className="ad-row__main">
                                <span className="ad-row__name">
                                    {shortRoomName(row.room.label)}
                                </span>
                                <span className="ad-row__meta">
                                    {statusText(row)}
                                </span>
                            </span>
                            <span className="ad-row__side ad-num">
                                {row.room.value}
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
