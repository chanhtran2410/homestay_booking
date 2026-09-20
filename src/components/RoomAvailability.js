import React, { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import AdminShell from '../admin/AdminShell';
import { Btn, DateField, Field, RoomSelect, useBusy } from '../admin/ui';
import { getAvailability, getRooms, formatVnd } from '../admin/api';

const RoomAvailability = () => {
    const [rooms, setRooms] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [date, setDate] = useState(null);
    const [result, setResult] = useState(null);
    const [busy, run] = useBusy();

    useEffect(() => {
        getRooms()
            .then((data) => setRooms(data.options))
            .catch(() => setRooms([]));
    }, []);

    const onCheck = useCallback(async () => {
        if (!roomId) {
            message.error('Vui lòng chọn phòng');
            return;
        }
        if (!date) {
            message.error('Vui lòng chọn ngày');
            return;
        }

        await run(async () => {
            setResult(null);
            try {
                const data = await getAvailability(date, roomId);
                setResult({ ...data.rooms[0], date: data.date });
            } catch (error) {
                console.error('Error checking room:', error);
                message.error(
                    error.message || 'Lỗi khi kiểm tra phòng. Vui lòng thử lại.'
                );
            }
        });
    }, [roomId, date, run]);

    const booking = result?.booking;

    return (
        <AdminShell back eyebrow="TRA CỨU NHANH" title="Kiểm tra phòng">
            <div className="ad-cols">
                <div>
                    <Field label="Phòng">
                        <RoomSelect
                            options={rooms}
                            value={roomId}
                            onChange={setRoomId}
                        />
                    </Field>

                    <Field label="Ngày">
                        <DateField value={date} onChange={setDate} />
                    </Field>

                    <Btn
                        variant="accent"
                        block
                        loading={busy}
                        style={{ marginTop: 18 }}
                        onClick={onCheck}
                    >
                        {busy ? 'Đang kiểm tra…' : 'Kiểm tra'}
                    </Btn>
                </div>

                <div>
                    {result && result.kind === 'free' && (
                        <div
                            className="ad-result ad-result--free"
                            style={{ marginTop: 16 }}
                        >
                            <div className="ad-result__head">
                                <span className="ad-result__ico">✓</span>
                                <div>
                                    <div className="ad-result__title">
                                        Phòng trống
                                    </div>
                                    <div className="ad-result__sub ad-num">
                                        {result.room.value} · {result.date}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {result && result.kind !== 'free' && (
                        <div
                            className="ad-result ad-result--busy"
                            style={{ marginTop: 16 }}
                        >
                            <div className="ad-result__head">
                                <span className="ad-result__ico">●</span>
                                <div>
                                    <div className="ad-result__title">
                                        {result.kind === 'booked'
                                            ? 'Đã có khách'
                                            : result.kind === 'wait'
                                            ? 'Đang đợi cọc'
                                            : 'Phòng đã ngừng khai thác'}
                                    </div>
                                    <div className="ad-result__sub ad-num">
                                        {result.room.value} · {result.date}
                                    </div>
                                </div>
                            </div>

                            {booking && (
                                <div className="ad-result__cell">
                                    <div className="ad-card__k">
                                        THÔNG TIN ĐẶT PHÒNG
                                    </div>
                                    <div className="ad-kv" style={{ marginTop: 10 }}>
                                        <div>
                                            <div className="ad-kv__k">Khách</div>
                                            <div className="ad-kv__v">
                                                {booking.guestName}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="ad-kv__k">
                                                Tiền cọc
                                            </div>
                                            <div className="ad-kv__v ad-num">
                                                {booking.deposit
                                                    ? formatVnd(booking.deposit)
                                                    : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="ad-kv__k">
                                                Nhận phòng
                                            </div>
                                            <div className="ad-kv__v ad-num">
                                                {booking.checkIn} ·{' '}
                                                {booking.nights} đêm
                                            </div>
                                        </div>
                                        <div>
                                            <div className="ad-kv__k">
                                                Điện thoại
                                            </div>
                                            <div className="ad-kv__v ad-num">
                                                {booking.guestPhone || '—'}
                                            </div>
                                        </div>
                                        {booking.note && (
                                            <div className="ad-kv__wide">
                                                <div className="ad-kv__k">
                                                    Ghi chú
                                                </div>
                                                <div className="ad-kv__v">
                                                    {booking.note}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {result && (
                        <p className="ad-hint" style={{ marginTop: 12 }}>
                            {result.room.label} · {result.meta}
                        </p>
                    )}
                </div>
            </div>
        </AdminShell>
    );
};

export default RoomAvailability;
