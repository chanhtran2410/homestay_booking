import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import { ROOM_OPTIONS } from '../constants/roomOptions';

/* --------------------------------------------------------------------------
   Khối form
   -------------------------------------------------------------------------- */

export const Field = ({ label, hint, children }) => (
    <div className="ad-field">
        {label && <label className="ad-label">{label}</label>}
        {children}
        {hint && (
            <p className="ad-hint" style={{ marginTop: 8 }}>
                {hint}
            </p>
        )}
    </div>
);

export const Btn = ({
    variant = 'primary',
    size,
    block,
    grow,
    loading,
    disabled,
    children,
    className = '',
    ...rest
}) => (
    <button
        type="button"
        disabled={disabled || loading}
        className={[
            'ad-btn',
            `ad-btn--${variant}`,
            size === 'sm' ? 'ad-btn--sm' : '',
            block ? 'ad-btn--block' : '',
            grow ? 'ad-btn--grow' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ')}
        {...rest}
    >
        {children}
    </button>
);

export const RoomSelect = ({ value, onChange, placeholder = 'Chọn phòng' }) => (
    <select
        className="ad-input ad-select"
        value={value || ''}
        onChange={(event) => onChange(event.target.value || null)}
    >
        <option value="">{placeholder}</option>
        {ROOM_OPTIONS.map((room) => (
            <option key={room.value} value={room.value}>
                {room.label}
            </option>
        ))}
    </select>
);

export const DateField = ({ value, onChange, placeholder = 'Chọn ngày' }) => (
    <DatePicker
        value={value}
        onChange={onChange}
        format="DD/MM/YYYY"
        placeholder={placeholder}
        allowClear={false}
        className="ad-date"
        style={{ width: '100%' }}
    />
);

export const NightStepper = ({ value, onChange, min = 1, max = 30 }) => (
    <div className="ad-stepper">
        <button
            type="button"
            aria-label="Bớt một đêm"
            disabled={value <= min}
            onClick={() => onChange(Math.max(min, value - 1))}
        >
            −
        </button>
        <span className="ad-stepper__v ad-num">{value}</span>
        <button
            type="button"
            aria-label="Thêm một đêm"
            disabled={value >= max}
            onClick={() => onChange(Math.min(max, value + 1))}
        >
            +
        </button>
    </div>
);

export const Segmented = ({ value, onChange, options }) => (
    <div className="ad-seg">
        {options.map((option) => (
            <button
                key={option.value}
                type="button"
                className={value === option.value ? 'ad-seg--on' : ''}
                onClick={() => onChange(option.value)}
            >
                {option.label}
            </button>
        ))}
    </div>
);

/* --------------------------------------------------------------------------
   Chọn nhiều phòng — chip + bottom sheet
   -------------------------------------------------------------------------- */

export const RoomChips = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);

    const toggle = (roomId) =>
        onChange(
            value.includes(roomId)
                ? value.filter((id) => id !== roomId)
                : [...value, roomId]
        );

    return (
        <>
            <div className={`ad-chips${value.length ? ' ad-chips--on' : ''}`}>
                {value.map((roomId) => {
                    const room = ROOM_OPTIONS.find((r) => r.value === roomId);
                    return (
                        <span key={roomId} className="ad-chip">
                            {room ? room.label.replace(' - ', ' ') : roomId}
                            <button
                                type="button"
                                className="ad-chip__x"
                                aria-label={`Bỏ phòng ${roomId}`}
                                onClick={() => toggle(roomId)}
                            >
                                ×
                            </button>
                        </span>
                    );
                })}
                <button
                    type="button"
                    className="ad-chip ad-chip--add"
                    onClick={() => setOpen(true)}
                >
                    {value.length ? '+ thêm' : '+ Chọn phòng'}
                </button>
            </div>

            {open && (
                <BottomSheet onClose={() => setOpen(false)} title="Chọn phòng">
                    <div className="ad-list" style={{ marginTop: 14 }}>
                        {ROOM_OPTIONS.map((room) => {
                            const on = value.includes(room.value);
                            return (
                                <button
                                    key={room.value}
                                    type="button"
                                    className="ad-row"
                                    onClick={() => toggle(room.value)}
                                >
                                    <span
                                        className={`ad-row__ico ${
                                            on ? 'is-booked' : 'is-unknown'
                                        }`}
                                    >
                                        {on ? '✓' : '+'}
                                    </span>
                                    <span className="ad-row__main">
                                        <span className="ad-row__name">
                                            {room.label}
                                        </span>
                                        <span className="ad-row__meta">
                                            {room.type === 'bungalow'
                                                ? 'Bungalow'
                                                : 'Phòng'}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <Btn
                        variant="primary"
                        block
                        style={{ marginTop: 16 }}
                        onClick={() => setOpen(false)}
                    >
                        Xong · {value.length} phòng
                    </Btn>
                </BottomSheet>
            )}
        </>
    );
};

/* --------------------------------------------------------------------------
   Bottom sheet
   -------------------------------------------------------------------------- */

export const BottomSheet = ({ title, icon, iconClass, onClose, children }) => {
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    return (
        <div className="ad-sheet" role="dialog" aria-modal="true">
            <div className="ad-sheet__scrim" onClick={onClose} />
            <div className="ad-sheet__panel">
                <div className="ad-sheet__grip">
                    <i />
                </div>
                {title && (
                    <div className="ad-sheet__head">
                        {icon && (
                            <span className={`ad-sheet__ico ${iconClass || ''}`}>
                                {icon}
                            </span>
                        )}
                        <span className="ad-sheet__title">{title}</span>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};

export const ConfirmSheet = ({
    title,
    body,
    confirmLabel = 'Xoá',
    cancelLabel = 'Huỷ',
    danger = true,
    busy,
    onConfirm,
    onCancel,
}) => (
    <BottomSheet
        title={title}
        icon="!"
        iconClass={danger ? 'is-booked' : 'is-wait'}
        onClose={onCancel}
    >
        <div className="ad-sheet__text">{body}</div>
        <div className="ad-actions" style={{ marginTop: 18 }}>
            <Btn variant="quiet" grow onClick={onCancel} disabled={busy}>
                {cancelLabel}
            </Btn>
            <Btn
                variant={danger ? 'danger' : 'primary'}
                grow
                loading={busy}
                onClick={onConfirm}
            >
                {busy ? 'Đang xử lý…' : confirmLabel}
            </Btn>
        </div>
    </BottomSheet>
);

/* --------------------------------------------------------------------------
   Trạng thái
   -------------------------------------------------------------------------- */

export const Loading = ({ label = 'Đang tải dữ liệu…' }) => (
    <div className="ad-loading">
        <i />
        <span>{label}</span>
    </div>
);

export const Empty = ({ children }) => <div className="ad-empty">{children}</div>;

export const StatusPill = ({ kind, children }) => (
    <span className={`ad-pill is-${kind}`}>{children}</span>
);

/* --------------------------------------------------------------------------
   Tiện ích
   -------------------------------------------------------------------------- */

export const useBodyClass = (className) => {
    useEffect(() => {
        document.body.classList.add(className);
        return () => document.body.classList.remove(className);
    }, [className]);
};

// Bọc một hành động async kèm cờ loading.
export const useBusy = () => {
    const [busy, setBusy] = useState(false);
    const run = useCallback(async (fn) => {
        setBusy(true);
        try {
            return await fn();
        } finally {
            setBusy(false);
        }
    }, []);
    return [busy, run];
};
