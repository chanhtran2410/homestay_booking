import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../App';
import AdminShell from '../admin/AdminShell';
import { Loading } from '../admin/ui';
import {
    cellLabel,
    formatVnd,
    parseAmount,
    parseCell,
    readSheet,
} from '../admin/sheets';
import { readMonth } from '../admin/revenue';

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const LEGEND = [
    { kind: 'free', label: 'Trống' },
    { kind: 'wait', label: 'Chờ cọc' },
    { kind: 'booked', label: 'Đã cọc' },
    { kind: 'unknown', label: 'Không rõ' },
];

const MonthChecker = () => {
    const { isSignedIn, makeApiCall } = useAuth();
    const [month, setMonth] = useState(dayjs());
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState(null);
    const [selected, setSelected] = useState(null);

    const load = useCallback(
        async (target) => {
            setLoading(true);
            setSelected(null);
            try {
                const { data, headers } = await readSheet(makeApiCall);
                setView(readMonth(data, headers, target));
            } catch (error) {
                console.error('Error loading month data:', error);
                message.error(
                    error.message ||
                        'Lỗi khi tải dữ liệu tháng. Vui lòng thử lại.'
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

    const today = dayjs();
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

    const headerExtra = (
        <>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginTop: 12,
                }}
            >
                {monthPicker}
                <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                    <button
                        type="button"
                        className="ad-back"
                        aria-label="Tháng trước"
                        onClick={() => setMonth(month.subtract(1, 'month'))}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="ad-back"
                        aria-label="Tháng sau"
                        onClick={() => setMonth(month.add(1, 'month'))}
                    >
                        ›
                    </button>
                </div>
            </div>
            {view && (
                <div className="ad-legend">
                    {LEGEND.map(({ kind, label }) => (
                        <span key={kind}>
                            <i className={`ad-bar is-${kind}`} />
                            {label} {view.counts[kind]}
                        </span>
                    ))}
                </div>
            )}
        </>
    );

    const detail = selected ? parseCell(selected.cell.value) : null;

    return (
        <AdminShell
            back
            flush
            eyebrow="QUẢN LÝ · LỊCH THÁNG"
            title={`Tháng ${month.format('M')} · ${month.format('YYYY')}`}
            headerExtra={headerExtra}
            actions={
                <>
                    {monthPicker}
                    <button
                        type="button"
                        className="ad-back"
                        aria-label="Tháng trước"
                        onClick={() => setMonth(month.subtract(1, 'month'))}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="ad-back"
                        aria-label="Tháng sau"
                        onClick={() => setMonth(month.add(1, 'month'))}
                    >
                        ›
                    </button>
                </>
            }
        >
            {loading || !view ? (
                <Loading />
            ) : (
                <>
                    <div className="ad-legend" style={{ marginBottom: 12 }} data-reveal>
                        {LEGEND.map(({ kind, label }) => (
                            <span key={kind}>
                                <i className={`ad-bar is-${kind}`} />
                                {label} {view.counts[kind]}
                            </span>
                        ))}
                    </div>

                    <div
                        className="ad-mx"
                        style={{ '--ad-days': view.columns.length }}
                        data-reveal
                    >
                        <div className="ad-mx__inner">
                            <div className="ad-mx__head">
                                <div className="ad-mx__corner">PHÒNG</div>
                                {view.columns.map(({ date }) => {
                                    const isToday = date.isSame(today, 'day');
                                    const isWeekend =
                                        date.day() === 0 || date.day() === 6;
                                    return (
                                        <div
                                            key={date.format('YYYY-MM-DD')}
                                            className={`ad-mx__day${
                                                isToday
                                                    ? ' ad-mx__day--today'
                                                    : isWeekend
                                                    ? ' ad-mx__day--we'
                                                    : ''
                                            }`}
                                        >
                                            <div className="ad-mx__daynum ad-num">
                                                {date.format('DD')}
                                            </div>
                                            <div className="ad-mx__dow">
                                                {DOW[date.day()]}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {view.rows.map(({ room, cells }) => (
                                <div key={room.value} className="ad-mx__row">
                                    <div className="ad-mx__room">
                                        <b>
                                            {room.label.split(' - ')[1] ||
                                                room.label}
                                        </b>
                                        <span className="ad-num">
                                            {room.value}
                                        </span>
                                    </div>
                                    {cells.map((cell) => {
                                        const on =
                                            selected &&
                                            selected.room.value ===
                                                room.value &&
                                            selected.cell.date.isSame(
                                                cell.date,
                                                'day'
                                            );
                                        return (
                                            <div
                                                key={cell.date.format(
                                                    'YYYY-MM-DD'
                                                )}
                                                className="ad-mx__cellwrap"
                                            >
                                                <button
                                                    type="button"
                                                    title={cell.value}
                                                    className={`ad-mx__cell is-${
                                                        cell.kind
                                                    }${
                                                        on
                                                            ? ' ad-mx__cell--on'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        setSelected({
                                                            room,
                                                            cell,
                                                        })
                                                    }
                                                >
                                                    <i
                                                        className={`ad-bar is-${cell.kind}`}
                                                    />
                                                    <span>
                                                        {cell.kind === 'unknown'
                                                            ? 'Không rõ'
                                                            : cellLabel(
                                                                  cell.value
                                                              )}
                                                    </span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: '14px 20px 0' }} data-reveal>
                        {selected && detail ? (
                            <div className="ad-card">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                    }}
                                >
                                    <span className="ad-card__k">
                                        CHI TIẾT Ô ĐANG CHỌN
                                    </span>
                                    <span
                                        className={`ad-pill is-${selected.cell.kind}`}
                                    >
                                        {selected.cell.kind === 'unknown'
                                            ? 'Không rõ'
                                            : detail.status}
                                    </span>
                                </div>
                                <div
                                    className="ad-display"
                                    style={{ fontSize: 19, margin: '10px 0 0' }}
                                >
                                    {detail.customerName || 'Trống'}
                                </div>
                                <div
                                    className="ad-kv"
                                    style={{ marginTop: 12 }}
                                >
                                    <div>
                                        <div className="ad-kv__k">Phòng</div>
                                        <div className="ad-kv__v">
                                            {selected.room.label}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="ad-kv__k">Ngày</div>
                                        <div className="ad-kv__v ad-num">
                                            {selected.cell.date.format(
                                                'DD/MM/YYYY'
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="ad-kv__k">Tiền cọc</div>
                                        <div className="ad-kv__v ad-num">
                                            {detail.deposit
                                                ? formatVnd(
                                                      parseAmount(
                                                          detail.deposit
                                                      )
                                                  )
                                                : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="ad-kv__k">
                                            Nguyên văn ô
                                        </div>
                                        <div
                                            className="ad-kv__v"
                                            style={{ fontSize: 11 }}
                                        >
                                            {selected.cell.value || '(rỗng)'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="ad-hint">
                                Bấm một ô trong lịch để xem chi tiết.
                            </p>
                        )}
                    </div>
                </>
            )}
        </AdminShell>
    );
};

export default MonthChecker;
