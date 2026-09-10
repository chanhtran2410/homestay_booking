import { useEffect } from 'react';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Cho các phần tử [data-reveal] bên trong `ref` hiện dần khi cuộn tới.
 *
 * Hiệu ứng chỉ được bật khi trình duyệt hỗ trợ IntersectionObserver và người
 * dùng không tắt chuyển động — nếu không, nội dung hiển thị bình thường ngay
 * từ đầu (CSS chỉ ẩn khi phần tử gốc có class `is-reveal`).
 */
const useScrollReveal = (ref, deps = []) => {
    useEffect(() => {
        const root = ref.current;
        if (!root) return undefined;

        if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
            root.classList.remove('is-reveal');
            return undefined;
        }

        root.classList.add('is-reveal');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: '0px 0px -6% 0px', threshold: 0.04 }
        );

        // Nội dung tải bất đồng bộ nên phải quét lại khi DOM đổi.
        const scan = () => {
            root.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) =>
                observer.observe(el)
            );
        };

        scan();
        const mutations = new MutationObserver(scan);
        mutations.observe(root, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            mutations.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref, ...deps]);
};

export default useScrollReveal;
