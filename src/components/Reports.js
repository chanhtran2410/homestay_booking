import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../App';
import AdminShell from '../admin/AdminShell';
import { Btn, Loading } from '../admin/ui';
import {
    compactVnd,
    formatVnd,
    readSheet,
    SHEET_NAME,
    SHEET_URL,
} from '../admin/sheets';
import { readMonth } from '../admin/revenue';

const csvEscape = (cell) => `"${String(cell).replace(/"/g, '""')}"`;

const Reports = () => {
    const { isSignedIn, makeApiCall } = useAuth();
    const [month, setMonth] = useState(dayjs());
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState(null);

    const load = useCallback(
        async (target) => {
            setLoading(true);
            try {
                const { data, headers } = await readSheet(makeApiCall);
                setView(readMonth(data, headers, target));
            } catch (error) {
                console.error('Error loading report:', error);
                message.error(
                    error.message || 'Lỗi khi tải báo cáo. Vui lòng thử lại.'
                );
            } finally {
                setLoading(false);
            }
        },
        [makeApiCall]
    );

    useEffect(() => {
        if (isSignedIn) load(month);
    }, [isSignedIn, month, load]);

    const exportCsv = useCallback(() => {
        if (!view) return;
        const rows = [
            ['Phòng', 'Mã', 'Đêm đã cọc', 'Doanh thu (VND)'],
            ...view.perRoom.map(({ room, revenue }) => [
                room.label.split(' - ')[1] || room.label,
                room.value,
                view.rows.find((r) => r.room.value === room.value).cells.filter(
                    (cell) => cell.kind === 'booked'
                ).length,
                revenue,
            ]),
            [],
            ['Tổng doanh thu', '', view.nightsSold, view.revenue],
        ];
        const csv =
            '﻿' + rows.map((row) => row.map(csvEscape).join(',')).join('\n');
        const url = URL.createObjectURL(
            new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `bang-lang-hill-${month.format('YYYY-MM')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [view, month]);

    const monthPicker = (
        <DatePicker
            picker="month"
            value={month}
            onChange={(value) => value && setMonth(value)}
            format="MM/YYYY"
            allowClear={false}
            className="ad-date"
        />
    );

    const top = view ? view.perRoom[0]?.revenue || 0 : 0;

    return (
        <AdminShell
            back
            dark
            eyebrow="BÁO CÁO"
            title={`Tháng ${month.format('M')} · ${month.format('YYYY')}`}
            actions={monthPicker}
            headerExtra={
                <>
                    <div style={{ marginTop: 14 }}>{monthPicker}</div>
                    <div className="ad-stats" style={{ marginTop: 14 }}>
                        <div className="ad-stat">
                            <div className="ad-stat__k">Doanh thu</div>
                            <div className="ad-stat__v ad-num">
                                {view ? compactVnd(view.revenue) : '—'}
                            </div>
                        </div>
                        <div className="ad-stat">
                            <div className="ad-stat__k">Lấp phòng</div>
                            <div className="ad-stat__v ad-num">
                                {view ? `${view.occupancy}%` : '—'}
                            </div>
                        </div>
                        <div className="ad-stat">
                            <div className="ad-stat__k">Đêm bán</div>
                            <div className="ad-stat__v ad-num">
                                {view ? view.nightsSold : '—'}
                            </div>
                        </div>
                    </div>
                </>
            }
        >
            {loading || !view ? (
                <Loading label="Đang tính báo cáo…" />
            ) : (
                <>
                    <div className="ad-stats ad-stats--top" data-reveal>
                        <div className="ad-stat ad-stat--dark">
                            <div className="ad-stat__k">Doanh thu tháng</div>
                            <div className="ad-stat__v ad-num">
                                {compactVnd(view.revenue)}
                            </div>
                        </div>
                        <div className="ad-stat">
                            <div className="ad-stat__k">Lấp phòng</div>
                            <div className="ad-stat__v ad-num">
                                {view.occupancy}%
                            </div>
                        </div>
                        <div className="ad-stat">
                            <div className="ad-stat__k">Đêm bán</div>
                            <div className="ad-stat__v ad-num">
                                {view.nightsSold}
                            </div>
                        </div>
                        <div className="ad-stat ad-stat--wait">
                            <div className="ad-stat__k">Đang đợi cọc</div>
                            <div className="ad-stat__v ad-num">
                                {view.counts.wait}
                            </div>
                        </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 18 }}>
                        Doanh thu theo phòng
                    </div>
                    <div className="ad-bars" data-reveal>
                        {view.perRoom.map(({ room, revenue }, index) => (
                            <div key={room.value}>
                                <div className="ad-bars__head">
                                    <span>
                                        {room.label.split(' - ')[1] ||
                                            room.label}
                                    </span>
                                    <span className="ad-bars__amt ad-num">
                                        {formatVnd(revenue)}
                                    </span>
                                </div>
                                <div className="ad-bars__track">
                                    <div
                                        className={`ad-bars__fill${
                                            index > 2
                                                ? ' ad-bars__fill--alt'
                                                : ''
                                        }`}
                                        style={{
                                            width: `${
                                                top
                                                    ? Math.round(
                                                          (revenue / top) * 100
                                                      )
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="ad-card" style={{ marginTop: 22 }} data-reveal>
                        <div className="ad-card__k">GHI CHÚ</div>
                        <p
                            className="ad-hint"
                            style={{ marginTop: 9, lineHeight: 1.7 }}
                        >
                            Số liệu tính từ các ô có trạng thái “Đã đặt cọc”
                            trên {SHEET_NAME}, theo bảng giá ngày thường / cuối
                            tuần của từng phòng. Bảng tính không đánh dấu ngày
                            lễ nên giá lễ chưa được áp dụng.
                        </p>
                    </div>

                    <div className="ad-actions" data-reveal>
                        <Btn variant="primary" grow onClick={exportCsv}>
                            Xuất CSV
                        </Btn>
                        <Btn
                            variant="quiet"
                            onClick={() =>
                                window.open(
                                    SHEET_URL,
                                    '_blank',
                                    'noopener,noreferrer'
                                )
                            }
                        >
                            Mở Sheet
                        </Btn>
                    </div>
                </>
            )}
        </AdminShell>
    );
};

export default Reports;
