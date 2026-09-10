import React, { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import AdminShell from '../admin/AdminShell';
import {
    Btn,
    ConfirmSheet,
    DateField,
    RoomSelect,
    useBusy,
} from '../admin/ui';
import {
    deleteBooking,
    deleteNight,
    findBooking,
    formatVnd,
    getRooms,
    toApiDate,
} from '../admin/api';

const STEPS = [
    'Chọn phòng và ngày cần xoá',
    'Bấm tìm booking, đối chiếu tên khách',
    'Chọn xoá một đêm hoặc xoá cả kỳ lưu trú',
    'Xác nhận lần hai trong hộp thoại',
];

const RemoveBooking = () => {
    const [rooms, setRooms] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [date, setDate] = useState(null);
    const [found, setFound] = useState(null);
    const [emptyCell, setEmptyCell] = useState(false);
    const [confirming, setConfirming] = useState(null); // 'night' | 'stay'
    const [busy, run] = useBusy();

    useEffect(() => {
        getRooms()
            .then((data) => setRooms(data.options))
            .catch(() => setRooms([]));
    }, []);

    const onFind = useCallback(async () => {
        if (!roomId) {
            message.error('Vui lòng chọn phòng');
            return;
        }
        if (!date) {
            message.error('Vui lòng chọn ngày');
            return;
        }

        await run(async () => {
            setFound(null);
            setEmptyCell(false);
            try {
                const data = await findBooking(roomId, date);
                if (!data.found) {
                    setEmptyCell(true);
                    message.info(
                        `Phòng ${roomId} ngày ${toApiDate(date)} hiện đang trống`
                    );
                    return;
                }
                setFound(data);
                message.success('Đã tìm thấy booking cần xoá');
            } catch (error) {
                console.error('Error checking booking:', error);
                message.error(
                    error.message ||
                        'Lỗi khi kiểm tra booking. Vui lòng thử lại.'
                );
            }
        });
    }, [roomId, date, run]);

    const onRemove = useCallback(async () => {
        if (!found) return;
        const scope = confirming;

        await run(async () => {
            try {
                const result =
                    scope === 'stay'
                        ? await deleteBooking(found.booking.id)
                        : await deleteNight(roomId, date);

                message.success(
                    scope === 'stay'
                        ? `Đã xoá cả kỳ lưu trú (${result.nightsDeleted} đêm)`
                        : result.bookingDeleted
                        ? 'Đã xoá đêm cuối cùng, booking cũng được xoá theo'
                        : `Đã xoá 1 đêm, còn lại ${result.nightsLeft} đêm`
                );

                setFound(null);
                setConfirming(null);
                setRoomId(null);
                setDate(null);
            } catch (error) {
                console.error('Error removing booking:', error);
                message.error(
                    error.message || 'Lỗi khi xoá booking. Vui lòng thử lại.'
                );
            }
        });
    }, [found, confirming, roomId, date, run]);

    const booking = found?.booking;
    const multiNight = booking && booking.nights > 1;

    return (
        <AdminShell back eyebrow="KHÔNG THỂ HOÀN TÁC" title="Xoá đặt phòng">
            <div className="ad-cols">
                <div>
                    <div className="ad-pair">
                        <div>
                            <label className="ad-label">Phòng</label>
                            <RoomSelect
                                options={rooms}
                                value={roomId}
                                onChange={setRoomId}
                            />
                        </div>
                        <div>
                            <label className="ad-label">Ngày</label>
                            <DateField value={date} onChange={setDate} />
                        </div>
                    </div>

                    <Btn
                        variant="accent"
                        block
                        loading={busy}
                        style={{ marginTop: 16 }}
                        onClick={onFind}
                    >
                        {busy ? 'Đang tìm…' : 'Tìm booking'}
                    </Btn>

                    {emptyCell && (
                        <div
                            className="ad-result ad-result--free"
                            style={{ marginTop: 20 }}
                        >
                            <div className="ad-result__head">
                                <span className="ad-result__ico">✓</span>
                                <div>
                                    <div className="ad-result__title">
                                        Phòng đang trống
                                    </div>
                                    <div className="ad-result__sub">
                                        Không có booking nào cần xoá.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {booking && (
                        <>
                            <div
                                style={{
                                    marginTop: 20,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    border: '1px solid #eecdc7',
                                }}
                            >
                                <div
                                    style={{
                                        padding: '16px 18px',
                                        background: 'var(--ad-book-bg)',
                                    }}
                                >
                                    <div
                                        className="ad-card__k"
                                        style={{ color: 'var(--ad-book-fg)' }}
                                    >
                                        TÌM THẤY BOOKING
                                    </div>
                                    <div
                                        className="ad-display"
                                        style={{ fontSize: 20, marginTop: 8 }}
                                    >
                                        {booking.guestName}
                                    </div>
                                </div>
                                <div
                                    className="ad-kv"
                                    style={{
                                        background: 'var(--ad-paper)',
                                        padding: '16px 18px',
                                    }}
                                >
                                    <div>
                                        <div className="ad-kv__k">Phòng</div>
                                        <div className="ad-kv__v">
                                            {found.room.label}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="ad-kv__k">Ngày</div>
                                        <div className="ad-kv__v ad-num">
                                            {found.date}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="ad-kv__k">
                                            Kỳ lưu trú
                                        </div>
                                        <div className="ad-kv__v ad-num">
                                            {booking.checkIn} · {booking.nights}{' '}
                                            đêm
                                        </div>
                                    </div>
                                    <div>
                                        <div className="ad-kv__k">Tiền cọc</div>
                                        <div className="ad-kv__v ad-num">
                                            {booking.deposit
                                                ? formatVnd(booking.deposit)
                                                : '—'}
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

                            <div className="ad-actions">
                                <Btn
                                    variant="danger"
                                    grow
                                    onClick={() => setConfirming('night')}
                                >
                                    Xoá đêm này
                                </Btn>
                                {multiNight && (
                                    <Btn
                                        variant="quiet"
                                        grow
                                        onClick={() => setConfirming('stay')}
                                    >
                                        Xoá cả {booking.nights} đêm
                                    </Btn>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div>
                    <div className="ad-card" style={{ marginTop: 18 }} data-reveal>
                        <div className="ad-card__k">4 BƯỚC</div>
                        <ol className="ad-steps">
                            {STEPS.map((step, index) => (
                                <li key={step}>
                                    <span className="ad-num">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                        <p className="ad-hint" style={{ marginTop: 14 }}>
                            Mọi thao tác xoá đều được ghi lại trong bảng
                            booking_audit, nên vẫn khôi phục được bằng tay nếu
                            xoá nhầm.
                        </p>
                    </div>
                </div>
            </div>

            {confirming && booking && (
                <ConfirmSheet
                    title={
                        confirming === 'stay'
                            ? 'Xoá cả kỳ lưu trú?'
                            : 'Xoá đêm này?'
                    }
                    busy={busy}
                    confirmLabel={confirming === 'stay' ? 'Xoá cả kỳ' : 'Xoá'}
                    body={
                        <>
                            {found.room.label} · {booking.guestName}
                            <br />
                            {confirming === 'stay'
                                ? `Toàn bộ ${booking.nights} đêm từ ${booking.checkIn}.`
                                : `Chỉ đêm ${found.date}. Các đêm khác của kỳ này giữ nguyên.`}
                            <br />
                            <b style={{ color: 'var(--ad-book-fg)' }}>
                                Hành động này không thể hoàn tác.
                            </b>
                        </>
                    }
                    onCancel={() => setConfirming(null)}
                    onConfirm={onRemove}
                />
            )}
        </AdminShell>
    );
};

export default RemoveBooking;
