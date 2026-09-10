import React, { useCallback, useState } from 'react';
import { message } from 'antd';
import { useAuth } from '../App';
import AdminShell from '../admin/AdminShell';
import {
    Btn,
    ConfirmSheet,
    DateField,
    RoomSelect,
    useBusy,
} from '../admin/ui';
import {
    availableDates,
    cellAt,
    columnLetter,
    findDateColumn,
    findRoomRow,
    readSheet,
    SHEET_NAME,
    SPREADSHEET_ID,
} from '../admin/sheets';
import { ROOM_OPTIONS } from '../constants/roomOptions';

const STEPS = [
    'Chọn phòng và ngày cần xoá',
    'Bấm tìm booking, đối chiếu tên khách',
    'Xác nhận lần hai trong hộp thoại',
    `Ô trên ${SHEET_NAME} được ghi rỗng`,
];

const RemoveBooking = () => {
    const { makeApiCall } = useAuth();
    const [roomId, setRoomId] = useState(null);
    const [date, setDate] = useState(null);
    const [booking, setBooking] = useState(null);
    const [emptyCell, setEmptyCell] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [busy, run] = useBusy();

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
            setBooking(null);
            setEmptyCell(false);
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

                const roomRowIndex = findRoomRow(data, roomId);
                if (roomRowIndex === -1) {
                    message.error(
                        `Không tìm thấy phòng "${roomId}" trong bảng tính`
                    );
                    return;
                }

                const value = cellAt(data, roomRowIndex, dateIndex);
                if (value.trim() === '') {
                    setEmptyCell(true);
                    message.info(
                        `Phòng ${roomId} ngày ${format} hiện đang trống`
                    );
                    return;
                }

                const room = ROOM_OPTIONS.find(
                    (option) => option.value === roomId
                );
                setBooking({
                    roomId,
                    roomLabel: room?.label || roomId,
                    date: format,
                    dateIndex,
                    roomRowIndex,
                    value,
                    columnLetter: columnLetter(dateIndex),
                });
                message.success('Đã tìm thấy booking cần xoá');
            } catch (error) {
                console.error('Error checking booking:', error);
                message.error(
                    error.message ||
                        'Lỗi khi kiểm tra booking. Vui lòng thử lại.'
                );
            }
        });
    }, [roomId, date, makeApiCall, run]);

    const onRemove = useCallback(async () => {
        if (!booking) return;
        await run(async () => {
            try {
                await makeApiCall(() =>
                    window.gapi.client.sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${SHEET_NAME}!${booking.columnLetter}${
                            booking.roomRowIndex + 1
                        }`,
                        valueInputOption: 'RAW',
                        resource: { values: [['']] },
                    })
                );
                message.success('Đã xoá booking thành công!');
                setBooking(null);
                setConfirming(false);
                setRoomId(null);
                setDate(null);
            } catch (error) {
                console.error('Error removing booking:', error);
                message.error(
                    error.message || 'Lỗi khi xoá booking. Vui lòng thử lại.'
                );
            }
        });
    }, [booking, makeApiCall, run]);

    return (
        <AdminShell
            back
            eyebrow="KHÔNG THỂ HOÀN TÁC"
            title="Xoá đặt phòng"
        >
            <div className="ad-cols">
                <div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <label className="ad-label">Phòng</label>
                            <RoomSelect value={roomId} onChange={setRoomId} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
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
                        <div
                            style={{
                                marginTop: 20,
                                borderRadius: 16,
                                overflow: 'hidden',
                                border: '1px solid #F0D9D5',
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
                                    {booking.value.split('-')[0].trim()}
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
                                        {booking.roomLabel}
                                    </div>
                                </div>
                                <div>
                                    <div className="ad-kv__k">Ngày</div>
                                    <div className="ad-kv__v ad-num">
                                        {booking.date}
                                    </div>
                                </div>
                                <div className="ad-kv__wide">
                                    <div className="ad-kv__k">Chi tiết ô</div>
                                    <div className="ad-kv__v">
                                        {booking.value}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {booking && (
                        <Btn
                            variant="danger"
                            block
                            style={{ marginTop: 14 }}
                            onClick={() => setConfirming(true)}
                        >
                            Xoá booking này
                        </Btn>
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
                    </div>
                </div>
            </div>

            {confirming && booking && (
                <ConfirmSheet
                    title="Xoá booking này?"
                    busy={busy}
                    body={
                        <>
                            {booking.roomLabel} · {booking.date} ·{' '}
                            {booking.value}
                            <br />
                            <b style={{ color: 'var(--ad-book-fg)' }}>
                                Hành động này không thể hoàn tác.
                            </b>
                        </>
                    }
                    onCancel={() => setConfirming(false)}
                    onConfirm={onRemove}
                />
            )}
        </AdminShell>
    );
};

export default RemoveBooking;
