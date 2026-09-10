import React, { useCallback, useState } from 'react';
import { message } from 'antd';
import { useAuth } from '../App';
import AdminShell from '../admin/AdminShell';
import { Btn, DateField, Field, RoomSelect, useBusy } from '../admin/ui';
import {
    availableDates,
    cellAt,
    findDateColumn,
    findRoomRow,
    parseCell,
    readSheet,
} from '../admin/sheets';
import { ROOM_OPTIONS } from '../constants/roomOptions';

const RoomAvailability = () => {
    const { makeApiCall } = useAuth();
    const [roomId, setRoomId] = useState(null);
    const [date, setDate] = useState(null);
    const [result, setResult] = useState(null);
    const [missingDate, setMissingDate] = useState(null);
    const [busy, run] = useBusy();

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
            setMissingDate(null);
            try {
                const { data, headers } = await readSheet(makeApiCall);
                const { index: dateIndex, format } = findDateColumn(
                    headers,
                    date
                );

                if (dateIndex === -1) {
                    setMissingDate(availableDates(headers).slice(0, 12));
                    message.error(
                        `Không tìm thấy ngày "${date.format(
                            'DD/MM/YYYY'
                        )}" trong bảng tính`
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
                setResult({
                    ...parseCell(value),
                    roomId,
                    date: format || date.format('DD/MM/YYYY'),
                });
            } catch (error) {
                console.error('Error reading sheet:', error);
                message.error(
                    error.message || 'Lỗi khi kiểm tra phòng. Vui lòng thử lại.'
                );
            }
        });
    }, [roomId, date, makeApiCall, run]);

    const room = ROOM_OPTIONS.find((option) => option.value === roomId);

    return (
        <AdminShell back eyebrow="TRA CỨU NHANH" title="Kiểm tra phòng">
            <div className="ad-cols">
                <div>
                    <Field label="Phòng">
                        <RoomSelect value={roomId} onChange={setRoomId} />
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
                                        {result.roomId} · {result.date}
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
                                            : 'Đang đợi cọc'}
                                    </div>
                                    <div className="ad-result__sub ad-num">
                                        {result.roomId} · {result.date}
                                    </div>
                                </div>
                            </div>
                            <div className="ad-result__cell">
                                <div className="ad-card__k">NỘI DUNG Ô</div>
                                <div>{result.raw}</div>
                            </div>
                        </div>
                    )}

                    {result && room && (
                        <p className="ad-hint" style={{ marginTop: 12 }}>
                            {room.label} ·{' '}
                            {room.type === 'bungalow' ? 'Bungalow' : 'Phòng'}
                        </p>
                    )}

                    {missingDate && (
                        <div
                            className="ad-note ad-note--warn"
                            style={{ marginTop: 16 }}
                        >
                            <b>Không tìm thấy ngày trong bảng tính.</b>
                            <br />
                            Cột ngày đang có: {missingDate.join(' · ')}
                            {missingDate.length >= 12 ? ' …' : ''}
                        </div>
                    )}
                </div>
            </div>
        </AdminShell>
    );
};

export default RoomAvailability;
