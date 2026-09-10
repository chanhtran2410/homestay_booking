import React, { memo, useCallback, useMemo, useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useAuth } from '../App';
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
    findRoomRow,
    readSheet,
    SHEET_NAME,
    SPREADSHEET_ID,
} from '../admin/sheets';
import { ROOM_OPTIONS } from '../constants/roomOptions';

dayjs.extend(isSameOrBefore);

// Giá trị ghi xuống Sheet — các màn hình khác dựa vào đúng chuỗi này để phân loại.
const STATUS_DEPOSIT = 'Đã đặt cọc';
const STATUS_PENDING = 'Đang đợi đặt cọc';

const emptyForm = {
    roomIds: [],
    fromDate: null,
    nights: 1,
    name: '',
    status: STATUS_DEPOSIT,
    price: '',
};

const Booking = memo(() => {
    const { makeApiCall } = useAuth();
    const [form, setForm] = useState(emptyForm);
    const [busy, run] = useBusy();
    const [conflict, setConflict] = useState(null);

    const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const dateRange = useMemo(() => {
        if (!form.fromDate) return [];
        return Array.from({ length: form.nights }, (_, i) =>
            form.fromDate.add(i, 'day').format('DD/MM/YYYY')
        );
    }, [form.fromDate, form.nights]);

    const composedValue = `${form.name || 'Tên khách'} - ${form.status}${
        form.status === STATUS_DEPOSIT && form.price ? ` - ${form.price}` : ''
    }`;

    // Ghi các ô đã xác định xuống Sheet.
    const writeCells = useCallback(
        async (cells, value) =>
            run(async () => {
                await makeApiCall(() =>
                    window.gapi.client.sheets.spreadsheets.batchUpdate({
                        spreadsheetId: SPREADSHEET_ID,
                        resource: {
                            requests: cells.map((cell) => ({
                                updateCells: {
                                    range: {
                                        sheetId: 0,
                                        startRowIndex: cell.roomRowIndex,
                                        endRowIndex: cell.roomRowIndex + 1,
                                        startColumnIndex: cell.dateIndex,
                                        endColumnIndex: cell.dateIndex + 1,
                                    },
                                    rows: [
                                        {
                                            values: [
                                                {
                                                    userEnteredValue: {
                                                        stringValue: value,
                                                    },
                                                },
                                            ],
                                        },
                                    ],
                                    fields: 'userEnteredValue',
                                },
                            })),
                        },
                    })
                );

                message.success(
                    `Đã ghi ${cells.length} ô vào ${SHEET_NAME} (${form.nights} đêm × ${form.roomIds.length} phòng)`
                );
                setForm(emptyForm);
                setConflict(null);
            }),
        [makeApiCall, run, form.nights, form.roomIds.length]
    );

    const onSubmit = useCallback(async () => {
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
        if (form.status === STATUS_DEPOSIT && !form.price.trim()) {
            message.error('Vui lòng nhập tiền đặt cọc');
            return;
        }

        await run(async () => {
            try {
                const { data, headers } = await readSheet(makeApiCall);

                const cells = [];
                const invalidRooms = [];
                const invalidDates = new Set();

                for (const roomId of form.roomIds) {
                    const roomRowIndex = findRoomRow(data, roomId);
                    if (roomRowIndex === -1) {
                        invalidRooms.push(roomId);
                        continue;
                    }
                    for (const formattedDate of dateRange) {
                        const dateIndex = headers.indexOf(formattedDate);
                        if (dateIndex === -1) {
                            invalidDates.add(formattedDate);
                            continue;
                        }
                        cells.push({
                            roomId,
                            date: formattedDate,
                            dateIndex,
                            roomRowIndex,
                            currentValue:
                                data?.[roomRowIndex]?.[dateIndex] || '',
                        });
                    }
                }

                if (invalidRooms.length) {
                    message.error(
                        `Không tìm thấy phòng trong bảng tính: ${invalidRooms.join(
                            ', '
                        )}`
                    );
                }
                if (invalidDates.size) {
                    message.warning(
                        `Các ngày không có trong bảng tính: ${[
                            ...invalidDates,
                        ].join(', ')}`
                    );
                }
                if (!cells.length) {
                    message.error('Không có dữ liệu hợp lệ nào để cập nhật');
                    return;
                }

                const taken = cells.filter(
                    (cell) => cell.currentValue.trim() !== ''
                );
                if (taken.length) {
                    setConflict({ cells, taken });
                    return;
                }

                await writeCells(cells, composedValue);
            } catch (error) {
                console.error('Sheet update failed:', error);
                message.error(
                    error.message || 'Ghi vào bảng tính thất bại. Thử lại sau.'
                );
            }
        });
    }, [form, dateRange, makeApiCall, run, writeCells, composedValue]);

    return (
        <AdminShell
            back
            eyebrow={`GHI VÀO ${SHEET_NAME.toUpperCase()}`}
            title="Đặt phòng"
        >
            <div className="ad-cols">
                <div>
                    <Field label="Chọn phòng · nhiều phòng">
                        <RoomChips
                            value={form.roomIds}
                            onChange={(roomIds) => set({ roomIds })}
                        />
                    </Field>

                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <label className="ad-label">Ngày nhận phòng</label>
                            <DateField
                                value={form.fromDate}
                                onChange={(fromDate) => set({ fromDate })}
                            />
                        </div>
                        <div style={{ flex: 'none' }}>
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

                    <Field label="Trạng thái">
                        <Segmented
                            value={form.status}
                            onChange={(status) => set({ status })}
                            options={[
                                { value: STATUS_DEPOSIT, label: 'Đã đặt cọc' },
                                { value: STATUS_PENDING, label: 'Đang đợi cọc' },
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
                </div>

                <div>
                    <div className="ad-note" style={{ marginTop: 16 }} data-reveal>
                        <div>
                            Sẽ ghi{' '}
                            <b>{form.roomIds.length * form.nights} ô</b> ·{' '}
                            {form.roomIds.length} phòng × {form.nights} đêm
                        </div>
                        <div className="ad-num" style={{ marginTop: 6 }}>
                            {dateRange.length
                                ? `${dateRange
                                      .map((date) => date.slice(0, 5))
                                      .join(' · ')} — “${composedValue}”`
                                : 'Chọn ngày nhận phòng để xem trước.'}
                        </div>
                        {form.roomIds.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                                {form.roomIds
                                    .map(
                                        (id) =>
                                            ROOM_OPTIONS.find(
                                                (room) => room.value === id
                                            )?.label || id
                                    )
                                    .join(' · ')}
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
                            onClick={onSubmit}
                        >
                            {busy ? 'Đang ghi…' : `Ghi vào ${SHEET_NAME}`}
                        </Btn>
                    </div>
                </div>
            </div>

            {conflict && (
                <ConfirmSheet
                    danger={false}
                    title="Có dữ liệu đã tồn tại"
                    confirmLabel="Ghi đè tất cả"
                    busy={busy}
                    body={
                        <>
                            {conflict.taken.length} ô đã có dữ liệu:{' '}
                            {conflict.taken
                                .map((cell) => `${cell.roomId} · ${cell.date}`)
                                .join(', ')}
                            .<br />
                            Ghi đè sẽ thay nội dung cũ bằng “{composedValue}”.
                        </>
                    }
                    onCancel={() => setConflict(null)}
                    onConfirm={() => writeCells(conflict.cells, composedValue)}
                />
            )}
        </AdminShell>
    );
});

export default Booking;
