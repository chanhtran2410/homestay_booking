import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import AdminShell from '../admin/AdminShell';
import {
    Btn,
    ConfirmSheet,
    DateField,
    Field,
    NightStepper,
    RoomChips,
    Segmented,
    useBusy,
} from '../admin/ui';
import {
    createBooking,
    getRooms,
    parseAmount,
    formatVnd,
    toApiDate,
    shortRoomName,
} from '../admin/api';

// Giá trị khớp enum booking_status trong CSDL.
const STATUS_DEPOSIT = 'booked';
const STATUS_PENDING = 'wait';

const emptyForm = {
    roomIds: [],
    fromDate: null,
    nights: 1,
    name: '',
    phone: '',
    note: '',
    status: STATUS_DEPOSIT,
    price: '',
};

const Booking = memo(() => {
    const [rooms, setRooms] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [busy, run] = useBusy();
    // { conflicts: [...], token: '...' } khi máy chủ báo có ô đã kín
    const [conflict, setConflict] = useState(null);

    useEffect(() => {
        getRooms()
            .then((data) => setRooms(data.options))
            .catch(() => setRooms([]));
    }, []);

    const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const dateRange = useMemo(() => {
        if (!form.fromDate) return [];
        return Array.from({ length: form.nights }, (_, i) =>
            form.fromDate.add(i, 'day').format('DD/MM')
        );
    }, [form.fromDate, form.nights]);

    const deposit = parseAmount(form.price);

    /**
     * Gửi yêu cầu tạo booking.
     *
     * Máy chủ dùng giao thức hai pha (xem hàm create_booking trong
     * supabase/migrations/0002_functions.sql):
     *   lần 1  -> nếu có đêm đã kín, trả về danh sách xung đột kèm token,
     *            KHÔNG ghi gì.
     *   lần 2  -> gửi lại kèm token. Nếu trong lúc người dùng đang xem hộp
     *            xác nhận mà dữ liệu đổi, token lệch và máy chủ từ chối —
     *            tránh xoá nhầm booking mà người dùng chưa hề thấy.
     */
    const submit = useCallback(
        async (overwrite = false, conflictToken = null, retried = false) => {
            if (!form.roomIds.length) {
                message.error('Vui lòng chọn ít nhất một phòng');
                return;
            }
            if (!form.fromDate) {
                message.error('Vui lòng chọn ngày nhận phòng');
                return;
            }
            if (!form.name.trim()) {
                message.error('Vui lòng nhập tên khách hàng');
                return;
            }
            if (form.status === STATUS_DEPOSIT && deposit <= 0) {
                message.error('Vui lòng nhập tiền đặt cọc');
                return;
            }

            await run(async () => {
                try {
                    const result = await createBooking({
                        roomIds: form.roomIds,
                        checkIn: toApiDate(form.fromDate),
                        nights: form.nights,
                        guestName: form.name.trim(),
                        guestPhone: form.phone.trim() || null,
                        note: form.note.trim() || null,
                        status: form.status,
                        deposit,
                        overwrite,
                        conflictToken,
                    });

                    if (
                        result.code === 'conflict' ||
                        result.code === 'conflict_changed'
                    ) {
                        setConflict({
                            conflicts: result.conflicts,
                            token: result.conflictToken,
                        });
                        if (result.code === 'conflict_changed') {
                            message.warning(
                                'Dữ liệu vừa thay đổi, vui lòng xem lại danh sách bên dưới.'
                            );
                        }
                        return;
                    }

                    // Có người chen vào đúng lúc — thử lại một lần.
                    if (result.code === 'conflict_race' && !retried) {
                        return submit(overwrite, conflictToken, true);
                    }

                    if (result.ok !== true) {
                        message.error('Không ghi được. Vui lòng thử lại.');
                        return;
                    }

                    message.success(
                        `Đã ghi ${result.nightsWritten} đêm cho ${form.roomIds.length} phòng`
                    );
                    setForm(emptyForm);
                    setConflict(null);
                } catch (error) {
                    console.error('Booking failed:', error);
                    message.error(
                        error.message || 'Ghi dữ liệu thất bại. Thử lại sau.'
                    );
                }
            });
        },
        [form, deposit, run]
    );

    return (
        <AdminShell back eyebrow="GHI VÀO CƠ SỞ DỮ LIỆU" title="Đặt phòng">
            <div className="ad-cols">
                <div>
                    <Field label="Chọn phòng · nhiều phòng">
                        <RoomChips
                            options={rooms}
                            value={form.roomIds}
                            onChange={(roomIds) => set({ roomIds })}
                        />
                    </Field>

                    <div className="ad-pair" style={{ marginTop: 16 }}>
                        <div>
                            <label className="ad-label">Ngày nhận phòng</label>
                            <DateField
                                value={form.fromDate}
                                onChange={(fromDate) => set({ fromDate })}
                            />
                        </div>
                        <div className="ad-pair__fixed">
                            <label className="ad-label">Số đêm</label>
                            <NightStepper
                                value={form.nights}
                                onChange={(nights) => set({ nights })}
                            />
                        </div>
                    </div>

                    <Field label="Tên khách hàng">
                        <input
                            className="ad-input"
                            placeholder="Ví dụ: Anh Minh"
                            value={form.name}
                            onChange={(event) =>
                                set({ name: event.target.value })
                            }
                        />
                    </Field>

                    <Field label="Số điện thoại (không bắt buộc)">
                        <input
                            className="ad-input ad-num"
                            type="tel"
                            placeholder="0903 664 474"
                            value={form.phone}
                            onChange={(event) =>
                                set({ phone: event.target.value })
                            }
                        />
                    </Field>

                    <Field label="Trạng thái">
                        <Segmented
                            value={form.status}
                            onChange={(status) => set({ status })}
                            options={[
                                { value: STATUS_DEPOSIT, label: 'Đã đặt cọc' },
                                {
                                    value: STATUS_PENDING,
                                    label: 'Đang đợi cọc',
                                },
                            ]}
                        />
                    </Field>

                    {form.status === STATUS_DEPOSIT && (
                        <Field label="Tiền đặt cọc">
                            <div className="ad-input ad-input--suffix">
                                <input
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        border: 0,
                                        outline: 'none',
                                        background: 'none',
                                        font: 'inherit',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                    placeholder="500.000"
                                    value={form.price}
                                    onChange={(event) =>
                                        set({ price: event.target.value })
                                    }
                                />
                                <span className="ad-input__suffix">₫</span>
                            </div>
                        </Field>
                    )}

                    <Field label="Ghi chú (không bắt buộc)">
                        <input
                            className="ad-input"
                            placeholder="Ví dụ: đến muộn sau 20:00"
                            value={form.note}
                            onChange={(event) =>
                                set({ note: event.target.value })
                            }
                        />
                    </Field>
                </div>

                <div>
                    <div
                        className="ad-note"
                        style={{ marginTop: 16 }}
                        data-reveal
                    >
                        <div>
                            Sẽ ghi{' '}
                            <b>{form.roomIds.length * form.nights} đêm</b> ·{' '}
                            {form.roomIds.length} phòng × {form.nights} đêm
                        </div>
                        <div className="ad-num" style={{ marginTop: 6 }}>
                            {dateRange.length
                                ? dateRange.join(' · ')
                                : 'Chọn ngày nhận phòng để xem trước.'}
                        </div>
                        {form.roomIds.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                                {form.roomIds
                                    .map((id) =>
                                        shortRoomName(
                                            rooms.find((r) => r.value === id)
                                                ?.label
                                        )
                                    )
                                    .join(' · ')}
                            </div>
                        )}
                        {form.status === STATUS_DEPOSIT && deposit > 0 && (
                            <div style={{ marginTop: 6 }}>
                                Tiền cọc: {formatVnd(deposit)}
                            </div>
                        )}
                    </div>

                    <div className="ad-actions">
                        <Btn
                            variant="quiet"
                            onClick={() => setForm(emptyForm)}
                            disabled={busy}
                        >
                            Xoá form
                        </Btn>
                        <Btn
                            variant="primary"
                            grow
                            loading={busy}
                            onClick={() => submit(false, null)}
                        >
                            {busy ? 'Đang ghi…' : 'Lưu đặt phòng'}
                        </Btn>
                    </div>
                </div>
            </div>

            {conflict && (
                <ConfirmSheet
                    danger={false}
                    title="Có đêm đã kín"
                    confirmLabel="Ghi đè tất cả"
                    busy={busy}
                    body={
                        <>
                            {conflict.conflicts.length} đêm đã có khách:{' '}
                            {conflict.conflicts
                                .map(
                                    (item) =>
                                        `${item.roomCode} · ${item.date} (${item.guestName})`
                                )
                                .join(', ')}
                            .
                            <br />
                            Ghi đè sẽ xoá những booking đó và thay bằng “
                            {form.name.trim()}”.
                        </>
                    }
                    onCancel={() => setConflict(null)}
                    onConfirm={() => submit(true, conflict.token)}
                />
            )}
        </AdminShell>
    );
});

export default Booking;
